import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { useAddCategory, useCategories } from './queries'
import { categoryFormSchema, formToObject } from './schema'

export function CategoriesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { data: categories, isPending } = useCategories()
  const add = useAddCategory()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = categoryFormSchema.safeParse(formToObject(new FormData(e.currentTarget)))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid category name')
      return
    }
    setError(null)
    add.mutate(parsed.data.name)
    e.currentTarget.reset()
  }

  return (
    <div>
      <ModuleHeader code="inv / categories" title="Categories" />
      <p className="mb-4 text-sm text-muted">
        <Link to="/inventory" className="text-accent underline-offset-2 hover:underline">← Back to products</Link>
      </p>
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="max-w-md space-y-4">
          {isAdmin && (
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="cat-name" className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
                  New category name
                </label>
                <input id="cat-name" name="name" required placeholder="Fasteners" maxLength={40}
                  className="w-full border border-line bg-surface px-2 py-1.5 text-sm"
                  style={{ borderRadius: 'var(--radius-card)' }} />
              </div>
              <button type="submit" disabled={add.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent)' }}>
                Add
              </button>
            </form>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
          {(categories ?? []).length === 0 ? (
            <EmptyState
              title="No categories yet"
              description={isAdmin ? 'Add the first category above — products group by category in the inventory list.' : 'The admin has not created categories yet.'}
            />
          ) : (
            <ul className="divide-y divide-line border border-line bg-surface" style={{ borderRadius: 'var(--radius-card)' }}>
              {(categories ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{c.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
