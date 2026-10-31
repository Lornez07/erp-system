import { useState } from 'react'
import { Link } from 'react-router'
import { ModuleHeader } from '../../components/ModuleHeader'
import { Badge } from '../../components/Badge'
import { EmptyState } from '../../components/EmptyState'
import { ListSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/auth-context'
import { mapDbError } from '../../lib/errorMapping'
import { useDeactivateProduct, useProductsAndStock, type ProductRow } from './queries'
import { php } from './schema'
import { ProductFormDialog } from './ProductFormDialog'

type StockRow = { product_id: number; stock: number; is_low: boolean }

export function ProductsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { data, isPending, isError, error, refetch } = useProductsAndStock()
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [creating, setCreating] = useState(false)
  const deactivate = useDeactivateProduct()
  const [showInactive, setShowInactive] = useState(false)

  if (isError) {
    return (
      <div>
        <ModuleHeader code="inv / products" title="Inventory" />
        <EmptyState
          title="Could not load products"
          description={mapDbError(error)}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      </div>
    )
  }

  const products = (data?.products ?? []).filter((p) => showInactive || p.is_active)
  const lowCount = (data?.products ?? []).filter((p) => data?.stockByProduct.get(p.id)?.is_low && p.is_active).length

  return (
    <div>
      <ModuleHeader code="inv / products" title="Inventory" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {products.length} products · <span className="font-mono">{lowCount} LOW</span>
          <span className="mx-2 text-muted">·</span>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <span className="mx-2 text-muted">·</span>
          <Link to="/inventory/categories" className="text-accent underline-offset-2 hover:underline">
            Categories
          </Link>
        </p>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-sm font-medium text-white"
            style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent)' }}
          >
            New product
          </button>
        )}
      </div>

      {isPending ? (
        <ListSkeleton rows={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description={
            isAdmin
              ? 'Add your first product — stock starts at zero from its empty movement history. Next: receive stock via Purchasing.'
              : 'No products yet. The admin adds products; purchases then stock them.'
          }
          action={isAdmin ? { label: 'Add first product', onClick: () => setCreating(true) } : undefined}
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-surface" style={{ borderRadius: 'var(--radius-card)' }}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Name</th>
                <th className="hidden px-4 py-2 sm:table-cell">Category</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Cost</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="hidden px-4 py-2 lg:table-cell">Reorder</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = data?.stockByProduct.get(p.id) as StockRow | undefined
                return (
                  <tr key={p.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2 font-mono">{p.sku}</td>
                    <td className="px-4 py-2">
                      {p.name}
                      {!p.is_active && <span className="ml-2 font-mono text-[10px] uppercase text-muted">inactive</span>}
                    </td>
                    <td className="hidden px-4 py-2 text-muted sm:table-cell">{p.categories?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular">
                      <span className="mr-2">{stock?.stock ?? 0}</span>
                      {stock?.is_low && <Badge tone="low">LOW</Badge>}
                    </td>
                    <td className="px-4 py-2 text-right tabular">{php.format(p.cost_cents / 100)}</td>
                    <td className="px-4 py-2 text-right tabular">{php.format(p.price_cents / 100)}</td>
                    <td className="hidden px-4 py-2 text-right tabular lg:table-cell">{p.reorder_point}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {isAdmin && (
                        <>
                          <button type="button" onClick={() => setEditing(p)}
                            className="text-xs text-accent underline-offset-2 hover:underline">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deactivate.mutate({ productId: p.id, activate: !p.is_active })}
                            disabled={deactivate.isPending}
                            className="ml-3 text-xs text-danger underline-offset-2 hover:underline"
                          >
                            {p.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing !== null) && (
        <ProductFormDialog
          existing={editing ?? undefined}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
