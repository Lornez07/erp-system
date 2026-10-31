import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'

export interface StatTile {
  label: string
  value: string
  detail: string
}
export interface LowStockRow {
  product_id: number
  sku: string
  name: string
  stock: number
  reorder_point: number
  is_low: boolean
}
export interface RecentOrderRow {
  id: number
  order_no: string
  status: "draft" | "posted" | "cancelled"
  total_cents: number
  order_date: string
  customers: { name: string } | null
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      
      const todaySales = await supabase
        .from("sales_orders")
        .select("total_cents")
        .eq("status", "posted")
        .eq("order_date", today)
        .then((r) => { if (r.error) throw r.error; return (r.data ?? []).reduce((s, row) => s + (row.total_cents as number), 0) })

      const [drafts, approvedPOs, lowStock, recentOrders] = await Promise.all([
        supabase
          .from("sales_orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft")
          .then((r) => { if (r.error) throw r.error; return r.count ?? 0 }),
          supabase
          .from("purchase_orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .then((r) => { if (r.error) throw r.error; return r.count ?? 0 }),
        supabase
          .from("v_product_stock")
          .select("product_id, sku, name, stock, reorder_point")
          .eq("is_low", true)
          .order("stock", { ascending: true })
          .limit(5)
          .then((r) => { if (r.error) throw r.error; return r.data as unknown as LowStockRow[] }),
        supabase
          .from("sales_orders")
          .select("id, order_no, status, total_cents, order_date, customers(name)")
          .order("id", { ascending: false })
          .limit(5)
          .then((r) => { if (r.error) throw r.error; return r.data as unknown as RecentOrderRow[] }),
      ])

      return { todaySales, drafts, approvedPOs, lowStock, recentOrders }
    },
  })
}
