import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/auth-context'
import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { useSuppliers, useCreatePO, useProductsForPO } from './queries'
import { centsToPesos, php, formToObject } from '../inventory/schema'

interface Props { onClose: () => void }

interface Line { key: number; product_id: number | null; qty: number; cost: string }

let lineSeq = 1

export function POFormDialog({ onClose }: Props) {
  const { session } = useAuth()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProductsForPO()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lines, setLines] = useState<Line[]>([])

  // create draft PO; the Receive step (RPC) happens from the list after approval
  const create = useCreatePO(session?.user?.id ?? null, () => onClose())

  const totalPreview = useMemo(
    () => lines.reduce((s, l) => s + l.qty * Math.round(Number(l.cost || 0) * 100), 0),
    [lines],
  )

  function addLine() {
    setLines((prev) => [...prev, { key: lineSeq++, product_id: null, qty: 1, cost: "" }])
  }
  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }
  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const supplierId = Number(formToObject(new FormData(e.currentTarget)).supplier_id)
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      setErrors({ supplier_id: "Pick a supplier" })
      return
    }
    const items = lines.map((l) => ({
      product_id: l.product_id ?? 0,
      qty: l.qty,
      unit_cost: Number(l.cost || 0),
    }))
    if (!items.length) { setErrors({ items: "Add at least one line item" }); return }
    setErrors({})
    create.mutate({ supplierId, items })
    void php
  }

  const inputCls = "w-full border border-line bg-bg px-2 py-1.5 text-sm"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl border border-line bg-surface shadow-md" style={{ borderRadius: "var(--radius-card)" }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="border-b border-line px-4 py-3">
          <ModuleHeader code="pch / new-po" title="Create PO" />
        </div>
        <form onSubmit={onSubmit} className="px-4 py-4 pb-6">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">Supplier</p>
          <select name="supplier_id" required className={inputCls} style={{ borderRadius: "var(--radius-card)" }}>
            <option value="" disabled>Select supplier…</option>
            {suppliers.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
          {errors.supplier_id && <p className="mt-1 text-xs text-danger">{errors.supplier_id}</p>}

          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Line items</p>
              <button type="button" onClick={addLine} className="text-xs text-accent underline-offset-2 hover:underline">+ Add line</button>
            </div>
            {lines.length === 0 && (<p className="mb-2 text-xs text-muted">No lines yet — pick a product to prefill current cost.</p>)}
            <div className="space-y-2">
              {lines.map((l) => {
                const sel = (products as Array<{ id: number; sku: string; name: string; cost_cents: number }>).find((x) => x.id === l.product_id)
                return (
                  <div key={l.key} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <select className={inputCls + " sm:col-span-6"} style={{ borderRadius: "var(--radius-card)" }}
                      value={l.product_id ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value)
                        const p = (products as Array<{ id: number; cost_cents: number }>).find((x) => x.id === id)
                        updateLine(l.key, { product_id: id, cost: p ? centsToPesos(p.cost_cents) : "" })
                      }}>
                      <option value="" disabled>Select product…</option>
                      {(products as Array<{ id: number; sku: string; name: string }>).map((prod) => (
                        <option key={prod.id} value={prod.id}>{prod.sku} — {prod.name}</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={l.qty} aria-label="Qty" className={inputCls + " tabular sm:col-span-2"}
                      style={{ borderRadius: "var(--radius-card)" }}
                      onChange={(e) => updateLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                    <input type="number" min="0" step="0.01" value={l.cost} aria-label="Unit cost" className={inputCls + " tabular sm:col-span-3"}
                      style={{ borderRadius: "var(--radius-card)" }}
                      onChange={(e) => updateLine(l.key, { cost: e.target.value })} />
                    <span className="hidden h-3 items-center justify-end text-xs text-muted sm:flex sm:col-span-1 tabular">
                      {sel ? php.format(l.qty * Math.round(Number(l.cost || 0) * 100) / 100) : "—"}
                    </span>
                    <button type="button" onClick={() => removeLine(l.key)}
                      className="text-xs text-danger underline-offset-2 hover:underline sm:col-span-12 sm:hidden">Remove line</button>
                  </div>
                )
              })}
            </div>
            {errors.items && <p className="mt-1 text-xs text-danger">{errors.items}</p>}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <p className="text-sm text-muted">Est. total <span className="tabular font-medium text-ink">{php.format(totalPreview / 100)}</span>
              <span className="ml-2 text-xs">(server recomputes on receive)</span></p>
            <Badge tone="ok">{lines.length} lines</Badge>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="border border-line px-3 py-1.5 text-sm" style={{ borderRadius: "var(--radius-card)" }}>Close</button>
            <button type="submit" disabled={create.isPending}
              className="px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ borderRadius: "var(--radius-card)", backgroundColor: "var(--color-accent)" }}>
              {create.isPending ? "Saving…" : "Create draft PO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
