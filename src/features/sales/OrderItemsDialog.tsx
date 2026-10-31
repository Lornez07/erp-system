import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { useOrderItems, type SalesOrderRow } from './queries'
import { php } from '../inventory/schema'

interface Props { order: SalesOrderRow; onClose: () => void }

export function OrderItemsDialog({ order, onClose }: Props) {
  const { data, isPending, isError } = useOrderItems(order.id)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-xl border border-line bg-surface shadow-md" style={{ borderRadius: 'var(--radius-card)' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="border-b border-line px-4 py-3">
          <ModuleHeader code={'sls / ' + order.order_no.toLowerCase()} title={order.order_no} />
        </div>
        <div className="px-4 py-4 pb-6">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted">
            <Badge tone={order.status === 'posted' ? 'ok' : order.status === 'draft' ? 'neutral' : 'low'}>{order.status}</Badge>
            <span>{order.customers?.name ?? '—'}</span>
          </div>
          {isPending && <p className="font-mono text-xs uppercase tracking-widest text-muted">Loading lines…</p>}
          {isError && <p className="text-sm text-danger">Could not load lines — close and retry.</p>}
          {data && (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                    <th className="py-2">SKU</th>
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit</th>
                    <th className="py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id} className="border-b border-line last:border-b-0">
                      <td className="py-2 font-mono">{it.products?.sku}</td>
                      <td className="py-2">{it.products?.name}</td>
                      <td className="py-2 text-right tabular">{it.qty}</td>
                      <td className="py-2 text-right tabular">{php.format(it.unit_price_cents / 100)}</td>
                      <td className="py-2 text-right tabular">{php.format(it.line_total_cents / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted">Stock movements for this order</p>
              {data.movements.length === 0 ? (
                <p className="mt-1 text-xs text-muted">
                  {order.status === 'posted' ? '(missing — would be an integrity bug)' : 'None — movements appear when the order is posted.'}
                </p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-xs">
                  {data.movements.map((m) => (
                    <li key={m.id} className="tabular">
                      <span className="font-mono">{m.products?.sku}</span> · {m.qty_signed} · {m.created_at.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <div className="mt-4 text-right">
            <button type="button" onClick={onClose} className="border border-line px-3 py-1.5 text-sm" style={{ borderRadius: 'var(--radius-card)' }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
