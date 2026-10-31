-- ============================================================
-- ERP System — 003_receive_purchase_order.sql
-- Receiving stock mirrors sales: ONE transaction, server-owned
-- math, locks, and an appended positive movement per line.
-- Adds received_at (additive migration on purchase_orders).
-- ============================================================

-- additive column (v2-friendly migration pattern: never widen tables destructively)
alter table public.purchase_orders
  add column if not exists received_at timestamptz;

-- client needs PO order numbers at draft creation time, same as SOs
grant execute on function public.make_order_no(text, int) to authenticated;

-- ---------------- RECEIVE A PURCHASE ORDER ----------------
create or replace function public.receive_purchase_order(p_po_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_status  po_status;
  r         purchase_order_items;
  v_total   int = 0;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null or v_role not in ('admin','purchasing') then
    raise exception 'RPC403 only purchasing/admin may receive POs'
      using errcode = '42501';
  end if;

  -- serialize concurrent receivers of the same PO
  select status into v_status from purchase_orders
    where id = p_po_id
    for update;
  if not found then
    raise exception 'not found: PO %', p_po_id;
  end if;
  if v_status <> 'approved' then
    raise exception 'PO409 PO % is % — approve it before receiving', p_po_id, v_status
      using errcode = '23514';
  end if;

  for r in
    select i.* from purchase_order_items i where i.po_id = p_po_id
  loop
    -- server owns the math again
    update purchase_order_items
      set line_total_cents = r.qty * r.unit_cost_cents
      where id = r.id;

    -- receiving stock: append-only positive movement (audit trail intact)
    insert into stock_movements (product_id, movement_type, qty_signed, ref_type, ref_id, created_by)
    values (r.product_id, 'purchase_receipt', r.qty, 'purchase_order', p_po_id, auth.uid());

    -- costs sync: newest received cost becomes product cost
    update products
      set cost_cents = r.unit_cost_cents
      where id = r.product_id;

    v_total = v_total + r.qty * r.unit_cost_cents;
  end loop;

  update purchase_orders
    set status = 'received',
        total_cents = v_total,
        received_at = now()
    where id = p_po_id;
end $$;

grant execute on function public.receive_purchase_order(bigint) to authenticated;
