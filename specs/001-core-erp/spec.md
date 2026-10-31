# Spec: ERP System (Portfolio Mini-ERP)

## Problem Statement
I am applying for System Developer roles but have no ERP project to discuss in
interviews. I need a small but architecturally real ERP — relational integrity,
role-based access, transactional stock logic — that I can walk an interviewer
through module by module.

## Target User
Me (the developer/interviewee) as builder and presenter; the demo "user" is a
staff member of a small Philippine trading business that today tracks orders
and stock in spreadsheets.

## Core User Journey (one sentence)
A sales staff member can record a customer order so that stock decrements
automatically, the customer and totals are recorded, and admin sees low-stock
warnings on the dashboard.

## Success Metrics
- Can demo the full flow (order → stock move → dashboard alert) live in under 2 minutes
- Every module has at least one interview talking point (constraint, trigger, RLS policy) — captured in spec/plan
- `npm run build` passes and roles are enforced (viewer cannot write)
- Screens verified at 1440px and 375px

## Features: Must-Have (v1)
- [ ] **Auth + roles** — Supabase Auth; roles: admin, sales, purchasing, viewer. Admin creates users; no public sign-up. — Acceptance: Given a viewer role, When they attempt any write, Then it is blocked in UI and rejected by RLS.
- [ ] **Inventory module** — products (SKU, name, category, unit, cost, price, reorder point) with current stock derived from stock movements. — Acceptance: Given a product with stock 0 and reorder point 10, When its page loads, Then it shows LOW badge; Given an approved purchase receipt, When posted, Then stock increases via a stock-movement record, not a direct edit.
- [ ] **Sales module** — create sales order for a customer with line items; totals computed server-side; posting creates stock movements. — Acceptance: Given stock 5, When a sales order for 8 is posted, Then it is rejected with a clear insufficient-stock error; Given stock 5 and order for 3 posted, Then stock shows 2 and movement log shows the deduction.
- [ ] **Purchasing module** — create purchase order to a supplier; posting a receipt increases stock. — Acceptance: Given a PO approved for 20 units, When received, Then stock increases by 20 and product cost may update to PO price.
- [ ] **Dashboard** — today's sales total, order counts, top 5 low-stock items, recent orders. — Acceptance: Given zero data (fresh demo company), When dashboard loads, Then empty states explain next actions; Given low-stock items exist, Then they appear with counts.
- [ ] **Demo company seed** — one plausible seeded PH trading business (products, suppliers, customers, past orders). — Acceptance: Given fresh DB, When seed runs, Then all lists show realistic data and numbers reconcile (stock = sum of movements).

## Features: Out of Scope (NOT v1)
- Accounting/GL, journals, financial statements (designed-but-deferred — interview talking point)
- HR / payroll / employee management
- CRM pipeline, marketing
- Manufacturing / MRP / BOM
- Multi-warehouse, branch transfers
- Payment gateways, invoicing to real money
- Barcode scanning hardware, native mobile app
- Email/SMS notifications
- Excel/PDF bulk reporting (single-doc PDF later if time)

## Edge Cases & Error States
- Posting an order larger than available stock → explicit rejection, order saved as draft
- Deleting a product referenced by past orders → blocked (FK), deactivate instead
- Simultaneous orders racing the last unit of stock → Postgres transaction/trigger prevents negative stock
- Viewer opens any module → read-only, write buttons hidden
- Session expired → redirect to login with message, no silent failure
- First use (empty seed skipped) → every module has an empty state naming the next action

## Interview-Talking-Points (meta requirement)
- Why Postgres constraints beat app-level validation (stock ≥ 0, FK deactivation)
- Why stock is derived (sum of movements) — auditability
- RLS policies per module role — show one real policy
- One-page module map: which ERP modules exist in industry, what's here, what's deferred and why
