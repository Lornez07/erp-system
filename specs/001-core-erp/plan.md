# Plan: ERP System (Portfolio Mini-ERP)

## Architecture

```
Vite SPA (React 19 + TS + Tailwind 4)
├── src/features/inventory | sales | purchasing | dashboard   (one folder per module)
├── src/pages/         (routes, role-guarded)
├── src/lib/supabase/  (client, typed queries, RPC wrappers)
├── src/components/    (DataShell, ModuleHeader, Badge, EmptyState, Toast)
└── src/hooks/         (React Query hooks, useAuth, useRole)
Supabase Cloud
├── Postgres: tables, enums, views, triggers, RPCs (business logic in DB)
├── Auth: email+password, sign-up disabled, admin assigns roles in profiles
└── RLS: role-based policies on every table
```

**Key decision (interview point #1): all business logic that mutates stock lives in
Postgres RPCs with row locking — the React app never does stock arithmetic.**
Posting a sales order and receiving a PO are single DB transactions.

- Frontend: React Query for all server state; Zod for form validation; no global state lib
- Routing: React Router 7, `<RequireRole>` wrapper on every module route

## Data Model

All money as **integer centavos** (int column, `price_cents`). All stock as **integer units**.

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | id (=auth.users.id), full_name, role enum(`admin`,`sales`,`purchasing`,`viewer`) | 1:1 with auth.users |
| `categories` | id, name, slug | |
| `products` | id, sku UNIQUE, name, category_id FK, unit, cost_cents, price_cents, reorder_point, is_active | deactivate instead of delete (referenced by orders) |
| `suppliers` | id, name, contact_person, phone, email, address | |
| `customers` | id, name, phone, email, address | |
| `sales_orders` | id, order_no UNIQUE (`SO-2026-0142`), customer_id, status enum(`draft`,`posted`,`cancelled`), total_cents, order_date, posted_at, created_by | totals computed in RPC, not client |
| `sales_order_items` | id, order_id FK, product_id FK, qty, unit_price_cents, line_total_cents | |
| `purchase_orders` | id, order_no UNIQUE (`PO-2026-0031`), supplier_id, status enum(`draft`,`approved`,`received`,`cancelled`), total_cents, created_by | |
| `purchase_order_items` | id, po_id FK, product_id FK, qty, unit_cost_cents, line_total_cents | |
| `stock_movements` | id, product_id FK, movement_type enum(`sale`,`purchase_receipt`,`adjustment`), qty_signed, ref_type, ref_id, created_by, created_at | **append-only audit log — the source of truth for stock** |

**Stock is derived, never stored as a mutable column** (interview point #2):
`v_product_stock` view = `product LEFT JOIN (SELECT product_id, SUM(qty_signed) FROM stock_movements GROUP BY 1)`.
LOW badge = `stock <= reorder_point` computed in the view.

## Database Logic (RPCs + safety)

- `post_sales_order(order_id)` — SECURITY DEFINER; runs in one transaction:
  1. `SELECT ... FOR UPDATE` the product rows → serializes concurrent orders for the same item
  2. validates stock ≥ qty per line; raises clear exception otherwise (order stays draft)
  3. computes totals server-side, sets status `posted`, inserts negative `stock_movements`
- `receive_purchase_order(po_id)` — same pattern; plus may update `products.cost_cents` to received cost
- **Trigger guard:** before-insert trigger on `stock_movements` raises exception if any product's running sum would go < 0 (belt-and-braces with the FOR UPDATE lock)
- Order numbers: `make_order_no('SO')` — count per year + 1 in the same transaction; UNIQUE index as backstop

## RLS / Auth (interview point #3)

- Sign-up disabled in Supabase; admin creates users in dashboard, then assigns `role` in `profiles` (documented in README — avoids exposing service-role keys in SPA)
- Helper: `public.has_role(label text)` SECURITY DEFINER reads `profiles`
- Policy matrix: viewer → SELECT all modules; sales → CRUD sales module only; purchasing → CRUD purchasing only; admin → all writes + profiles; every write policy pairs with a route guard
- ` posted/received` rows become immutable to non-admin policies (no edits to posted orders)

## API / Interface

No REST endpoints — Supabase client (PostgREST) + typed RPC calls:
`supabase.rpc('post_sales_order', { order_id })`. Charts/hooks per feature folder.
PDF export of an order = jsPDF client-side (single document, v1.5 polish — not blocking).

## Dependencies

Runtime: `@supabase/supabase-js`, `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `zod`, `tailwindcss`, `@fontsource/ibm-plex-sans`+`mono`, `jspdf` *(add only if polished, ask first — per constitution)*.
Dev: `vite`, `typescript`, `vitest`, `@testing-library/react`.
`supabase` CLI for local migration authoring (optional — can push SQL via dashboard).

## Risks

| Risk | Mitigation |
|---|---|
| RLS misconfigured → demo privilege leak | Task 3 ships a permission verification matrix (login as each role, attempt each write) |
| Concurrent orders oversell last unit | FOR UPDATE lock + negative-stock trigger + test posting draft orders from two tabs |
| Order-number collision | per-year count in-transaction + UNIQUE index; retry on 23505 |
| Scope creep into full ERP | Spec's Out-of-Scope list is the contract; new module = new spec `002-*` |
| Empty demo looks fake | Seed script with plausible PH trading data, labeled demo |

## Stack Justification

- **Supabase Postgres** vs raw REST backend: RLS, triggers, and RPCs *are* the ERP story — real relational integrity to explain in interviews; avoids building a separate Node API that would just proxy CRUD
- **React+Vite** vs Next.js: dashboard app has no SEO/SSR needs; matches existing SLCV portal skills
- **Derived stock via movements** vs stock column: audit trail is the reason ERPs are trusted; costs one view
- **Roles in `profiles`** vs Supabase custom claims: simpler to demo and to talk through
