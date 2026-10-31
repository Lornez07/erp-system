import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapDbError } from '../../lib/errorMapping'
import { useToast } from '../../components/toast-api'
import { pesosToCents, type ProductFormValues } from './schema'

export interface CategoryRow {
  id: number
  name: string
  slug: string
}
export interface ProductRow {
  id: number
  sku: string
  name: string
  unit: string
  cost_cents: number
  price_cents: number
  reorder_point: number
  is_active: boolean
  categories: { name: string } | null
}
export interface StockRow {
  product_id: number
  stock: number
  is_low: boolean
}

const PRODUCT_SELECT = 'id, sku, name, unit, cost_cents, price_cents, reorder_point, is_active, categories(name)'

export async function fetchProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('sku')
  if (error) throw error
  return (data ?? []) as unknown as ProductRow[]
}

export async function fetchStocks(): Promise<StockRow[]> {
  const { data, error } = await supabase
    .from('v_product_stock')
    .select('product_id, stock, is_low')
  if (error) throw error
  return data ?? []
}

export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  if (error) throw error
  return data ?? []
}

export function useProductsAndStock() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const [products, stocks] = await Promise.all([fetchProducts(), fetchStocks()])
      const stockByProduct = new Map(stocks.map((s) => [s.product_id, s]))
      return { products, stockByProduct }
    },
  })
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
}

/** Form submit -> upsert; converts pesos inputs to centavos */
export function useSaveProduct(onDone: () => void) {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (args: { values: ProductFormValues; productId?: number }) => {
      const { values, productId } = args
      const row = {
        sku: values.sku,
        name: values.name,
        category_id: values.category_id,
        unit: values.unit,
        cost_cents: pesosToCents(values.cost),
        price_cents: pesosToCents(values.price),
        reorder_point: values.reorder_point,
      }
      const q = productId
        ? supabase.from('products').update(row).eq('id', productId)
        : supabase.from('products').insert(row)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] })
      show('Product saved. Stock stays derived from its movement history.', 'success')
      onDone()
    },
    onError: (err) => show(mapDbError(err), 'error'),
  })
}

export function useDeactivateProduct() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (args: { productId: number; activate: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: args.activate })
        .eq('id', args.productId)
      if (error) throw error
    },
    onSuccess: (_res, args) => {
      void qc.invalidateQueries({ queryKey: ['products'] })
      show(args.activate ? 'Product reactivated.' : 'Product deactivated — it stays in history with its orders (FK-safe).', 'success')
    },
    onError: (err) => show(mapDbError(err), 'error'),
  })
}

export function useAddCategory() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (name: string) => {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      if (!slug) throw { code: '23514', message: 'invalid slug' }
      const { error } = await supabase.from('categories').insert({ name: name.trim(), slug })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      show('Category added.', 'success')
    },
    onError: (err) => show(mapDbError(err), 'error'),
  })
}
