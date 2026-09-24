-- Micha & Co — esquema inicial Supabase/PostgreSQL
-- No contiene secretos. Ejecutar luego en Supabase.
create extension if not exists pgcrypto;

create table if not exists categories (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 slug text not null unique, display_order int not null default 0,
 published boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists products (
 id uuid primary key default gen_random_uuid(), sku text unique, name text not null,
 slug text not null unique, category_id uuid references categories(id),
 short_description text, description text, scent text, presentation text,
 price numeric(12,2), stock int, published boolean not null default false,
 featured boolean not null default false, display_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists product_images (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
 storage_path text not null, alt_text text, display_order int not null default 0,
 is_primary boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique,
 customer_name text not null, phone text not null, email text,
 fulfillment_method text, address text, notes text,
 status text not null default 'Pendiente de pago'
   check (status in ('Pendiente de pago','Pago informado','Pago confirmado','En preparación','Listo para entregar','Entregado','Cancelado')),
 total numeric(12,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
 product_id uuid references products(id), product_name text not null,
 unit_price numeric(12,2) not null, quantity int not null check(quantity > 0)
);
create table if not exists site_content (
 key text primary key, value text, updated_at timestamptz not null default now()
);
create table if not exists audit_log (
 id bigint generated always as identity primary key, actor uuid,
 entity_type text not null, entity_id text, action text not null,
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table site_content enable row level security;
alter table audit_log enable row level security;

create policy "public reads published categories" on categories for select using (published = true);
create policy "public reads published products" on products for select using (published = true);
create policy "public reads images of published products" on product_images for select
using (exists(select 1 from products p where p.id=product_id and p.published=true));
create policy "public reads site content" on site_content for select using (true);
-- Escrituras administrativas y creación segura de pedidos se implementarán mediante
-- funciones/Worker autenticado; nunca exponer service_role en el navegador.
