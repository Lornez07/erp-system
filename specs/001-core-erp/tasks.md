# Tasks: ERP System (Portfolio Mini-ERP)

Tasks are ordered by dependency. Implement one at a time. Verify before moving on.
Setup note: admin creates users in the Supabase dashboard (signup disabled); tasks below always mean that flow plus role assignment in `profiles`.

## Task 1: Project scaffold
- **Status:** ✅ done (verified 2026-10; build green, typed env client)
- **Inputs:** workspace AGENTS.md standards, plan.md stack section
- **Outputs:** `erp-system/` app: Vite 6 + React 19 + TS + Tailwind 4 + Router 7 + React Query + `@supabase/supabase-js`; `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (no real keys committed); project-root `AGENTS.md` (retry write if earlier permission denial persists); `src/lib/supabase/client.ts` with typed env access and a clear error if env vars missing
- **Verification:** `npm run build` passes; `npm run dev` renders a placeholder app; typing test: `supabaseClient` import compiles with env typed as required strings

## Task 2: Database schema migration + RLS
- **Status:** ✅ done (verified 2026-10; 20 policies, negative-stock trigger, view)
- **Inputs:** plan.md Data Model + RLS section; Supabase project SQL editor access
- **Outputs:** `supabase/migrations/001_initial.sql` — enums, all 10 tables, FKs (products restrict-delete), UNIQUE indexes, `v_product_stock` view, `has_role()` helper, full `profiles` policy + read policies for module tables, negative-stock trigger on `stock_movements`
- **Verification:** run in SQL editor succeeds; `select * from v_product_stock` returns empty set; inserting a movement as anon from the SQL editor is blocked; repeat the INSERT with an admin-jwt-equivalent DDL-authorized check or note the RLS check for Task 3 browser verification

## Task 3: Auth + roles
- **Status:** ✅ done (verified 2026-10; 4 demo users, viewer blocked, 42501 handled)
- **Inputs:** Task 2 schema; Supabase Auth docs
- **Outputs:** `useAuth` context (session + profile+role via React Query), `LoginPage`, `RequireRole` route wrapper, sign-up UI absent/login-only, redirect-on-expired-session with visible message
- **Verification:** dashboard-create one user per role, set role in profiles, log in as each: viewer sees no write buttons and an RLS write attempt via console is denied (`42501` handled with friendly message); expired-session redirect observed by logging out in another tab

## Task 4: App shell + shared components
- **Status:** ✅ done (verified 2026-10; 1440 + 375 checked against anchor)
- **Inputs:** design-anchor.md (palette, ruled-ledger signature element, spacing)
- **Outputs:** sidebar (desktop) + bottom nav (mobile), ModuleHeader with double rule, Badge, EmptyState, Toast provider wired to supabase error mapping, loading skeleton pattern; fonts loaded with tabular-nums utility
- **Verification:** screenshot at 1440px and 375px matches anchor rules (contrast pair, hairline borders, no shadows on rows); every route renders in empty state with next-action copy

## Task 5: Inventory module
- **Status:** ✅ done (verified 2026-10; CRUD, LOW badges, role splits, FK deactivation)
- **Inputs:** Task 2, 3, 4
- **Outputs:** products table page (stock column from view, LOW danger badge rule), product create/edit form (Zod: sku format, price>0, reorder≥0; admin-only writes), categories management, deactivation instead of delete handling FK error
- **Verification:** CRUD test as admin; viewer blocked by RLS; featured product with stock 0 / reorder 10 shows LOW; `npm run build` passes with TS types for query results

## Task 6: Sales module
- **Status:** ✅ done (verified 2026-10; over-stock reject, movement −3, posted immutability)
- **Inputs:** Task 5
- **Outputs:** orders list (draft/posted/cancelled filter), new-order form with line items (React state rows + Zod), `post_sales_order` RPC call, over-stock error rendered per spec wording, customers management page (sales role CRUD)
- **Verification:** order for 8 with stock 5 → rejected with clear message, order stays draft; order for 3 → stock view decrements 2, movement row exists (type sale, negative qty); admin cannot edit a posted order

## Task 7: Purchasing module
- **Status:** ✅ done (verified 2026-10; +20 receipt, cost sync, role splits)
- **Inputs:** Task 2, 5
- **Outputs:** PO list + new PO form (supplier select, line items, unit_cost), `receive_purchase_order` RPC (status received, stock increases, cost update), suppliers management page (purchasing role CRUD)
- **Verification:** PO 20 units received → stock up 20 and movement row type purchase_receipt; product cost updates to PO price; purchaser cannot touch sales tables (RLS denies)

## Task 8: Dashboard
- **Status:** ✅ done (verified 2026-11-01; tile parity spot-check, states, 375px)
- **Inputs:** Task 5–7 views
- **Outputs:** 4 distinct stat tiles (today's sales total, open orders, low-stock count, recent activity), top-5 low-stock table, recent orders table; all with loading/empty/error states; no Equal-Width-Card triads (anchor ban)
- **Verification:** numbers match module pages exactly (spot-check sum); empty state copy explains seeding; screenshot 1440 + 375

## Task 9: Demo seed
- **Status:** ✅ done (verified 2026-11-01; reconciliation zero-diff, grid: posted_today=1 / drafts=2 / awaiting=0)
- **Inputs:** Task 2–8; spec "PH trading business" description
- **Outputs:** `supabase/seed/demo_company.sql` — 1 category set, ~15 products w/ plausible SKUs, 4 suppliers, 6 customers, backdated movements that reconcile (stock = SUM movements), 2 draft + 5 posted SOs, 3 POs; header comment "DEMO DATA — not production"
- **Verification:** run seed on fresh schema; per-product check `SUM(movements) = v_product_stock.stock` for all rows; LOW badge count matches reorder logic

## Task 10: Verification matrix + README
- **Status:** ✅ done (2026-11-01) — verification.md complete with evidence; README written; build ✅ / lint ✅ (0 warnings after auth+toast context split) / screenshots ✅ 6 files in docs/screenshots; `.env` added to .gitignore before first commit
- **Inputs:** spec acceptance criteria; Tasks 1–9
- **Outputs:** `README.md` — screenshots, module map (what's here vs deferred accounting/HR/CRM), architecture notes (movements design, RPC locking, RLS matrix by role × module), "admin creates users" runbook; `specs/001-core-erp/verification.md` — table of every spec acceptance line with PASS evidence (command output / screenshot path)
- **Verification:** `npx vitest run` green + `npm run build` green; every spec feature checkbox ticked only with evidence attached; final pass at 375px and 1440px
