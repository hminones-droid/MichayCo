-- Existing authorized accounts retain full access; future business users can be assigned 'operador'.
alter table public.admin_users add column role text not null default 'administrador'
  check (role in ('administrador', 'operador'));

create or replace function public.admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.admin_users where user_id = auth.uid()
$$;
revoke all on function public.admin_role() from public, anon;
grant execute on function public.admin_role() to authenticated;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.admin_role() = 'administrador', false)
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists admin_delete_orders on public.orders;
create policy admin_delete_orders on public.orders for delete to authenticated
using (public.is_super_admin());

create or replace function public.guard_order_deletion()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Sólo un administrador puede eliminar pedidos'; end if;
  if current_setting('michayco.admin_delete_order', true) = 'on' then return old; end if;
  if old.status <> 'Cancelado' or old.stock_restored_at is null then
    raise exception 'Usá la operación administrativa para indicar qué hacer con el stock';
  end if;
  insert into public.audit_log(actor, entity_type, entity_id, action, before_data)
  values (auth.uid(), 'order', old.id::text, 'delete_cancelled_order', to_jsonb(old));
  return old;
end $$;

create or replace function public.delete_order_as_administrator(p_order_id uuid, p_restore_stock boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_lines jsonb;
begin
  if not public.is_super_admin() then raise exception 'Sólo un administrador puede eliminar pedidos'; end if;
  if p_restore_stock is null then raise exception 'Indicá expresamente si hay que reponer stock'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  select coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) into v_lines
  from public.order_items oi where oi.order_id = p_order_id;

  if p_restore_stock and v_order.stock_restored_at is null then
    if v_order.status = 'Entregado' or v_order.status = 'Cancelado' then
      raise exception 'Este estado requiere una revisión manual del stock; elegí no reponer sólo después de comprobarlo';
    end if;
    perform public.cancel_order_and_restore_stock(p_order_id);
  elsif p_restore_stock and v_order.stock_restored_at is not null then
    -- Already restored: never restore twice.
    null;
  end if;

  insert into public.audit_log(actor, entity_type, entity_id, action, before_data, after_data)
  values (auth.uid(), 'order', p_order_id::text, 'admin_delete_order',
          jsonb_build_object('order', to_jsonb(v_order), 'items', v_lines),
          jsonb_build_object('restore_requested', p_restore_stock,
                             'stock_restored', p_restore_stock or v_order.stock_restored_at is not null));
  perform set_config('michayco.admin_delete_order', 'on', true);
  delete from public.orders where id = p_order_id;
  perform set_config('michayco.admin_delete_order', 'off', true);
  return jsonb_build_object('order_number', v_order.order_number,
                            'stock_restored', p_restore_stock or v_order.stock_restored_at is not null);
end $$;
revoke all on function public.delete_order_as_administrator(uuid, boolean) from public, anon;
grant execute on function public.delete_order_as_administrator(uuid, boolean) to authenticated;
