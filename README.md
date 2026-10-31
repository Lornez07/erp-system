# ERP System — portfolio mini-ERP

## Deployment

- **Frontend:** Vercel (SPA). `vercel.json` rewrites all paths to `/index.html` so client-side routes survive refresh/direct links. Env vars required in Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the anon key is public-by-design; security rests on RLS, not on hiding it).
- **Backend:** the existing Supabase project — no server-side deploy step (migrations ran in the SQL editor).
- **Supabase Auth settings:** add the Vercel domain (e.g. `https://<project>.vercel.app`) under Authentication → URL Configuration → Site URL / Redirect URLs.


A small, working purchase-to-sell ERP built to demonstrate how ERP fundamentals map to a modern web stack: a ledger-derived stock system, role-based access control enforced at the database, and transactions that pass through sequenced states instead of being editable rows forever.

## What's here (v1)

| Module | Capabilities |
| --- | --- |
| **Auth + roles** | Login-only (no public sign-up). Four roles: admin, sales, purchasing, viewer. Admin creates users directly in the Supabase dashboard. |
| **Inventory** | Products (SKU, category, unit, cost, price, reorder point) + categories. Stock is **derived** from stock_movements, never stored on the product row. LOW badges from reorder-point logic. Deactivation instead of delete (FK-safe). |
| **Sales** | Orders with line items (draft - posted - cancelled). Posting is an RPC that checks stock, decrements it via movements, and seals the order. Customers managed by sales/admin. |
| **Purchasing** | POs to suppliers (draft - approved - received). Receiving is an RPC that adds a purchase_receipt movement per line and may sync product cost to the PO price. Suppliers managed by purchasing/admin. |
| **Dashboard** | Today's posted sales total, open order counts, low-stock count, top-5 low-stock table, recent orders. Loading/empty/error states on everything. |
| **Demo seed** | supabase/seed/demo_company.sql - one plausible PH trading company: 4 suppliers, 6 customers, 16 products, 4 backdated received POs, 5 posted SOs (one today), 2 drafts. Every quantity enters through the movement ledger, so stock reconciles by construction. |

**Deliberately out of scope** (see specs/001-core-erp/spec.md): accounting/GL, payroll, CRM, MRP/BOM, multi-warehouse, payment gateways, mobile. These are designed-but-deferred - the ledger and order-state design leaves room for them.

## Architecture notes (the parts worth reading)

1. **Stock is a view, not a column.** stock_movements is append-only (insert-only guard enforced by trigger). v_product_stock computes per-product stock and is_low from SUM(qty_signed). You cannot "fix" a stock figure by editing a column because there is no column to edit.
2. **Stock mutations happen in Postgres, not the browser.** post_sales_order and receive_purchase_order are SECURITY DEFINER RPCs that re-check stock, take FOR UPDATE row locks on the product, write order rows + movements, and recompute totals server-side. Frontend totals are display-only; a tampered request cannot post wrong amounts.
3. **Negative stock is impossible at three levels.** (a) the post RPC rejects over-stock orders and leaves them draft; (b) a trigger on stock_movements blocks any insert that would take a product's ledger sum below zero; (c) RLS restricts which roles can insert movements at all.
4. **Order state machines.** Sales: draft -> posted -> cancelled (posted rows are immutable to non-admin). Purchasing: draft -> approved -> received (received rows locked; received_at set by the RPC).
5. **RLS is the access layer.** Reads are authenticated-only; every write policy calls has_role(). The role x table matrix lives in specs/001-core-erp/verification.md and in the policy block of supabase/migrations/001_initial_schema.sql.

## Runbook

**Prereqs:** Node 20+, a Supabase project (free tier fine).

```bash
npm install
cp .env.example .env    # fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

**Database setup** (Supabase SQL Editor, in order):
1. supabase/migrations/001_initial_schema.sql - tables, triggers, RLS, view
2. supabase/migrations/002_post_sales_order.sql - post RPC + make_order_no()
3. supabase/migrations/003_receive_purchase_order.sql - receive RPC
4. supabase/seed/demo_company.sql - demo company (wrapped in a transaction; reconciliation queries at the end)
5. **Disable sign-up**: Auth -> Configuration -> disable new user signups (the app never offered it anyway)

**Create the four demo users** (signup is admin-only by design):
1. Supabase dashboard -> Authentication -> Add user:
   admin@demo-trade.ph, sales@demo-trade.ph, purchasing@demo-trade.ph, viewer@demo-trade.ph
   (passwords are whatever you set locally; do not commit them)
2. SQL Editor - assign roles:

   ```sql
   update public.profiles set role = 'admin'      where email = 'admin@demo-trade.ph';
   update public.profiles set role = 'sales'      where email = 'sales@demo-trade.ph';
   update public.profiles set role = 'purchasing' where email = 'purchasing@demo-trade.ph';
   update public.profiles set role = 'viewer'     where email = 'viewer@demo-trade.ph';
   ```

Sign-in happens in the app's login page; each role sees a different set of write abilities enforced by RLS, not just hidden UI.

## Project structure

```
erp-system/
├── specs/001-core-erp/        spec.md - plan.md - tasks.md - verification.md
├── supabase/
│   ├── migrations/            001 schema - 002 post RPC - 003 receive RPC
│   └── seed/demo_company.sql  demo company, opens with a DEMO DATA - not production banner
├── src/
│   ├── features/              auth - shell - inventory - sales - purchasing - dashboard
│   ├── lib/                   supabase client (typed env), money formatting (integer centavos)
│   └── shared/                ModuleHeader - Badge - EmptyState - ToastProvider - table primitives
└── design-anchor.md           palette, typography, layout signature, banned list
```

## Verification

The full acceptance-criteria matrix with PASS evidence is in specs/001-core-erp/verification.md. Build gates: npm run build + npm run lint (vitest deliberately not adopted for v1 - spec Task 10 variant (a)). Screenshots (1440px and 375px) live in docs/screenshots/.
