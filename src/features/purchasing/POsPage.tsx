import { useState } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { mapDbError } from '../../lib/errorMapping'
import { usePOs, useApprovePO, useReceivePO, type PurchaseOrderRow } from './queries'
import { php } from '../inventory/schema'
import { POFormDialog } from './POFormDialog'
import { POItemsDialog } from './POItemsDialog'

type Status = PurchaseOrderRow["status"]

const toneOf = (s: Status): "neutral" | "ok" | "low" =>
  s === "received" ? "ok" : s === "cancelled" ? "low" : "neutral"

export function POsPage() {
  const { profile } = useAuth()
  const canWrite = profile?.role === "admin" || profile?.role === "purchasing"
  const { data: pos, isPending, isError, error, refetch } = usePOs()
  const approve = useApprovePO()
  const receive = useReceivePO()
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrderRow | null>(null)

  if (isError) {
    return (
      <div>
        <ModuleHeader code="pch / orders" title="Purchasing" />
        <EmptyState title="Could not load POs" description={mapDbError(error)}
          action={{ label: "Retry", onClick: () => void refetch() }} />
      </div>
    )
  }

  return (
    <div>
      <ModuleHeader code="pch / orders" title="Purchasing" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {(pos ?? []).length} recent POs
          <span className="mx-2 text-muted">·</span>
          <Link to="/purchasing/suppliers" className="text-accent underline-offset-2 hover:underline">Suppliers</Link>
        </p>
        {canWrite && (
          <button type="button" onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-sm font-medium text-white"
            style={{ borderRadius: "var(--radius-card)", backgroundColor: "var(--color-accent)" }}>
            New PO
          </button>
        )}
      </div>

      {isPending ? (
        <ListSkeleton rows={6} />
      ) : (pos ?? []).length === 0 ? (
        <EmptyState
          title="No POs yet"
          description={canWrite ? "Create your first PO to a supplier — receiving it raises stock and syncs product costs." : "The purchasing team records POs here."}
          action={canWrite ? { label: "Create first PO", onClick: () => setCreating(true) } : undefined}
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-2">PO no</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="hidden px-4 py-2 sm:table-cell">Received</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(pos ?? []).map((p) => (
                <tr key={p.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-2 font-mono">{p.order_no}</td>
                  <td className="px-4 py-2">{p.suppliers?.name ?? "—"}</td>
                  <td className="px-4 py-2"><Badge tone={toneOf(p.status)}>{p.status}</Badge></td>
                  <td className="px-4 py-2 text-right tabular">{php.format(p.total_cents / 100)}</td>
                  <td className="hidden px-4 py-2 tabular text-muted sm:table-cell">{p.received_at ? p.received_at.slice(0, 10) : "—"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setViewing(p)}
                      className="text-xs text-accent underline-offset-2 hover:underline">View items</button>
                    {canWrite && p.status === "draft" && (
                      <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(p.id)}
                        className="ml-3 text-xs text-accent underline-offset-2 hover:underline">Approve</button>
                    )}
                    {canWrite && p.status === "approved" && (
                      <button type="button" disabled={receive.isPending} onClick={() => receive.mutate(p.id)}
                        className="ml-3 text-xs text-accent underline-offset-2 hover:underline">Receive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <POFormDialog onClose={() => setCreating(false)} />}
      {!creating && viewing !== null && <POItemsDialog po={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
