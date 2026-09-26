-- Validate the combined quantity of repeated SKU lines before creating an order.
CREATE OR REPLACE FUNCTION public.create_guest_order(p_customer_name text, p_phone text, p_email text, p_notes text, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 v_order_id uuid; v_number text; v_total numeric:=0; v_item jsonb;
 v_variant public.product_variants%rowtype; v_product public.products%rowtype;
 v_fragrance public.fragrances%rowtype; v_qty int; v_variant_id uuid;
 v_requested jsonb := '{}'::jsonb; v_key text; v_qty_total int;
begin
 if length(trim(coalesce(p_customer_name,'')))<2 then raise exception 'Nombre requerido'; end if;
 if length(regexp_replace(coalesce(p_phone,''),'\D','','g'))<8 then raise exception 'Telefono invalido'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Pedido invalido'; end if;

 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=coalesce((v_item->>'quantity')::int,0);
  if v_qty<1 or v_qty>99 then raise exception 'Cantidad invalida'; end if;
  v_variant_id:=nullif(v_item->>'variant_id','')::uuid;

  if v_variant_id is null then
   select * into v_product from public.products
    where id=nullif(v_item->>'product_id','')::uuid and published=true and uses_fragrance=false and price is not null
    for update;
   if not found then raise exception 'Producto no disponible o sin precio'; end if;
   v_key:='product:'||v_product.id::text;
   v_qty_total:=coalesce((v_requested->>v_key)::int,0)+v_qty;
   if coalesce(v_product.stock,0)<v_qty_total then raise exception 'Stock insuficiente'; end if;
  else
   select * into v_variant from public.product_variants
    where id=v_variant_id and published=true and stock>0
    for update;
   if not found then raise exception 'Variante no disponible'; end if;
   select * into v_product from public.products
    where id=v_variant.product_id and published=true and uses_fragrance=true and price is not null;
   if not found then raise exception 'Producto no disponible o sin precio'; end if;
   v_key:='variant:'||v_variant.id::text;
   v_qty_total:=coalesce((v_requested->>v_key)::int,0)+v_qty;
   if coalesce(v_variant.stock,0)<v_qty_total then raise exception 'Stock insuficiente'; end if;
  end if;
  v_requested:=jsonb_set(v_requested,array[v_key],to_jsonb(v_qty_total),true);
  v_total:=v_total+(v_product.price*v_qty);
 end loop;

 v_number:='MC-'||to_char(clock_timestamp(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
 insert into public.orders(order_number,customer_name,phone,email,notes,status,total)
 values(v_number,trim(p_customer_name),trim(p_phone),nullif(trim(p_email),''),nullif(trim(p_notes),''),'Pendiente de pago',v_total)
 returning id into v_order_id;

 for v_item in select * from jsonb_array_elements(p_items) loop
  v_qty:=(v_item->>'quantity')::int; v_variant_id:=nullif(v_item->>'variant_id','')::uuid;
  if v_variant_id is null then
   select * into v_product from public.products where id=(v_item->>'product_id')::uuid for update;
   update public.products set stock=stock-v_qty where id=v_product.id;
   insert into public.order_items(order_id,product_id,variant_id,product_name,fragrance_name,unit_price,quantity)
   values(v_order_id,v_product.id,null,v_product.name,null,v_product.price,v_qty);
  else
   select * into v_variant from public.product_variants where id=v_variant_id for update;
   select * into v_product from public.products where id=v_variant.product_id;
   if v_variant.fragrance_id is not null then select * into v_fragrance from public.fragrances where id=v_variant.fragrance_id; end if;
   update public.product_variants set stock=stock-v_qty,published=(stock-v_qty)>0 where id=v_variant.id;
   insert into public.order_items(order_id,product_id,variant_id,product_name,fragrance_name,unit_price,quantity)
   values(v_order_id,v_product.id,v_variant.id,v_product.name,case when v_variant.fragrance_id is null then null else v_fragrance.name end,v_product.price,v_qty);
  end if;
 end loop;
 return jsonb_build_object('order_number',v_number,'total',v_total);
end $function$
