# Project Constitution

This is a **portfolio mini-ERP** built for System Developer interview practice: a
compact system with a real story (Postgres RPC stock locking, derived stock via
movements, RLS role matrix) — not a production ERP, not a toy demo.

## Stack
- Language: TypeScript 5.x
- Framework: Vite 7 + React 19 + React Router 7 (SPA — no SEO/SSR needs)
- Database: Supabase Cloud (Postgres + Auth + RLS); business logic that mutates stock lives in Postgres RPCs/triggers
- Hosting/Deployment: Vercel (SPA) + Supabase Cloud
- AI Tools (Cursor, Claude Code, etc.): OpenCode

## Conventions
- Naming: PascalCase components, camelCase functions/variables, kebab-case files
- File structure: `/src/features` one folder per ERP module (inventory, sales, purchasing, dashboard); `/src/pages` routes; `/src/lib/supabase` client + typed queries + RPC wrappers; `/src/components` shared UI; `/src/hooks` React Query hooks + `useAuth`/`useRole`; `/supabase/migrations` SQL; `/specs` per workspace standards
- Testing framework & requirements: Vitest + React Testing Library; verify every task with `npm run build` + manual browser check
- Error handling pattern: try/catch around every Supabase call, Supabase error code mapped to a clear English toast; Zod on all forms; errors say what failed and how to recover
- State management: React Query for server state + React Context for auth/role; no Redux or other global state library
- Money: integer centavos (`*_cents`, int columns) — never floats; stock: integer units

## Rules (AI must obey)
- Stock mutations only in Postgres RPCs/triggers — the React app never does stock arithmetic
- Every table must have RLS policies; no table ships unprotected
- Do not add new dependencies without asking
- Do not rewrite existing working code without justification
- Do not generate placeholder/fake data in production paths (demo seed must be labeled `DEMO DATA — not production`)
- All generated code must include error handling and input validation

## Out of Scope (for this project)
- Payroll / tax compliance
- Payment gateways
- Multi-tenant / multi-warehouse
- MRP, barcode scanning, native mobile apps

## Process
This project follows the Spec → Plan → Tasks → Implement loop defined in the workspace AGENTS.md. One task at a time; verify before moving on.
