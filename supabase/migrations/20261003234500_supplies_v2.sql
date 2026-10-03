-- Catálogo de insumos V2. Aditivo y reversible: no reemplaza tablas legacy.
create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('container','essence','raw_material','accessory','presentation')),
  purchase_name text not null,
  description text,
  stock_unit text not null check (stock_unit in ('unit','ml','g','cm')),
  stock numeric(14,3) not null default 0 check (stock >= 0),
  min_stock numeric(14,3) check (min_stock is null or min_stock >= 0),
  target_stock numeric(14,3) check (target_stock is null or target_stock >= 0),
  purchase_presentation text,
  purchase_quantity numeric(14,3) check (purchase_quantity is null or purchase_quantity > 0),
  last_purchase_cost numeric(14,2) check (last_purchase_cost is null or last_purchase_cost >= 0),
  supplier text,
  material text,
  color text,
  capacity_cc numeric(12,3) check (capacity_cc is null or capacity_cc > 0),
  height_mm numeric(12,2) check (height_mm is null or height_mm > 0),
  width_mm numeric(12,2) check (width_mm is null or width_mm > 0),
  depth_mm numeric(12,2) check (depth_mm is null or depth_mm > 0),
  diameter_mm numeric(12,2) check (diameter_mm is null or diameter_mm > 0),
  includes_lid boolean,
  notes text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplies_container_fields check (
    type='container' or (material is null and color is null and capacity_cc is null and height_mm is null and width_mm is null and depth_mm is null and diameter_mm is null and includes_lid is null)
  )
);
comment on table public.supplies is 'Maestro normalizado de insumos V2. Convive con materials/colors durante la migración.';
create index if not exists supplies_type_active_idx on public.supplies(type,active);
alter table public.supplies enable row level security;
create policy "supplies_admin_select" on public.supplies for select to authenticated using (public.is_admin());
create policy "supplies_admin_insert" on public.supplies for insert to authenticated with check (public.is_admin());
create policy "supplies_admin_update" on public.supplies for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "supplies_admin_delete" on public.supplies for delete to authenticated using (public.is_admin());

create or replace function public.next_supply_code(p_type text)
returns text language plpgsql security definer set search_path=public as $$
declare prefix text; n integer;
begin
 prefix:=case p_type when 'container' then 'ENV' when 'essence' then 'ESC' when 'raw_material' then 'MAT' when 'accessory' then 'ACC' when 'presentation' then 'PRE' else null end;
 if prefix is null then raise exception 'Tipo de insumo inválido'; end if;
 if not public.is_admin() then raise exception 'No autorizado'; end if;
 select coalesce(max(nullif(regexp_replace(code,'^'||prefix||'-','','i'),'')::integer),0)+1 into n from public.supplies where code ~* ('^'||prefix||'-[0-9]+$');
 return prefix||'-'||lpad(n::text,3,'0');
end $$;
revoke all on function public.next_supply_code(text) from public;
grant execute on function public.next_supply_code(text) to authenticated;
