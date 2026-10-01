-- One commercial price per five-part generic SKU. No catalog values are migrated.
-- SECURITY INVOKER throughout: existing table permissions and RLS remain authoritative.
create or replace function public.lock_generic_price_writes()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(734921, 1);
  return null;
end;
$$;
create trigger products_price_write_lock
before insert or update of price, sku on public.products
for each statement execute function public.lock_generic_price_writes();

create or replace function public.inherit_generic_price()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare common_price numeric; target_key text;
begin
  if new.sku is null or array_length(string_to_array(new.sku,'-'),1) <> 6 then
    raise exception 'La presentación requiere un SKU de seis segmentos';
  end if;
  if tg_op = 'UPDATE' and new.sku is not distinct from old.sku then return new; end if;
  target_key := array_to_string((string_to_array(new.sku,'-'))[1:5],'-');
  if tg_op = 'UPDATE' and target_key = array_to_string((string_to_array(old.sku,'-'))[1:5],'-') then return new; end if;
  -- A move/new color inherits the destination.
  select p.price into common_price from public.products p
  where p.id <> new.id and array_to_string((string_to_array(p.sku,'-'))[1:5],'-')=target_key
  order by p.id limit 1;
  if found then new.price := common_price; end if;
  if new.price is not null and (new.price < 0 or new.price > 9999999999.99 or new.price <> round(new.price,2)) then
    raise exception 'Precio inválido';
  end if;
  return new;
end;
$$;
create trigger products_inherit_generic_price
before insert or update of sku on public.products
for each row execute function public.inherit_generic_price();

create or replace function public.propagate_generic_price()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare g record;
begin
  if pg_catalog.pg_trigger_depth() > 1 then return null; end if;
  -- Only explicit price changes inside the same generic group propagate.
  for g in
    select array_to_string((string_to_array(n.sku,'-'))[1:5],'-') as key,
           min(n.price) as price,
           count(distinct coalesce(to_jsonb(n.price),'null'::jsonb)) as values_count
    from new_prices n join old_prices o using(id)
    where n.price is distinct from o.price
      and array_to_string((string_to_array(n.sku,'-'))[1:5],'-') = array_to_string((string_to_array(o.sku,'-'))[1:5],'-')
    group by 1 order by 1
  loop
    if g.values_count <> 1 then raise exception 'Indicá un único precio para el SKU genérico %',g.key; end if;
    if g.price is not null and (g.price < 0 or g.price > 9999999999.99 or g.price <> round(g.price,2)) then raise exception 'Precio inválido'; end if;
    update public.products p set price=g.price
    where array_to_string((string_to_array(p.sku,'-'))[1:5],'-')=g.key and p.price is distinct from g.price;
  end loop;
  if exists (
    select 1 from public.products p
    where array_to_string((string_to_array(p.sku,'-'))[1:5],'-') in (select array_to_string((string_to_array(n.sku,'-'))[1:5],'-') from new_prices n)
    group by array_to_string((string_to_array(p.sku,'-'))[1:5],'-')
    having count(distinct coalesce(to_jsonb(p.price),'null'::jsonb))>1
  ) then raise exception 'El SKU genérico debe tener un único precio'; end if;
  return null;
end;
$$;
create trigger products_propagate_generic_price
 after update on public.products referencing old table as old_prices new table as new_prices
 for each statement execute function public.propagate_generic_price();

create or replace function public.check_inserted_generic_price()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if exists (
    select 1 from public.products p
    where array_to_string((string_to_array(p.sku,'-'))[1:5],'-') in (select array_to_string((string_to_array(n.sku,'-'))[1:5],'-') from inserted_prices n)
    group by array_to_string((string_to_array(p.sku,'-'))[1:5],'-')
    having count(distinct coalesce(to_jsonb(p.price),'null'::jsonb))>1
  ) then raise exception 'El SKU genérico debe tener un único precio'; end if;
  return null;
end;
$$;
create trigger products_check_inserted_price
 after insert on public.products referencing new table as inserted_prices
 for each statement execute function public.check_inserted_generic_price();

create or replace function public.save_generic_price_grid(p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item jsonb; key text; seen text[] := '{}'; changed integer; total integer:=0; price_value numeric;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>5000 then raise exception 'Cambios inválidos'; end if;
  perform pg_catalog.pg_advisory_xact_lock(734921, 1);
  for item in select value from jsonb_array_elements(p_changes) loop
    key:=item->>'sku';
    if key is null or array_length(string_to_array(key,'-'),1)<>5 or key=any(seen) then raise exception 'SKU genérico inválido o duplicado'; end if;
    seen:=array_append(seen,key);
    if not(item?'price') and not(item?'published') then raise exception 'No hay campos para guardar'; end if;
    if item?'price' and jsonb_typeof(item->'price') not in ('number','null') then raise exception 'Precio inválido'; end if;
    if item?'published' and jsonb_typeof(item->'published') <> 'boolean' then raise exception 'Visibilidad inválida'; end if;
    price_value:=(item->>'price')::numeric;
    if price_value is not null and (price_value<0 or price_value>9999999999.99 or price_value<>round(price_value,2)) then raise exception 'Precio inválido'; end if;
    update public.products p set price=case when item?'price' then price_value else p.price end,
      published=case when item?'published' then (item->>'published')::boolean else p.published end
    where array_to_string((string_to_array(p.sku,'-'))[1:5],'-')=key;
    get diagnostics changed=row_count;
    if changed=0 then raise exception 'SKU genérico desconocido: %',key; end if;
    total:=total+changed;
  end loop;
  return jsonb_build_object('presentations',total,'groups',cardinality(seen));
end;
$$;
revoke all on function public.lock_generic_price_writes() from public,anon,authenticated;
revoke all on function public.inherit_generic_price() from public,anon,authenticated;
revoke all on function public.propagate_generic_price() from public,anon,authenticated;
revoke all on function public.check_inserted_generic_price() from public,anon,authenticated;
revoke all on function public.save_generic_price_grid(jsonb) from public,anon;
grant execute on function public.save_generic_price_grid(jsonb) to authenticated;
