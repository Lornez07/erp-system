import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { useAddCustomer, useCustomers } from './queries'
import { customerFormSchema } from './schema'
import { formToObject } from '../inventory/schema'

export function CustomersPage() {
  const { profile } = useAuth()
  const canWrite = profile?.role === "admin" || profile?.role === "sales"
  const { data: customers, isPending } = useCustomers()
  const add = useAddCustomer()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = customerFormSchema.safeParse(formToObject(new FormData(e.currentTarget)))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid customer")
      return
    }
    setError(null)
    add.mutate(parsed.data)
    e.currentTarget.reset()
  }

  return (
    <div>
      <ModuleHeader code="sls / customers" title="Customers" />
      <p className="mb-4 text-sm text-muted">
        <Link to="/sales" className="text-accent underline-offset-2 hover:underline">← Back to orders</Link>
      </p>
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="max-w-xl space-y-4">
          {canWrite && (
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label htmlFor="c-name" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Name</label>
                <input id="c-name" name="name" required placeholder="Mang Inasal Delgado" className="w-full border border-line bg-surface px-2 py-1.5 text-sm" style={{ borderRadius: "var(--radius-card)" }} />
              </div>
              <div>
                <label htmlFor="c-phone" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Phone</label>
                <input id="c-phone" name="phone" placeholder="0917 000 0000" className="w-full border border-line bg-surface px-2 py-1.5 text-sm tabular" style={{ borderRadius: "var(--radius-card)" }} />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={add.isPending}
                  className="w-full px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-card)", backgroundColor: "var(--color-accent)" }}>Add</button>
              </div>
              {error && <p className="text-xs text-danger sm:col-span-4">{error}</p>}
            </form>
          )}
          {(customers ?? []).length === 0 ? (
            <EmptyState title="No customers yet"
              description={canWrite ? "Add the first customer above — orders reference these records." : "The sales team has not recorded customers yet."} />
          ) : (
            <ul className="divide-y divide-line border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
              {(customers ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted tabular">{c.phone ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
