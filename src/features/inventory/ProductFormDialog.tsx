import { useState, type FormEvent } from 'react'
import { useCategories, useSaveProduct, type ProductRow } from './queries'
import { centsToPesos, productFormSchema, formToObject } from './schema'
import { mapDbError } from '../../lib/errorMapping'

interface Props {
  existing?: ProductRow & { stock?: number }
  onClose: () => void
}

export function ProductFormDialog({ existing, onClose }: Props) {
  const { data: categories = [] } = useCategories()
  const save = useSaveProduct(onClose)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = formToObject(fd)
    const parsed = productFormSchema.safeParse(raw)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    save.mutate({ values: parsed.data, productId: existing?.id })
  }

  const inputCls = 'w-full border border-line bg-bg px-2 py-1.5 text-sm'
  const labelCls = 'mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg border border-line bg-surface shadow-md"
        style={{ borderRadius: 'var(--radius-card)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-line px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">inv / product</p>
          <h2 className="text-base font-semibold">{existing ? 'Edit product' : 'New product'}</h2>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="f-sku" className={labelCls}>SKU</label>
            <input id="f-sku" name="sku" required defaultValue={existing?.sku} placeholder='HINGE-3IN-A4'
              className={inputCls + ' font-mono'} style={{ borderRadius: 'var(--radius-card)' }} />
            {fieldErrors.sku && <p className="mt-1 text-xs text-danger">{fieldErrors.sku}</p>}
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="f-name" className={labelCls}>Name</label>
            <input id="f-name" name="name" required defaultValue={existing?.name} placeholder='Steel Hinge 3-inch'
              className={inputCls} style={{ borderRadius: 'var(--radius-card)' }} />
            {fieldErrors.name && <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="f-category" className={labelCls}>Category</label>
            <select id="f-category" name="category_id" required defaultValue={existing?.categories ? undefined : ''}
              className={inputCls} style={{ borderRadius: 'var(--radius-card)' }}>
              <option value="" disabled>Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {fieldErrors.category_id && <p className="mt-1 text-xs text-danger">{fieldErrors.category_id}</p>}
          </div>
          <div>
            <label htmlFor="f-unit" className={labelCls}>Unit</label>
            <select id="f-unit" name="unit" defaultValue={existing?.unit ?? 'pcs'}
              className={inputCls} style={{ borderRadius: 'var(--radius-card)' }}>
              <option value="pcs">pcs</option>
              <option value="box">box</option>
              <option value="pack">pack</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-cost" className={labelCls}>Cost (₱)</label>
            <input id="f-cost" name="cost" type="number" step="0.01" min="0" required
              defaultValue={existing ? centsToPesos(existing.cost_cents) : ''}
              className={inputCls + ' tabular'} style={{ borderRadius: 'var(--radius-card)' }} />
            {fieldErrors.cost && <p className="mt-1 text-xs text-danger">{fieldErrors.cost}</p>}
          </div>
          <div>
            <label htmlFor="f-price" className={labelCls}>Sell price (₱)</label>
            <input id="f-price" name="price" type="number" step="0.01" min="0" required
              defaultValue={existing ? centsToPesos(existing.price_cents) : ''}
              className={inputCls + ' tabular'} style={{ borderRadius: 'var(--radius-card)' }} />
            {fieldErrors.price && <p className="mt-1 text-xs text-danger">{fieldErrors.price}</p>}
          </div>
          <div>
            <label htmlFor="f-reorder" className={labelCls}>Reorder point</label>
            <input id="f-reorder" name="reorder_point" type="number" min="0" required defaultValue={existing?.reorder_point ?? 10}
              className={inputCls + ' tabular'} style={{ borderRadius: 'var(--radius-card)' }} />
            {fieldErrors.reorder_point && <p className="mt-1 text-xs text-danger">{fieldErrors.reorder_point}</p>}
          </div>
          <input type="hidden" name="dontmatch" value="" />
          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose}
              className="border border-line px-3 py-1.5 text-sm" style={{ borderRadius: 'var(--radius-card)' }}>
              Cancel
            </button>
            <button type="submit" disabled={save.isPending}
              className="px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent)' }}>
              {save.isPending ? 'Saving…' : 'Save product'}
            </button>
          </div>
          {fieldErrors.form && <p className="text-xs text-danger sm:col-span-2">{mapDbError(fieldErrors.form)}</p>}
        </form>
      </div>
    </div>
  )
}
