import { Link } from 'react-router'
import { useDashboard, type StatTile } from './queries'
import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { ListSkeleton } from '../../components/Skeleton'
import { mapDbError } from '../../lib/errorMapping'
import { php } from '../inventory/schema'


export function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useDashboard()

  if (isError) return (
    <div>
      <ModuleHeader code="dash / overview" title="Dashboard" />
      <div className="border border-danger bg-surface px-4 py-3 text-sm text-danger" style={{ borderRadius: "var(--radius-card)" }}>
        {mapDbError(error)} — <button className="underline" onClick={() => void refetch()}>retry</button>
      </div>
    </div>
  )

  if (isPending) {
    return (
      <div>
        <ModuleHeader code="dash / overview" title="Dashboard" />
        <ListSkeleton rows={4} />
      </div>
    )
  }

  const tiles: StatTile[] = [
    { label: "Today's posted sales", value: php.format((data?.todaySales ?? 0) / 100), detail: "Sum of posted SOs today — draft/cancelled excluded." },
    { label: "Draft orders", value: String(data?.drafts ?? 0), detail: "Queued for posting in Sales — post to decrement stock." },
    { label: "POs awaiting receiving", value: String(data?.approvedPOs ?? 0), detail: "Approved but not received — receive in Purchasing to raise stock." },
    { label: "Low-stock products", value: String(data?.lowStock.length ?? 0), detail: "Stock at or below reorder point — create a PO now." },
  ]

  return (
    <div>
      <ModuleHeader code="dash / overview" title="Dashboard" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="border border-line bg-surface px-4 py-3" style={{ borderRadius: "var(--radius-card)" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular">{t.value}</p>
            <p className="mt-1 text-xs text-muted">{t.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Low stock — order soon</p>
            <Link to="/inventory" className="text-xs text-accent underline-offset-2 hover:underline">Inventory →</Link>
          </div>
          {(data?.lowStock ?? []).length === 0 ? (
            <p className="border border-line bg-surface px-4 py-6 text-center text-sm text-muted" style={{ borderRadius: "var(--radius-card)" }}>
              Nothing is below its reorder point — the pool is healthy. New items always start as LOW at 0 stock.
            </p>
          ) : (
            <div className="border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2 text-right">Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.lowStock ?? []).map((row) => (
                    <tr key={row.product_id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2 font-mono">{row.sku}</td>
                      <td className="px-4 py-2">{row.name}</td>
                      <td className="px-4 py-2 text-right tabular"><Badge tone="low">{row.stock}</Badge></td>
                      <td className="px-4 py-2 text-right tabular text-muted">{row.reorder_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Recent orders</p>
            <Link to="/sales" className="text-xs text-accent underline-offset-2 hover:underline">Sales →</Link>
          </div>
          {(data?.recentOrders ?? []).length === 0 ? (
            <p className="border border-line bg-surface px-4 py-6 text-center text-sm text-muted" style={{ borderRadius: "var(--radius-card)" }}>
              No orders yet — record one in Sales; posting updates this list immediately.
            </p>
          ) : (
            <div className="border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-2">Order no</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentOrders ?? []).map((o) => (
                    <tr key={o.id} className="border-b border-line last:border-b-0">
                      <td className="px-4 py-2 font-mono">{o.order_no}</td>
                      <td className="px-4 py-2">{o.customers?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-xs uppercase">{o.status}</td>
                      <td className="px-4 py-2 text-right tabular">{php.format(o.total_cents / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
