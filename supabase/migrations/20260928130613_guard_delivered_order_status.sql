-- Delivered orders need manual reconciliation before any later status change.
create or replace function public.guard_order_cancellation()
returns trigger language plpgsql set search_path = '' as $function$
begin
  if old.status = 'Entregado' and old.status is distinct from new.status then
    raise exception 'Un pedido entregado requiere revisión manual';
  end if;
  if (old.status is distinct from new.status
      and (old.status = 'Cancelado' or new.status = 'Cancelado'))
     or old.stock_restored_at is distinct from new.stock_restored_at then
    if current_setting('michayco.cancel_order', true) is distinct from 'on' then
      raise exception 'Usá la acción de cancelación para cambiar este pedido';
    end if;
  end if;
  return new;
end $function$;
