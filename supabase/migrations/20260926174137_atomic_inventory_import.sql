-- One RPC call is one PostgreSQL transaction: any exception rolls back all rows.
-- Run this additive migration before switching the administrator to the RPC.
create function public.apply_inventory_import(
  p_prices jsonb, p_stock jsonb, p_mode text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  key text;
  product_sku text;
  fragrance_code text;
  amount integer;
  current_stock integer;
  price_value numeric;
  product_row public.products%rowtype;
  fragrance_row public.fragrances%rowtype;
  variant_row public.product_variants%rowtype;
  seen_prices text[] := '{}';
  seen_stock text[] := '{}';
  price_count integer := 0;
  stock_count integer := 0;
  changed integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_prices) is distinct from 'array'
     or jsonb_typeof(p_stock) is distinct from 'array'
     or jsonb_array_length(p_prices) + jsonb_array_length(p_stock) > 5000 then
    raise exception 'Planilla inválida';
  end if;
  if p_mode is null or p_mode not in ('total', 'incremental') then
    raise exception 'Modo de stock inválido';
  end if;

  for item in select value from jsonb_array_elements(p_prices) loop
    key := item->>'sku';
    if key is null or key = any(seen_prices) or array_length(string_to_array(key, '-'), 1) <> 5 then
      raise exception 'SKU genérico duplicado o inválido: %', key;
    end if;
    seen_prices := array_append(seen_prices, key);
    if not (item ? 'price') or jsonb_typeof(item->'price') is null
       or jsonb_typeof(item->'price') not in ('number', 'null')
       or (item ? 'published' and jsonb_typeof(item->'published') not in ('boolean', 'null')) then
      raise exception 'Precio o publicación inválidos: %', key;
    end if;
    price_value := (item->>'price')::numeric;
    if price_value < 0 or price_value > 9999999999.99
       or price_value <> round(price_value, 2) then
      raise exception 'Precio fuera de rango: %', key;
    end if;
    update public.products p
       set price = price_value,
           published = coalesce((item->>'published')::boolean, p.published)
     where array_to_string((string_to_array(p.sku, '-'))[1:5], '-') = key;
    get diagnostics changed = row_count;
    if changed = 0 then raise exception 'SKU genérico desconocido: %', key; end if;
    price_count := price_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(p_stock) loop
    key := item->>'sku';
    if key is null or key = any(seen_stock) or array_length(string_to_array(key, '-'), 1) <> 7 then
      raise exception 'SKU completo duplicado o inválido: %', key;
    end if;
    seen_stock := array_append(seen_stock, key);
    if jsonb_typeof(item->'stock') <> 'number'
       or (item->>'stock') !~ '^[0-9]+$'
       or (item->>'stock')::numeric > 2147483647 then
      raise exception 'Cantidad de stock inválida: %', key;
    end if;
    amount := (item->>'stock')::integer;
    product_sku := array_to_string((string_to_array(key, '-'))[1:6], '-');
    fragrance_code := split_part(key, '-', 7);
    select * into product_row from public.products
     where sku = product_sku for update;
    if not found then raise exception 'Producto desconocido: %', key; end if;

    if product_row.uses_fragrance = false then
      if fragrance_code <> 'NA' then raise exception 'SKU sin fragancia inválido: %', key; end if;
      current_stock := coalesce(product_row.stock, 0);
      if p_mode = 'incremental' and current_stock::bigint + amount > 2147483647 then
        raise exception 'Stock fuera de rango: %', key;
      end if;
      update public.products set stock = case when p_mode = 'incremental'
        then current_stock + amount else amount end where id = product_row.id;
    else
      select * into fragrance_row from public.fragrances
       where code = fragrance_code and published = true;
      if not found then raise exception 'Fragancia desconocida: %', key; end if;
      select * into variant_row from public.product_variants
       where product_id = product_row.id and fragrance_id = fragrance_row.id for update;
      if found then
        current_stock := coalesce(variant_row.stock, 0);
        if p_mode = 'incremental' and current_stock::bigint + amount > 2147483647 then
          raise exception 'Stock fuera de rango: %', key;
        end if;
        amount := case when p_mode = 'incremental' then current_stock + amount else amount end;
        update public.product_variants set sku = key, stock = amount,
          published = amount > 0 where id = variant_row.id;
      elsif amount > 0 then
        insert into public.product_variants(product_id, fragrance_id, sku, stock, published)
        values(product_row.id, fragrance_row.id, key, amount, true);
      end if;
    end if;
    stock_count := stock_count + 1;
  end loop;
  return jsonb_build_object('prices', price_count, 'stock', stock_count);
end;
$$;

revoke all on function public.apply_inventory_import(jsonb, jsonb, text) from public, anon;
grant execute on function public.apply_inventory_import(jsonb, jsonb, text) to authenticated;
