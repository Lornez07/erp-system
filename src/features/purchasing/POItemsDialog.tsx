import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { usePOItems, type PurchaseOrderRow } from './queries'
import { php } from '../inventory/schema'

interface Props { po: PurchaseOrderRow; onClose: () => void }

export function POItemsDialog({ po, onClose }: Props) {
  const { data, isPending, isError } = usePOItems(po.id)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-xl border border-line bg-surface shadow-md" style={{ borderRadius: 'var(--radius-card)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="border-b border-line px-4 py-3">
          <ModuleHeader code={'pch / ' + po.order_no.toLowerCase()} title={po.order_no} />
        </div>
        <div className="px-4 py-4 pb-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">
            <Badge tone={po.status === 'received' ? 'ok' : po.status === 'cancelled' ? 'low' : 'neutral'}>{po.status}</Badge>
            <span>{po.suppliers?.name ?? '—'}</span>
          </div>
          {isPending && <p className="font-mono text-xs uppercase tracking-widest text-muted">Loading lines…</p>}
          {isError && <p className="text-sm text-danger">Could not load lines — close and retry.</p>}
          {data && data.length === 0 && (<p className="text-xs text-muted">No lines stored yet.</p>)}
          {data && data.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                  <th className="py-2">SKU</th>
                  <th className="py-2">Product</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit cost</th>
                  <th className="py-2 text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {data.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-b-0">
                    <td className="py-2 font-mono">{it.products?.sku}</td>
                    <td className="py-2">{it.products?.name}</td>
                    <td className="py-2 text-right tabular">{it.qty}</td>
                    <td className="py-2 text-right tabular">{php.format(it.unit_cost_cents / 100)}</td>
                    <td className="py-2 text-right tabular">{php.format(it.line_total_cents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 text-right">
            <button type="button" onClick={onClose} className="border border-line px-3 py-1.5 text-sm" style={{ borderRadius: 'var(--radius-card)' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
