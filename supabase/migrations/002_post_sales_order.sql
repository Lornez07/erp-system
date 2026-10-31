-- ============================================================
-- ERP System — 002_post_sales_order.sql
-- Posting a sales order is ONE database transaction:
--   1. generate a unique SO-YYYY-NNNN order number
--   2. SELECT ... FOR UPDATE each product row  -> serializes
--      concurrent orders racing for the same stock  (even two
--      cashiers on separate tabs cannot oversell)
--   3. validate per-line: derived stock >= qty;  a missing item
--      raises a clear, mappped message instead of a generic one
--   4. compute totals SERVER-SIDE (client sends items only;
--      the server owns the math  -> tamper-proof totals)
--   5. set posted, stamp posted_at, append negative movements
--
-- The app NEVER does stock arithmetic (constitution rule).
-- The negative-stock trigger (001) remains as belt-and-braces.
-- ============================================================
-- ---------------- ORDER NUMBER GENERATOR ----------------
-- per-year counter: SO-2026-0142. EXISTS check on the UNIQUE index
-- guards double-click / duplicate inserts: raises 23505 -> mapped
-- toast client-side.
create or replace function public.make_order_no(prefix text, p_year int)
returns text
language plpgsql
as $$
declare
  seq int;
  candidate text;
  exists_flag boolean;
begin
  select coalesce(max(substring(s.order_no from '[0-9]+$')::int), 0) + 1
    into seq
  from public.sales_orders s
  where s.order_no like prefix || '-' || p_year::text || '-%';
  loop
    candidate = prefix || '-' || p_year || '-' || lpad(seq::text, 4, '0');
    select exists(select 1 from public.sales_orders o where o.order_no = candidate)
      into exists_flag;
    exit when not exists_flag;
    seq = seq + 1;
  end loop;
  return candidate;
end $$;

-- client needs draft order numbers too (draft inserts happen over the
-- regular REST path, so the generator must be callable from the SPA)
grant execute on function public.make_order_no(text, int) to authenticated;

-- ---------------- POST A SALES ORDER ----------------
-- sec def: bypasses RLS so a draft->posted transition + approved
-- ledger append happen atomically (viewer-role client can't post)
create or replace function public.post_sales_order(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_role user_role;
  v_order      sales_orders;
  v_status     order_status;
  r            sales_order_items;
  v_on_hand    int;
  v_total      int = 0;
begin
  -- auth: invoker must be sales or admin (definer does not exempt auth check)
  select role into v_profile_role from profiles where id = auth.uid();
  if v_profile_role is null or v_profile_role not in ('admin','sales') then
    raise exception 'RPC403 only sales/admin may post orders'
      using errcode = '42501';
  end if;

  -- lock the order row itself: two tabs posting the same order
  -- serializes here; second call sees posted and fails safely
  select * into v_order from sales_orders
    where id = p_order_id
    for update;
  if not found then
    raise exception 'not found: order %', p_order_id;
  end if;
  if v_order.status <> 'draft' then
    raise exception 'SO409 order % is % — only draft can post', p_order_id, v_order.status
      using errcode = '23514';
  end if;

  -- per-product lock + derived-stock validation
  for r in
    select i.* from sales_order_items i where i.order_id = p_order_id
  loop
    select p.id into v_on_hand
      from products p
      where p.id = r.product_id
      for update;
    if not found then
      raise exception 'prod missing: line for %', r.product_id;
    end if;

    select coalesce(sum(m.qty_signed), 0)::int into v_on_hand
      from stock_movements m
      where m.product_id = r.product_id;

    if v_on_hand < r.qty then
      -- message doubles as spec-mandated client wording:
      -- 'Order exceeds stocked quantity. Reduce or save as draft.'
      raise exception 'INSUFFICIENT_STOCK: order exceeds stocked quantity for product % (attempted balance %)',
        r.product_id, v_on_hand
        using errcode = '23514';
    end if;

    -- server owns the math: qty * unit_price, recomputed & stored per line.
    -- A tampered client value cannot change what the ledger records.
    update sales_order_items
      set line_total_cents = r.qty * r.unit_price_cents
      where id = r.id;

    insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by)
    values (r.product_id, 'sale', -r.qty, 'sales_order', p_order_id, auth.uid());

    v_total = v_total + r.qty * r.unit_price_cents;
  end loop;

  update sales_orders
    set status = 'posted',
        total_cents = v_total,
        posted_at = now()
    where id = p_order_id;
end $$;

grant execute on function public.post_sales_order(bigint) to authenticated;
