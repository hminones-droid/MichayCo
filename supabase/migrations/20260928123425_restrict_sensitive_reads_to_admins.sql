-- Authenticated accounts are not automatically store administrators.
-- Customer contact and order history must be visible only to admin_users.
alter policy authenticated_read_orders on public.orders
  using (public.is_admin());

alter policy authenticated_read_order_items on public.order_items
  using (public.is_admin());

alter policy authenticated_read_audit on public.audit_log
  using (public.is_admin());
