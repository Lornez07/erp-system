import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { mapDbError } from '../../lib/errorMapping'
import { useToast } from '../../components/toast-api'
import { pesosToCents } from '../inventory/schema'
import type { OrderFormValues } from './schema'

export interface CustomerRow { id: number; name: string; phone: string | null; email: string | null }
export interface SalesOrderRow { id: number; order_no: string; status: "draft" | "posted" | "cancelled"; total_cents: number; order_date: string; customers: { name: string } | null }
export interface OrderItemRow { id: number; qty: number; unit_price_cents: number; line_total_cents: number; products: { sku: string; name: string } | null }
export interface MovementRow { id: number; qty_signed: number; created_at: string; products: { sku: string } | null }

// ponytail: draft creation is two REST calls (order, then items) — collapse into one RPC in the hardening pass
export function useCreateDraftOrder(session: Session | null, onReady: (orderId: number, orderNo: string) => void) {
  const { show } = useToast()
  return useMutation({
    mutationFn: async (values: OrderFormValues) => {
      if (!session?.user?.id) throw new Error("Not signed in")
      const year = new Date().getFullYear()
      const { data: orderNo, error: noErr } = await supabase.rpc("make_order_no", { prefix: "SO", p_year: year })
      if (noErr) throw noErr
      const { data: order, error: oErr } = await supabase
        .from("sales_orders")
        .insert({
          order_no: orderNo,
          customer_id: values.customer_id,
          status: "draft",
          order_date: new Date().toISOString().slice(0, 10),
          created_by: session.user.id,
        })
        .select("id")
        .single()
      if (oErr) throw oErr
      const orderId = order.id as number
      const { error: iErr } = await supabase.from("sales_order_items").insert(
        values.items.map((it) => ({
          order_id: orderId,
          product_id: it.product_id,
          qty: it.qty,
          unit_price_cents: pesosToCents(it.unit_price),
          line_total_cents: it.qty * pesosToCents(it.unit_price),
        }))
      )
      if (iErr) throw iErr
      return { orderId, orderNo }
    },
    onError: (err) => show(mapDbError(err), "error"),
    onSuccess: (res) => onReady(res.orderId, res.orderNo),
  })
}
// onPosted: dialog close happens only after the post RPC settles (success or fail)
export function usePostOrder(onPosted?: (orderId: number) => void) {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { error } = await supabase.rpc("post_sales_order", { p_order_id: orderId })
      if (error) throw error
    },
    onSuccess: (_res, orderId) => {
      void qc.invalidateQueries({ queryKey: ["sales-orders"] })
      void qc.invalidateQueries({ queryKey: ["products"] })
      show("Order #" + orderId + " posted — stock movements recorded atomically.", "success")
    },
    onError: (err) => show(mapDbError(err), "error"),
    // close the dialog whether the post succeeded or failed cleanly
    onSettled: (_res, _err, orderId) => {
      void qc.invalidateQueries({ queryKey: ["sales-orders"] })
      onPosted?.(orderId)
    },
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { error } = await supabase.from("sales_orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "draft")
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["sales-orders"] })
      show("Order cancelled (draft).", "info")
    },
    onError: (err) => show(mapDbError(err), "error")
  })
}

export async function fetchOrders(): Promise<SalesOrderRow[]> {
  const { data, error } = await supabase
    .from("sales_orders")
    .select("id, order_no, status, total_cents, order_date, customers(name)")
    .order("id", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as unknown as SalesOrderRow[]
}

export function useOrders() {
  return useQuery({ queryKey: ["sales-orders"], queryFn: fetchOrders })
}

export function useOrderItems(orderId: number | null) {
  return useQuery({
    queryKey: ["sales-order-items", orderId],
    enabled: orderId != null,
    queryFn: async () => {
      const itemsRes = await supabase
        .from("sales_order_items")
        .select("id, qty, unit_price_cents, line_total_cents, products(sku, name)")
        .eq("order_id", orderId as number)
      if (itemsRes.error) throw itemsRes.error
      const movRes = await supabase
        .from("stock_movements")
        .select("id, qty_signed, created_at, products(sku)")
        .eq("ref_type", "sales_order")
        .eq("ref_id", orderId as number)
      if (movRes.error) throw movRes.error
      return {
        items: itemsRes.data as unknown as OrderItemRow[],
        movements: movRes.data as unknown as MovementRow[],
      }
    },
  })
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name, phone, email").order("name")
      if (error) throw error
      return (data ?? []) as CustomerRow[]
    },
  })
}

export function useAddCustomer() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (v: { name: string; phone?: string; email?: string; address?: string }) => {
      const { error } = await supabase.from("customers").insert(v)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["customers"] })
      show("Customer added.", "success")
    },
    onError: (err) => show(mapDbError(err), "error")
  })
}

export function useProductsLite() {
  return useQuery({
    queryKey: ["products-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, sku, name, price_cents").eq("is_active", true).order("sku")
      if (error) throw error
      return data ?? []
    },
  })
}
