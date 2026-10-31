import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { useAddSupplier, useSuppliers } from './queries'
import { formToObject } from '../inventory/schema'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name too long'),
  contact_person: z.string().trim().max(60).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

export function SuppliersPage() {
  const { profile } = useAuth()
  const canWrite = profile?.role === "admin" || profile?.role === "purchasing"
  const { data: suppliers, isPending } = useSuppliers()
  const add = useAddSupplier()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = supplierSchema.safeParse(formToObject(new FormData(e.currentTarget)))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid supplier")
      return
    }
    setError(null)
    add.mutate(parsed.data)
    e.currentTarget.reset()
  }

  return (
    <div>
      <ModuleHeader code="pch / suppliers" title="Suppliers" />
      <p className="mb-4 text-sm text-muted">
        <Link to="/purchasing" className="text-accent underline-offset-2 hover:underline">← Back to POs</Link>
      </p>
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="max-w-xl space-y-4">
          {canWrite && (
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <label htmlFor="s-name" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Name</label>
                <input id="s-name" name="name" required placeholder="IJ Supply & Sales" className="w-full border border-line bg-surface px-2 py-1.5 text-sm" style={{ borderRadius: "var(--radius-card)" }} />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="s-contact" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Contact</label>
                <input id="s-contact" name="contact_person" placeholder="Robby Gonzales" className="w-full border border-line bg-surface px-2 py-1.5 text-sm" style={{ borderRadius: "var(--radius-card)" }} />
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="s-phone" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">Phone</label>
                <input id="s-phone" name="phone" placeholder="0929 000 0000" className="w-full border border-line bg-surface px-2 py-1.5 text-sm tabular" style={{ borderRadius: "var(--radius-card)" }} />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={add.isPending}
                  className="w-full px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-card)", backgroundColor: "var(--color-accent)" }}>Add</button>
              </div>
              {error && <p className="text-xs text-danger sm:col-span-4">{error}</p>}
            </form>
          )}
          {(suppliers ?? []).length === 0 ? (
            <EmptyState title="No suppliers yet"
              description={canWrite ? "Add your first supplier above — POs reference these records." : "Purchasing has not recorded suppliers yet."} />
          ) : (
            <ul className="divide-y divide-line border border-line bg-surface" style={{ borderRadius: "var(--radius-card)" }}>
              {(suppliers ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>{s.name}{s.contact_person ? <span className="text-xs text-muted"> · {s.contact_person}</span> : null}</span>
                  <span className="text-xs text-muted tabular">{s.phone ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
