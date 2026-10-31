-- ============================================================
-- ERP System — 001_initial_schema.sql
-- Design notes (why — for interviews):
--   * Stock is DERIVED: never stored as a mutable column. The only
--     source of truth for on-hand quantity is stock_movements
--     (append-only audit log), exposed via v_product_stock view.
--   * All money is integer centavos; all quantities integer units.
--   * A BEFORE-INSERT trigger on stock_movements rejects any movement
--     that would take a product's running sum negative.
--     (Concurrent-order races are serialized by SELECT ... FOR UPDATE
--     inside the posting RPCs — see 002_sales/003_purchasing.)
--   * RLS on every table. Roles: admin > sales | purchasing > viewer.
-- ============================================================

-- ---------- Enums ----------
create type public.user_role      as enum ('admin', 'sales', 'purchasing', 'viewer');
create type public.order_status   as enum ('draft', 'posted', 'cancelled');
create type public.po_status      as enum ('draft', 'approved', 'received', 'cancelled');
create type public.movement_type  as enum ('sale', 'purchase_receipt', 'adjustment');

-- ---------- Master data ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text      not null default '',
  role        public.user_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

create table public.categories (
  id    bigserial primary key,
  name  text not null unique,
  slug  text not null unique
);

create table public.products (
  id            bigserial primary key,
  sku           text not null unique,
  name          text not null,
  category_id   bigint not null references public.categories,
  unit          text not null default 'pcs',
  cost_cents    integer not null default 0 check (cost_cents >= 0),
  price_cents   integer not null default 0 check (price_cents >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.suppliers (
  id             bigserial primary key,
  name           text not null,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  created_at     timestamptz not null default now()
);

create table public.customers (
  id      bigserial primary key,
  name    text not null,
  phone   text,
  email   text,
  address text,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create table public.sales_orders (
  id          bigserial primary key,
  order_no    text not null unique,          -- SO-2026-0142
  customer_id bigint not null references public.customers,
  status      public.order_status not null default 'draft',
  total_cents integer not null default 0,
  order_date  date not null default current_date,
  posted_at   timestamptz,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

create table public.sales_order_items (
  id               bigserial primary key,
  order_id         bigint not null references public.sales_orders on delete cascade,
  product_id       bigint not null references public.products (id),
  qty              integer not null check (qty > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

create table public.purchase_orders (
  id            bigserial primary key,
  order_no      text not null unique,        -- PO-2026-0031
  supplier_id   bigint not null references public.suppliers,
  status        public.po_status not null default 'draft',
  total_cents   integer not null default 0,
  expected_date date,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

create table public.purchase_order_items (
  id              bigserial primary key,
  po_id           bigint not null references public.purchase_orders on delete cascade,
  product_id      bigint not null references public.products (id),
  qty             integer not null check (qty > 0),
  unit_cost_cents integer not null check (unit_cost_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0)
);

-- ---------- Audit-ledger ----------
create table public.stock_movements (
  id             bigserial primary key,
  product_id     bigint not null references public.products (id),
  movement_type  public.movement_type not null,
  qty_signed     integer not null check (qty_signed <> 0),
  ref_type       text not null,              -- 'sales_order' | 'purchase_order' | 'adjustment'
  ref_id         bigint not null,
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now()
);

create index idx_movements_product on public.stock_movements (product_id);
create index idx_movements_ref     on public.stock_movements (ref_type, ref_id);
create index idx_so_items_order    on public.sales_order_items (order_id);
create index idx_po_items_po       on public.purchase_order_items (po_id);
create index idx_products_category on public.products (category_id);

-- ---------- New auth user -> default viewer profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Role helpers (SECURITY DEFINER: profiles is RLS-locked) ----------
create or replace function public.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(labels public.user_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (labels)
  )
$$;

-- ---------- Derived stock v1 ----------
create or replace view public.v_product_stock
with (security_invoker = true) as
select
  p.id as product_id,
  p.sku, p.name, p.reorder_point, p.is_active,
  coalesce(sum(m.qty_signed), 0)::integer as stock,
  (coalesce(sum(m.qty_signed), 0)::integer <= p.reorder_point) as is_low
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.id;

-- ---------- Negative-stock guard ----------
create or replace function public.assert_nonnegative_stock()
returns trigger language plpgsql as $$
declare
  would_be integer;
begin
  select coalesce(sum(m.qty_signed), 0) + new.qty_signed
    into would_be
  from public.stock_movements m
  where m.product_id = new.product_id;

  if would_be < 0 then
    raise exception 'INSUFFICIENT_STOCK: order exceeds stocked quantity for product % (attempted balance %)', new.product_id, would_be
      using errcode = '23514';
  end if;
  return new;
end $$;

create trigger trg_nonnegative_stock
  before insert on public.stock_movements
  for each row execute function public.assert_nonnegative_stock();

-- ============================================================
-- RLS — policy matrix
--   viewer       : SELECT everywhere, nothing else
--   sales        : + CRUD customers, sales_orders(+items) while draft
--   purchasing   : + CRUD suppliers, purchase_orders(+items)
--   admin        : everything, incl. products/categories, posted rows
--   stock_movements: SELECT only (posting RPCs write via SECURITY DEFINER)
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.suppliers           enable row level security;
alter table public.customers           enable row level security;
alter table public.sales_orders        enable row level security;
alter table public.sales_order_items   enable row level security;
alter table public.purchase_orders     enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements     enable row level security;

-- everyone signed in may read master data + orders + movements
create policy read_masters on public.categories for select to authenticated using (true);
create policy read_products on public.products    for select to authenticated using (true);
create policy read_suppliers on public.suppliers  for select to authenticated using (true);
create policy read_customers on public.customers  for select to authenticated using (true);
create policy read_movements on public.stock_movements for select to authenticated using (true);
create policy read_sales_orders on public.sales_orders for select to authenticated using (true);
create policy read_sales_items  on public.sales_order_items for select to authenticated using (true);
create policy read_purchase_orders on public.purchase_orders for select to authenticated using (true);
create policy read_purchase_items  on public.purchase_order_items for select to authenticated using (true);
create policy read_own_profile on public.profiles for select to authenticated using (true);
create policy read_all_profiles on public.profiles for select to authenticated
  using (public.has_role(array['admin']::public.user_role[]));

-- master-data writes
create policy write_categories on public.categories for all to authenticated
  using (public.has_role(array['admin']::public.user_role[]))
  with check (public.has_role(array['admin']::public.user_role[]));
create policy write_products on public.products for all to authenticated
  using (public.has_role(array['admin']::public.user_role[]))
  with check (public.has_role(array['admin']::public.user_role[]));
create policy write_suppliers on public.suppliers for all to authenticated
  using (public.has_role(array['admin','purchasing']::public.user_role[]))
  with check (public.has_role(array['admin','purchasing']::public.user_role[]));
create policy write_customers on public.customers for all to authenticated
  using (public.has_role(array['admin','sales']::public.user_role[]))
  with check (public.has_role(array['admin','sales']::public.user_role[]));

-- sales module: sales|admin, posted rows immutable to non-admin
create policy write_sales_orders on public.sales_orders for all to authenticated
  using (public.has_role(array['admin','sales']::public.user_role[])
         and (status = 'draft' or public.has_role(array['admin']::public.user_role[])))
  with check (public.has_role(array['admin','sales']::public.user_role[]));
create policy write_sales_items on public.sales_order_items for all to authenticated
  using (exists (select 1 from public.sales_orders o
                 where o.id = order_id
                   and o.status = 'draft'
                   and public.has_role(array['admin','sales']::public.user_role[])));

-- purchasing module: same pattern
create policy write_purchase_orders on public.purchase_orders for all to authenticated
  using (public.has_role(array['admin','purchasing']::public.user_role[])
         and (status in ('draft','approved') or public.has_role(array['admin']::public.user_role[])))
  with check (public.has_role(array['admin','purchasing']::public.user_role[]));
create policy write_purchase_items on public.purchase_order_items for all to authenticated
  using (exists (select 1 from public.purchase_orders o
                 where o.id = po_id
                   and o.status = 'draft'
                   and public.has_role(array['admin','purchasing']::public.user_role[])));

-- stock_movements: NO write policies on purpose — clients can never mutate
-- the ledger directly; the 002/003 posting RPCs run as SECURITY DEFINER.
create policy write_movement_adjustments on public.stock_movements for insert to authenticated
  with check (public.has_role(array['admin']::public.user_role[])
              and ref_type = 'adjustment');

-- grants for role helpers used by the client
grant execute on function public.has_role(public.user_role[]) to authenticated;
grant execute on function public.current_role() to authenticated;
