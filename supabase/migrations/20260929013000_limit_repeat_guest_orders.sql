-- Backstop for bursts of successful guest orders using the same phone number.
-- Idempotent retries return before this guard; distributed invalid attempts need an edge rate limiter.
create index if not exists orders_phone_digits_created_at_idx
on public.orders ((regexp_replace(phone,'[^0-9]','','g')), created_at desc);

create or replace function public.create_guest_order_once(
  p_customer_name text, p_phone text, p_email text, p_notes text,
  p_items jsonb, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_hash text;
  v_existing record;
  v_result jsonb;
  v_phone_digits text;
  v_recent_count integer;
begin
  if p_request_id is null then raise exception 'Falta identificador de confirmación'; end if;
  if pg_catalog.pg_column_size(p_items)>16384 then raise exception 'Pedido demasiado grande'; end if;
  v_hash := pg_catalog.md5(pg_catalog.jsonb_build_object(
    'name', p_customer_name, 'phone', p_phone, 'email', p_email,
    'notes', p_notes, 'items', p_items)::text);

  -- Serialize even concurrent requests sharing the same identifier.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select order_number,total,request_hash into v_existing
  from public.orders where client_request_id=p_request_id;
  if found then
    if v_existing.request_hash is distinct from v_hash then
      raise exception 'Esta confirmación corresponde a otro pedido; revisá la bolsa antes de volver a enviar';
    end if;
    return pg_catalog.jsonb_build_object('order_number',v_existing.order_number,'total',v_existing.total);
  end if;

  -- Successful orders per phone, serialized so simultaneous new UUIDs cannot evade the check.
  v_phone_digits := pg_catalog.regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  if pg_catalog.length(v_phone_digits) not between 8 and 15 then
    raise exception 'Teléfono inválido';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_phone_digits,1));
  select count(*) into v_recent_count from public.orders
    where pg_catalog.regexp_replace(phone,'[^0-9]','','g') = v_phone_digits
      and created_at >= now() - interval '15 minutes';
  if v_recent_count >= 5 then
    raise exception 'Ya recibimos varios pedidos para este teléfono. Esperá 15 minutos antes de intentar otro.';
  end if;

  v_result := public.create_guest_order(p_customer_name,p_phone,p_email,p_notes,p_items);
  update public.orders set client_request_id=p_request_id, request_hash=v_hash
    where order_number=v_result->>'order_number';
  if not found then raise exception 'No se pudo vincular la confirmación al pedido'; end if;
  return v_result;
end $$;

