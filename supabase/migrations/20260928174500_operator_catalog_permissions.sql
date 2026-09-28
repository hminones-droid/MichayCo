-- Business operators can create, edit and publish catalog/content, but only administrators delete.
do $$
declare
  t text;
  old_policy text;
begin
  for t,old_policy in
    select * from (values
      ('categories','admins manage categories'),('colors','admins manage colors'),
      ('fragrances','admins manage fragrances'),('materials','admins manage materials'),
      ('product_images','admins manage images'),('product_variants','admins manage variants'),
      ('products','admins manage products'),('site_content','admins manage content')
    ) as policies(table_name,policy_name)
  loop
    execute format('drop policy if exists %I on public.%I',old_policy,t);
    execute format('create policy staff_select on public.%I for select to authenticated using (public.is_admin())',t);
    execute format('create policy staff_insert on public.%I for insert to authenticated with check (public.is_admin())',t);
    execute format('create policy staff_update on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',t);
    execute format('create policy administrator_delete on public.%I for delete to authenticated using (public.is_super_admin())',t);
  end loop;
end $$;

alter policy "admins delete product images storage" on storage.objects
using (bucket_id = 'product-images' and public.is_super_admin());

-- Order lines are historical snapshots. Editing them directly would desynchronize stock.
drop policy if exists admin_update_order_items on public.order_items;
alter policy authenticated_read_audit on public.audit_log
using (public.is_super_admin());
