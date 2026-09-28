-- Close the guard immediately after the cancellation writes.
create or replace function public.cancel_order_and_restore_stock(p_order_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_hidden integer := 0;
  v_published boolean;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.status = 'Entregado' then
    raise exception 'Un pedido entregado requiere revisión manual antes de cancelarlo';
  end if;
  if v_order.status = 'Cancelado' or v_order.stock_restored_at is not null then
    raise exception 'Este pedido ya fue cancelado o su stock ya fue repuesto';
  end if;

  for v_item in
    select variant_id, product_id, sum(quantity)::integer as qty
      from public.order_items where order_id = p_order_id
      group by variant_id, product_id
      order by coalesce(variant_id, product_id)
  loop
    if v_item.variant_id is not null then
      update public.product_variants
         set stock = coalesce(stock, 0) + v_item.qty
       where id = v_item.variant_id
         and coalesce(stock, 0)::bigint + v_item.qty <= 2147483647
       returning published into v_published;
      if not found then raise exception 'No se pudo reponer una fragancia del pedido'; end if;
      if not v_published then v_hidden := v_hidden + 1; end if;
    elsif v_item.product_id is not null then
      update public.products
         set stock = coalesce(stock, 0) + v_item.qty
       where id = v_item.product_id
         and coalesce(stock, 0)::bigint + v_item.qty <= 2147483647;
      if not found then raise exception 'No se pudo reponer un producto del pedido'; end if;
    else
      raise exception 'Falta la referencia de un artículo del pedido';
    end if;
  end loop;

  perform set_config('michayco.cancel_order', 'on', true);
  update public.orders
     set status = 'Cancelado', stock_restored_at = now(), updated_at = now()
   where id = p_order_id;
  insert into public.audit_log(actor, entity_type, entity_id, action, before_data, after_data)
  values (auth.uid(), 'order', p_order_id::text, 'cancel_and_restore_stock',
          jsonb_build_object('status', v_order.status),
          jsonb_build_object('status', 'Cancelado', 'hidden_variants', v_hidden));
  perform set_config('michayco.cancel_order', 'off', true);
  return jsonb_build_object('order_number', v_order.order_number,
                            'hidden_variants', v_hidden);
end $function$;

