# Design Anchor: ERP System (Portfolio Mini-ERP)

> Fill this before writing UI. Keep it short enough to reread every session.

## Audience

- Who: Me (interviewee presenting) + demo persona: staff of a small PH trading business
- What they use today: spreadsheets and notebooks for orders and stock
- What "premium" means to them: it looks like a real enterprise system — dense, fast, precise; nothing toy-like

## References

| Site | Borrow | Do not copy |
|---|---|---|
| Linear | restrained palette, keyboard-first feel, crisp tables | marketing page aesthetics |
| Stripe Dashboard | dense data tables, numeric alignment (right-aligned tabular figures) | purple/blue brand accents |
| Supabase dashboard | mono labels, dark-on-light utility chrome | its green branding as ours |

## Palette

| Token | Hex | Usage |
|---|---|---|
| background | #F7F7F5 | page base (warm near-white, not blue-gray) |
| surface | #FFFFFF | cards, table panels |
| text | #1A1D1A | primary copy |
| muted | #6B6F6B | secondary copy, table meta |
| accent | #0F6B4F | primary action (deep supply-green), links, active nav |
| accent-soft | #E7F2ED | selected rows, badges background |
| danger | #B42318 | errors, LOW-stock badges, destructive actions |

Rules:
- Accent on **one** primary action per screen (e.g., "Post order").
- No gradients.
- Body text pair: #1A1D1A on #FFFFFF (≥ 14:1). Danger pair: #B42318 on #FFFFFF (≥ 5:1).

## Typography

- Display font: "IBM Plex Sans" (fallback: system-ui) — page titles, screen headers
- Body font: "IBM Plex Sans" (fallback: system-ui)
- Mono font: "IBM Plex Mono" (fallback: ui-monospace) — SKUs, IDs, amounts, statuses, column labels
- Scale: 12 / 14 / 16 / 20 / 24 / 32 (48 not used — no marketing pages)
- Weights used: 400 / 500 / 600 (max 3)
- Line height: body 1.5, display 1.1; numeric columns use `font-variant-numeric: tabular-nums`

## Layout

- Max content width: 1280px, full-bleed under a fixed left sidebar (240px desktop, bottom bar mobile)
- Grid: 12-col, gutter 16px; data tables span full width
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
- Corner radius: 6px on cards/inputs; 4px on badges/full-width table corners — one stated pair
- Border treatment: 1px #E4E4E0 hairlines; table rows separated by hairlines, no zebra striping
- Shadow treatment: none by default; single subtle shadow on modals and toasts only

## Motion

- Duration range: 100–200ms
- Easing: ease-out
- What moves: row hover tint, badge appear, toast slide-in, modal fade
- What never moves: table layout on data change (no row animation — data tables stay still)

## Signature Element

**"Ruled ledger" system**: every module header carries a mono uppercase module
label (e.g., `INV / PRODUCTS`, `SLS / ORDERS-2026-10`) with a thin double rule
under it — echoed in printed order documents. Makes it look like a transactions
system, not a dashboard template.

## Banned

- Purple/blue gradient
- Unconsidered Inter/Roboto
- Centered hero + two buttons (no marketing pages in-app)
- Three identical feature cards (dashboard tiles max 4 stats, each distinct)
- Emoji as icons
- Lorem ipsum; placeholder company names like "Acme"
- Hype copy: elevate, unlock, seamless, revolutionize, supercharge
- Zebra-striped tables, rounded-full buttons, drop shadows on rows/cards

## Content Rules

- Every string is real and specific: real PH product names (e.g., "Steel Hinge 3in", "A4 Bond Paper 70gsm box"), plausible PO/SO numbers (`SO-2026-0142`)
- Amounts formatted ₱1,250.00, always tabular
- Empty states explain the next action ("No purchase orders yet — create one from Purchasing")
- Errors say what failed and how to recover ("Order exceeds stock: 3 available. Reduce quantity or save as draft.")
