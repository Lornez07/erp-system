-- ============================================================
-- ERP System — demo_company.sql
-- DEMO DATA — not production. Plausible small-PH-trading dataset.
-- Every quantity enters through stock_movements (single source of
-- truth), so v_product_stock reconciles with the ledger by
-- construction. Order numbers use make_order_no() to avoid
-- colliding with rows you created while testing.
-- Run inside Supabase SQL Editor on the erp-system project.
-- ============================================================

begin;

-- ---------- suppliers ----------
insert into public.suppliers (name, contact_person, phone, address)
values
  ('Red Ribbon Trading', 'Robby Gonzales', '0929-400-1122', '12 Sto. Domingo St., Malabon'),
  ('IJ Supply and Sales', 'Nena Estanislao', '0917-233-8890', '110 Rizal Ave., Caloocan'),
  ('Malinta Electrical Depot', 'Tito Ramos', '0920-811-7745', '3 Malinta Rd., Valenzuela'),
  ('Caloocan Paper Wholesale', 'Gina Elizalde', '0918-300-6420', '8 P. Camerino Ave., Caloocan');

-- ---------- customers ----------
insert into public.customers (name, phone, address)
values
  ('Mang Resty Carinderia', '0912-555-1200', 'Door 4, Filstreet Bldg., Munoz'),
  ('Tita Jean Sari-sari Store', '0935-448-8931', '23 Sampaguita St., Novaliches'),
  ('Gadian Hardware', '0922-776-0311', '42 McArthur Hwy, Karuhatan'),
  ('Brightway Tutorial Center', '0998-210-5540', '2F Hilton Bldg., Valenzuela'),
  ('Odette Tailoring Shop', '0906-992-1415', '7 Gen T. De Leon, Valenzuela'),
  ('Kapitbahay Canteen Coop', '0916-120-7938', '1 Langka St., Malanday');

-- ---------- products (16 across the 4 categories) ----------
insert into public.products (sku, name, category_id, unit, cost_cents, price_cents, reorder_point)
select v.sku, v.name, c.id, v.unit, v.cost, v.price, v.reorder
from (values
  ('DT-SCR-M8',  'Machine Screw M8 25mm (100/box)', 'Fasteners',      'box',  18500, 24500, 12),
  ('DT-SCR-M6',  'Machine Screw M6 16mm (100/box)', 'Fasteners',      'box',  12800, 18000, 12),
  ('DT-HNG-3IN', 'Steel Hinge 3-inch (pair)',       'Fasteners',      'pcs',   2800,  4500, 10),
  ('DT-BLT-M8',  'Hex Bolt M8 40mm (50/box)',       'Fasteners',      'box',  14200, 19800,  8),
  ('DT-A4-70',   'A4 Bond Paper 70gsm (ream)',      'Paper & Board',  'ream', 21000, 27500, 15),
  ('DT-A4-80',   'A4 Bond Paper 80gsm (ream)',      'Paper & Board',  'ream', 24000, 31000, 10),
  ('DT-MB-NB',   'Sticky Notes 3x3 (12/pack)',      'Paper & Board',  'pack',  9500, 13800, 20),
  ('DT-ENV-OB',  'Brown Envelope legal (25/pack)',  'Paper & Board',  'pack',  6800,  9900, 15),
  ('DT-DTC-500', 'Detergent Concentrate 500ml',     'Cleaning',       'pcs',   4300,  6500, 24),
  ('DT-CLO-1L',  'Chlorine Bleach 1L',              'Cleaning',       'pcs',   3800,  5800, 24),
  ('DT-MOP-9',   'Mop Head Refill 9in',             'Cleaning',       'pcs',   5200,  7500, 12),
  ('DT-MSK-50',  'Face Mask 3-ply (50/box)',        'Cleaning',       'box',   8500, 12500, 18),
  ('DT-GLB-9W',  'LED Bulb 9w E27',                 'Electrical',     'pcs',   6800,  9900, 30),
  ('DT-EXT-3G',  'Extension Cord 3-gang 2.5m',      'Electrical',     'pcs',  15800, 21500, 10),
  ('DT-WIR-2B',  'THHN Wire 2.0 (100m roll)',       'Electrical',     'roll', 64000, 79000,  6),
  ('DT-TAP-EL',  'Electrical Tape Black',           'Electrical',     'pcs',   2200,  3500, 40)
) as v(sku, name, cat, unit, cost, price, reorder)
join public.categories c on c.name = v.cat;


-- ---------- opening stock: four RECEIVED POs (backdated) ----------
-- Quantities land exactly as the receive RPC would write them:
-- item lines + matching positive purchase_receipt movements.

do $$
declare
  v_admin uuid := (select id from public.profiles where role = 'admin' limit 1);
  v_po bigint;
begin
  -- PO A: Red Ribbon - fasteners + tape (9 days ago)
  insert into purchase_orders (order_no, supplier_id, status, expected_date, created_by, received_at)
  values (make_order_no('PO', 2026), (select id from suppliers where name='Red Ribbon Trading'), 'received', current_date - 11, v_admin, now() - interval '9 days')
  returning id into v_po;
  insert into purchase_order_items (po_id, product_id, qty, unit_cost_cents, line_total_cents)
  select v_po, p.id, v.qty, v.cost, v.qty * v.cost
  from (values ('DT-SCR-M8',24,18500), ('DT-SCR-M6',30,12800), ('DT-HNG-3IN',40,2800), ('DT-BLT-M8',18,14200), ('DT-TAP-EL',60,2200)) as v(sku, qty, cost)
  join products p on p.sku = v.sku;
  update purchase_orders po set total_cents = (select coalesce(sum(line_total_cents),0) from purchase_order_items where po_id = v_po) where po.id = v_po;
  insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by, created_at)
  select p.id, 'purchase_receipt', v.qty, 'purchase_order', v_po, v_admin, now() - interval '9 days'
  from (values ('DT-SCR-M8',24), ('DT-SCR-M6',30), ('DT-HNG-3IN',40), ('DT-BLT-M8',18), ('DT-TAP-EL',60)) as v(sku, qty)
  join products p on p.sku = v.sku;

  -- PO B: Caloocan Paper - paper lines (7 days ago)
  insert into purchase_orders (order_no, supplier_id, status, expected_date, created_by, received_at)
  values (make_order_no('PO', 2026), (select id from suppliers where name='Caloocan Paper Wholesale'), 'received', current_date - 9, v_admin, now() - interval '7 days')
  returning id into v_po;
  insert into purchase_order_items (po_id, product_id, qty, unit_cost_cents, line_total_cents)
  select v_po, p.id, v.qty, v.cost, v.qty * v.cost
  from (values ('DT-A4-70',28,21000), ('DT-A4-80',22,24000), ('DT-MB-NB',36,9500), ('DT-ENV-OB',30,6800)) as v(sku, qty, cost)
  join products p on p.sku = v.sku;
  update purchase_orders po set total_cents = (select coalesce(sum(line_total_cents),0) from purchase_order_items where po_id = v_po) where po.id = v_po;
  insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by, created_at)
  select p.id, 'purchase_receipt', v.qty, 'purchase_order', v_po, v_admin, now() - interval '7 days'
  from (values ('DT-A4-70',28), ('DT-A4-80',22), ('DT-MB-NB',36), ('DT-ENV-OB',30)) as v(sku, qty)
  join products p on p.sku = v.sku;

  -- PO C: IJ Supply - cleaning (5 days ago)
  insert into purchase_orders (order_no, supplier_id, status, expected_date, created_by, received_at)
  values (make_order_no('PO', 2026), (select id from suppliers where name='IJ Supply and Sales'), 'received', current_date - 7, v_admin, now() - interval '5 days')
  returning id into v_po;
  insert into purchase_order_items (po_id, product_id, qty, unit_cost_cents, line_total_cents)
  select v_po, p.id, v.qty, v.cost, v.qty * v.cost
  from (values ('DT-DTC-500',48,4300), ('DT-CLO-1L',44,3800), ('DT-MOP-9',26,5200), ('DT-MSK-50',32,8500)) as v(sku, qty, cost)
  join products p on p.sku = v.sku;
  update purchase_orders po set total_cents = (select coalesce(sum(line_total_cents),0) from purchase_order_items where po_id = v_po) where po.id = v_po;
  insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by, created_at)
  select p.id, 'purchase_receipt', v.qty, 'purchase_order', v_po, v_admin, now() - interval '5 days'
  from (values ('DT-DTC-500',48), ('DT-CLO-1L',44), ('DT-MOP-9',26), ('DT-MSK-50',32)) as v(sku, qty)
  join products p on p.sku = v.sku;

  -- PO D: Malinta Depot - electrical (3 days ago)
  insert into purchase_orders (order_no, supplier_id, status, expected_date, created_by, received_at)
  values (make_order_no('PO', 2026), (select id from suppliers where name='Malinta Electrical Depot'), 'received', current_date - 5, v_admin, now() - interval '3 days')
  returning id into v_po;
  insert into purchase_order_items (po_id, product_id, qty, unit_cost_cents, line_total_cents)
  select v_po, p.id, v.qty, v.cost, v.qty * v.cost
  from (values ('DT-GLB-9W',80,6800), ('DT-EXT-3G',20,15800), ('DT-WIR-2B',12,64000)) as v(sku, qty, cost)
  join products p on p.sku = v.sku;
  update purchase_orders po set total_cents = (select coalesce(sum(line_total_cents),0) from purchase_order_items where po_id = v_po) where po.id = v_po;
  insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by, created_at)
  select p.id, 'purchase_receipt', v.qty, 'purchase_order', v_po, v_admin, now() - interval '3 days'
  from (values ('DT-GLB-9W',80), ('DT-EXT-3G',20), ('DT-WIR-2B',12)) as v(sku, qty)
  join products p on p.sku = v.sku;
end $$;

-- ---------- sales history: 5 posted SOs (backdated) + 2 fresh drafts ----------
do $$
declare
  v_admin uuid := (select id from public.profiles where role = 'admin' limit 1);
  v_sales uuid := (select p.id from public.profiles p join auth.users u on u.id = p.id
                   where u.email = 'sales@demo-trade.ph');
  v_so bigint;
  v_no text;
  v_rec record;
begin
  -- posted order helper: create + items + negative movements, mirroring
  -- what post_sales_order would produce.
  -- NOTE: make_order_no() is called INSIDE the loop body. The FOR select
  -- is evaluated once at loop start, so calls made there would all see
  -- the same snapshot and return the same order number.
  for v_rec in
    select * from (values
      ('Gadian Hardware', 6,
        '[{"sku":"DT-A4-70","qty":3,"price":27500},{"sku":"DT-TAP-EL","qty":10,"price":3500}]'::jsonb),
      ('Mang Resty Carinderia', 5,
        '[{"sku":"DT-DTC-500","qty":4,"price":6500},{"sku":"DT-CLO-1L","qty":6,"price":5800}]'::jsonb),
      ('Tita Jean Sari-sari Store', 3,
        '[{"sku":"DT-GLB-9W","qty":12,"price":9900},{"sku":"DT-MB-NB","qty":5,"price":13800}]'::jsonb),
      ('Brightway Tutorial Center', 2,
        '[{"sku":"DT-A4-80","qty":6,"price":31000}]'::jsonb),
      ('Kapitbahay Canteen Coop', 0,
        '[{"sku":"DT-MSK-50","qty":8,"price":12500},{"sku":"DT-MOP-9","qty":2,"price":7500}]'::jsonb)
    ) as t(cust, days_ago, lines)
  loop
    v_no := make_order_no('SO', 2026);
    insert into sales_orders (order_no, customer_id, status, total_cents, order_date, posted_at, created_by)
    values (v_no, (select id from customers where name = v_rec.cust), 'posted', 0,
            current_date - v_rec.days_ago,
            now() - (v_rec.days_ago || ' days')::interval,
            coalesce(v_sales, v_admin))
    returning id into v_so;
    insert into sales_order_items (order_id, product_id, qty, unit_price_cents, line_total_cents)
    select v_so, p.id, (e->>'qty')::int, (e->>'price')::int, (e->>'qty')::int * (e->>'price')::int
    from jsonb_array_elements(v_rec.lines) as e, products p where p.sku = e->>'sku';
    update sales_orders so
    set total_cents = (select coalesce(sum(line_total_cents),0) from sales_order_items where order_id = v_so)
    where so.id = v_so;
    insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by, created_at)
    select p.id, 'sale', -(e->>'qty')::int, 'sales_order', v_so, coalesce(v_sales, v_admin),
           now() - (v_rec.days_ago || ' days')::interval
    from jsonb_array_elements(v_rec.lines) as e, products p where p.sku = e->>'sku';
  end loop;

  -- 2 fresh drafts (no movements until posted). Separate statements:
  -- within one multi-row insert both make_order_no() calls would see the
  -- same snapshot and hand out the same number.
  insert into sales_orders (order_no, customer_id, status, order_date, created_by)
  values (make_order_no('SO', 2026), (select id from customers where name='Gadian Hardware'), 'draft', current_date, v_admin);

  insert into sales_orders (order_no, customer_id, status, order_date, created_by)
  values (make_order_no('SO', 2026), (select id from customers where name='Tita Jean Sari-sari Store'), 'draft', current_date, v_sales);
end $$;


commit;

-- ---------- reconciliation check (tasks.md: seed must reconcile) ----------
-- 1) ledger stock == derived stock, per product:
--    expect: NO rows
select p.sku,
       (select coalesce(sum(m.qty_signed),0) from public.stock_movements m where m.product_id = p.id) as ledger_stock,
       (select stock from public.v_product_stock vs where vs.product_id = p.id)  as view_stock
from public.products p
where (select coalesce(sum(m.qty_signed),0) from public.stock_movements m where m.product_id = p.id)
   <> (select stock from public.v_product_stock vs where vs.product_id = p.id);

-- 2) posted SO totals == sum of item lines:
--    expect: NO rows
select so.order_no, so.total_cents, sum(si.line_total_cents) as items_sum
from public.sales_orders so
join public.sales_order_items si on si.order_id = so.id
where so.status = 'posted'
group by so.id, so.order_no, so.total_cents
having so.total_cents <> sum(si.line_total_cents);

-- 3) dashboard source parity:
select
  (select count(*) from public.sales_orders where status = 'posted' and order_date = current_date) as posted_today,
  (select count(*) from public.sales_orders where status = 'draft') as draft_orders,
  (select count(*) from public.purchase_orders where status = 'approved') as pos_awaiting_receive,
  (select count(*) from public.v_product_stock where is_low) as low_stock_count;
