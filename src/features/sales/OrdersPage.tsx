import { useState } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { mapDbError } from '../../lib/errorMapping'
import { useOrders, usePostOrder, useCancelOrder, type SalesOrderRow } from './queries'
import { php } from '../inventory/schema'
import { OrderFormDialog } from './OrderFormDialog'
import { OrderItemsDialog } from './OrderItemsDialog'

type Status = SalesOrderRow["status"]

const statusTone: Record<Status, "neutral" | "ok" | "low"> = {
  draft: "neutral",
  posted: "ok",
  cancelled: "low",
}

export function OrdersPage() {
  const { profile, session } = useAuth()
  const canWrite = profile?.role === "admin" || profile?.role === "sales"
  const { data: orders, isPending, isError, error, refetch } = useOrders()
  const post = usePostOrder()
  const cancel = useCancelOrder()
  const [central, setCreating] = useState(false)
  const [viewing, setViewing] = useState<SalesOrderRow | null>(null)

  if (isError) {
    return (
      <div>
        <ModuleHeader code="sls / orders" title="Sales" />
        <EmptyState title="Could not load orders" description={mapDbError(error)}
          action={{ label: "Retry", onClick: () => void refetch() }} />
      </div>
    )
  }

  const openCount = (orders ?? []).filter((o) => o.status === "draft").length

  return (
    <div>
      <ModuleHeader code="sls / orders" title="Sales" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {(orders ?? []).length} recent orders · <span className="font-mono">{openCount} DRAFT</span>
          <span className="mx-2 text-muted">·</span>
          <Link to="/sales/customers" className="text-accent underline-offset-2 hover:underline">Customers</Link>
        </p>
        {canWrite && (
          <button type="button" onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-sm font-medium text-white"
            style={{ borderRadius: "var(--radius-card)", backgroundColor: "var(--color-accent)" }}>
            New order
          </button>
        )}
      </div>

      {isPending ? (
        <ListSkeleton rows={6} />
      ) : (orders ?? []).length === 0 ? (
        <EmptyState
          title="No orders yet"
          description= {canWrite ? "Record your first customer order — receiving will decrement derived stock on posting." : "The sales team records orders here after you sign in."}
          action={canWrite ? { label: "Record first order", onClick: () => setCreating(true) } : undefined}
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-2">Order no</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="hidden px-4 py-2 sm:table-cell">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2 font-mono">{o.order_no}</td>
                  <td className="px-4 py-2">{o.customers?.name ?? "—"}</td>
                  <td className="px-4 py-2"><Badge tone={statusTone[o.status]}>{o.status}</Badge></td>
                  <td className="px-4 py-2 text-right tabular">{php.format(o.total_cents / 100)}</td>
                  <td className="hidden px-4 py-2 tabular text-muted sm:table-cell">{o.order_date}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setViewing(o)}
                      className="text-xs text-accent underline-offset-2 hover:underline">View items</button>
                    {o.status === "draft" && canWrite && (
                      <>
                        <button type="button" disabled={post.isPending}
                          onClick={() => post.mutate(o.id)}
                          className="ml-3 text-xs text-accent underline-offset-2 hover:underline">Post</button>
                        {profile?.role === "admin" && (
                          <button type="button" disabled={cancel.isPending}
                            onClick={() => cancel.mutate(o.id)}
                            className="ml-3 text-xs text-danger underline-offset-2 hover:underline">Cancel</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(central || viewing !== null) && (
        central ? (
          <OrderFormDialog
            onClose={() => setCreating(false)}
          />
        ) : (
          <OrderItemsDialog order={viewing as SalesOrderRow} onClose={() => setViewing(null)} />
        )
      )}
      {!session && <span />}
    </div>
  )
}
