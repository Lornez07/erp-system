import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { mapDbError } from '../../lib/errorMapping'
import { useToast } from '../../components/toast-api'

export interface SupplierRow { id: number; name: string; contact_person: string | null; phone: string | null; email: string | null }
export interface PurchaseOrderRow {
  id: number
  order_no: string
  status: "draft" | "approved" | "received" | "cancelled"
  total_cents: number
  created_at: string
  received_at: string | null
  suppliers: { name: string } | null
}
export interface PoItemRow {
  id: number
  qty: number
  unit_cost_cents: number
  line_total_cents: number
  products: { sku: string; name: string } | null
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name, contact_person, phone, email").order("name")
      if (error) throw error
      return (data ?? []) as SupplierRow[]
    },
  })
}

export function useAddSupplier() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (v: { name: string; contact_person?: string; phone?: string; email?: string }) => {
      const { error } = await supabase.from("suppliers").insert(v)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["suppliers"] })
      show("Supplier added.", "success")
    },
    onError: (err) => show(mapDbError(err), "error")
  })
}

export async function fetchPOs(): Promise<PurchaseOrderRow[]> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, order_no, status, total_cents, created_at, received_at, suppliers(name)")
    .order("id", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as unknown as PurchaseOrderRow[]
}

export function usePOs() {
  return useQuery({ queryKey: ["purchase-orders"], queryFn: fetchPOs })
}

export function useCreatePO(
  sessionUser: string | null,
  onReady: (orderNo: string, id: number) => void,
) {
  const { show } = useToast()
  return useMutation({
    mutationFn: async (args: { supplierId: number; items: Array<{ product_id: number; qty: number; unit_cost: number }> }) => {
      if (!sessionUser) throw new Error("Not signed in")
      const year = new Date().getFullYear()
      const { data: orderNo, error: noErr } = await supabase.rpc("make_order_no", { prefix: "PO", p_year: year })
      if (noErr) throw noErr
      const { data: po, error: oErr } = await supabase
        .from("purchase_orders")
        .insert({
          order_no: orderNo,
          supplier_id: args.supplierId,
          status: "draft",
          created_by: sessionUser,
        })
        .select("id")
        .single()
      if (oErr) throw oErr
      const poId = po.id as number
      const { error: iErr } = await supabase.from("purchase_order_items").insert(
        args.items.map((it) => ({
          po_id: poId,
          product_id: it.product_id,
          qty: it.qty,
          unit_cost_cents: Math.round(Number(it.unit_cost) * 100),
          line_total_cents: it.qty * Math.round(Number(it.unit_cost) * 100),
        }))
      )
      if (iErr) throw iErr
      return { poId, orderNo: orderNo as string }
    },
    onError: (err) => show(mapDbError(err), "error")
    , onSuccess: (res) => { onReady(res.orderNo, res.poId) },
  })
}

export function useApprovePO() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (poId: number) => {
      const { error } = await supabase.from("purchase_orders").update({ status: "approved" }).eq("id", poId).eq("status", "draft")
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      show("PO approved — ready to receive.", "success")
    },
    onError: (err) => show(mapDbError(err), "error")
  })
}

export function useReceivePO() {
  const qc = useQueryClient()
  const { show } = useToast()
  return useMutation({
    mutationFn: async (poId: number) => {
      const { error } = await supabase.rpc("receive_purchase_order", { p_po_id: poId })
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["purchase-orders"] })
      void qc.invalidateQueries({ queryKey: ["products"] })
      void qc.invalidateQueries({ queryKey: ["products-lite"] })
      show("PO received — stock movements appended and product costs synced.", "success")
    },
    onError: (err) => show(mapDbError(err), "error")
  })
}

export function useProductsForPO() {
  return useQuery({
    queryKey: ["products-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, sku, name, cost_cents, price_cents").eq("is_active", true).order("sku")
      if (error) throw error
      return data ?? []
    },
  })
}
export function usePOItems(poId: number | null) {
  return useQuery({
    queryKey: ["po-items", poId],
    enabled: poId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("id, qty, unit_cost_cents, line_total_cents, products(sku, name)")
        .eq("po_id", poId as number)
      if (error) throw error
      return (data ?? []) as unknown as PoItemRow[]
    },
  })
}
