# Verification Matrix — ERP System (001-core-erp)

Every acceptance line from `spec.md` mapped to evidence. Evidence types:
- **cmd** — command output captured during the task
- **sql** — SQL-editor result observed by the operator
- **ui** — browser observation by the operator
- **shot** — screenshot at `docs/screenshots/` (pending capture, see bottom)

## Feature acceptance

| # | Spec acceptance | Status | Evidence |
|---|---|---|---|
| 1 | **Auth + roles** — viewer write blocked in UI and rejected by RLS | ✅ PASS | UI: viewer login shows no write affordances (Task 3). RLS: `products` write policy is admin-only; viewer insert returns Postgres `42501` (`new row violates row-level security policy`). Sales/purchasing policies (`write_sales_orders`, `write_purchase_orders`) restrict by `has_role()` — cross-module writes denied during Tasks 5–7 role testing. |
| 2 | **Inventory** — stock 0 / reorder 10 shows LOW badge; receipt increases stock via movement, not direct edit | ✅ PASS | UI: LOW danger badge on below-reorder products (Task 5). Stock has no writable column: `v_product_stock` derives from `SUM(stock_movements.qty_signed)`; product inserts contain no stock field. Receipt path only via `receive_purchase_order` RPC (movement `purchase_receipt`, verified Task 7: +20 units, cost synced to PO price). |
| 3 | **Sales** — post 8 with stock 5 → clear rejection, order stays draft | ✅ PASS | UI: over-stock post attempt → visible insufficient-stock toast, order row still `draft` (Task 6). Server-side check inside `post_sales_order` re-reads stock with `FOR UPDATE` lock before decrementing. |
| 4 | **Sales** — post 3 with stock 5 → stock 2, movement logged negative | ✅ PASS | SQL: `stock_movements` row `movement_type='sale'`, negative `qty_signed`, `ref_type='sales_order'` (Task 6). UI: inventory stock column reflected decrement immediately. |
| 5 | **Purchasing** — approved PO for 20 received → stock +20; cost may update to PO price | ✅ PASS | SQL/UI: movement `purchase_receipt` +20 (Task 7); product `cost_cents` updated to PO unit price; `purchase_orders.received_at` set. |
| 6 | **Dashboard** — empty state explains next actions; low-stock items appear with counts | ✅ PASS | UI: four stat tiles + top-5 low-stock table + recent orders with loading/empty/error states (Task 8); tile numbers spot-checked against module pages. Empty-state copy instructs to run the demo seed / add first product. |
| 7 | **Seed** — fresh DB → realistic data; numbers reconcile (stock = sum of movements) | ✅ PASS | SQL: seed's closing reconciliation queries return zero mismatch rows (ledger sum vs `v_product_stock` identical for all 20 products — 4 pre-existing + 16 seeded); posted-SO totals equal item-line sums; dashboard counts: `posted_today=1, draft_orders=2, pos_awaiting_receive=0` (2026-11-01 run). |

## Role × table RLS matrix (from `001_initial_schema.sql` policies)

| Table | viewer | sales | purchasing | admin |
|---|---|---|---|---|
| profiles | own row (r), all roles | own row (r) | own row (r) | own row (r) |
| categories | r | r | r | rw |
| products | r | r | r | rw |
| suppliers | r | r | rw | rw |
| customers | r | rw | r | rw |
| sales_orders / items | r | rw (draft-only for non-admin edits; posted immutable) | r | rw |
| purchase_orders / items | r | r | rw | rw |
| stock_movements | r | r | r | r + adjustments |

Reads: authenticated-only on all module tables. Writes gated by `has_role()` helper. Written manually: admin can cancel/post any sale; sales cannot touch suppliers or POs; purchasing cannot touch customers or SOs (verified cross-module during Tasks 5–7).

## Build gates (Task 10 verification)

| Gate | Command | Result |
|---|---|---|
| Typecheck + build | `npm run build` | ✅ green (final run 2026-11-01, after auth/toast context split; runs after Tasks 1–8 also green) |
| Lint | `npm run lint` (oxlint) | ✅ 0 warnings, 0 errors, 33 files / 116 rules (was 2 fast-refresh warnings → fixed by moving `useAuth`/`useToast` into `auth-context.ts` / `toast-api.ts`; providers left component-only) |
| Unit tests | `npx vitest run` | **N/A — variant (a) confirmed by user**: vitest not installed, no unit tests for v1; build + lint are the gates |

## Final visual pass

| Viewport | Pages | Status |
|---|---|---|
| 1440px | dashboard, inventory, purchasing | ✅ verified against design anchor (rules-ledger header, hairline rows, tabular numerals, real data, no banned patterns); stock/total figures cross-checked against seed ledger |
| 375px | dashboard, sales list, login | ✅ verified: bottom nav active states, badges intact, real empty-state copy |
| 1440px | sales | same pattern family as purchasing/inventory — spot-checked only |
| 375px | inventory, purchasing | same bottom-nav family — spot-checked only |

Captured files: `docs/screenshots/` (dashboard ×2, inventory ×1, purchasing ×1, sales ×1, login ×1). Minor nits noted (non-blocking): STATUS badge sits close to the right edge at 375px on the sales list; purchasing list is intentionally spare (no status filter — all seeded POs are received).

## Deployment record

- Live: https://erp-system-demos.vercel.app (Vercel, Vite preset)
- SPA rewrite verified: deep link /sales returns 200 + index shell (2026-11-01)
- Env vars set in Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (anon key is public-by-design; security rests on RLS)
- .env git-ignored; only .env.example committed
- Operator steps remaining: Supabase Auth URL Configuration (Site URL + Redirect URLs = Vercel domain); logged-in smoke test on the live domain

- Post-deploy fix (2026-11-01): mobile had no sign-out (sidebar is desktop-only) — added mobile-only top bar with user chip + Sign out to AppShell.tsx; observed by operator on 375px and reported good
