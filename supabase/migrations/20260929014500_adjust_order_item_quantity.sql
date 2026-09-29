-- Adjust a live order without diverging from inventory or its monetary total.
create or replace function public.adjust_order_item_quantity(p_item_id uuid, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
  v_delta integer;
  v_total numeric;
begin
  if not public.is_admin() then raise exception 'Acceso no autorizado'; end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 99 then
    raise exception 'Cantidad inválida (0 a 99)';
  end if;
  -- Keep a consistent lock order with other order mutations.
  select o.* into v_order from public.orders o
    join public.order_items i on i.order_id=o.id
    where i.id=p_item_id for update of o;
  if not found then raise exception 'Artículo del pedido no encontrado'; end if;
  if v_order.status in ('Entregado','Cancelado') or v_order.stock_restored_at is not null then
    raise exception 'El pedido entregado o cancelado requiere revisión manual';
  end if;
  select * into v_item from public.order_items where id=p_item_id for update;
  if not found or v_item.order_id<>v_order.id then raise exception 'Artículo del pedido no encontrado'; end if;
  if p_quantity=v_item.quantity then
    return pg_catalog.jsonb_build_object('order_number',v_order.order_number,'total',v_order.total,'quantity',p_quantity);
  end if;
  if p_quantity=0 and not exists (
    select 1 from public.order_items where order_id=v_order.id and id<>p_item_id
  ) then raise exception 'No se puede dejar un pedido sin artículos; cancelalo o eliminá el pedido'; end if;

  v_delta := p_quantity - v_item.quantity;
  if v_item.variant_id is not null then
    if v_delta>0 then
      update public.product_variants set stock=stock-v_delta,
        published=(stock-v_delta)>0
      where id=v_item.variant_id and published=true and stock>=v_delta;
    else
      update public.product_variants set stock=coalesce(stock,0)-v_delta, published=true
      where id=v_item.variant_id
        and coalesce(stock,0)::bigint-v_delta<=2147483647;
    end if;
    if not found then raise exception 'No hay stock suficiente o la fragancia ya no está disponible'; end if;
  elsif v_item.product_id is not null then
    if v_delta>0 then
      update public.products set stock=stock-v_delta
      where id=v_item.product_id and published=true and stock>=v_delta;
    else
      update public.products set stock=coalesce(stock,0)-v_delta
      where id=v_item.product_id
        and coalesce(stock,0)::bigint-v_delta<=2147483647;
    end if;
    if not found then raise exception 'No hay stock suficiente o el producto ya no está disponible'; end if;
  else
    raise exception 'Falta referencia de producto en el artículo';
  end if;

  v_total := v_order.total + v_delta*v_item.unit_price;
  if v_total<0 then raise exception 'Total inválido'; end if;
  if p_quantity=0 then
    delete from public.order_items where id=p_item_id;
  else
    update public.order_items set quantity=p_quantity where id=p_item_id;
  end if;
  update public.orders set total=v_total,updated_at=now() where id=v_order.id;
  insert into public.audit_log(actor,entity_type,entity_id,action,before_data,after_data)
  values (auth.uid(),'order_item',p_item_id::text,'adjust_quantity',
    pg_catalog.jsonb_build_object('order_id',v_order.id,'quantity',v_item.quantity,'total',v_order.total),
    pg_catalog.jsonb_build_object('quantity',p_quantity,'total',v_total,'stock_delta',-v_delta));
  return pg_catalog.jsonb_build_object('order_number',v_order.order_number,'total',v_total,'quantity',p_quantity);
end $$;
revoke all on function public.adjust_order_item_quantity(uuid,integer) from public,anon;
grant execute on function public.adjust_order_item_quantity(uuid,integer) to authenticated;
