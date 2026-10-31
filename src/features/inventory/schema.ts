import { z } from 'zod'

/** Pesos -> integer centavos (money is never a float in this system) */
export function pesosToCents(input: string | number): number {
  return Math.round(Number(input) * 100)
}
export function centsToPesos(cents: number): string {
  return (cents / 100).toFixed(2)
}

/** FormData -> plain object (avoids requiring DOM.Iterable in tsconfig libs) */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  fd.forEach((value, key) => {
    out[key] = typeof value === 'string' ? value : ''
  })
  return out
}

export const php = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export const productFormSchema = z.object({
  sku: z.string().regex(/^[A-Z0-9-]{2,24}$/, 'SKU must be 2-24 chars: A-Z, 0-9, dashes'),
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name too long'),
  category_id: z.coerce.number().int().positive('Pick a category'),
  unit: z.enum(['pcs', 'box', 'pack', 'kg'], { message: 'Pick a unit' }),
  cost: z.coerce.number().min(0, 'Cost must be 0 or more'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  reorder_point: z.coerce.number().int().min(0, 'Reorder point must be 0 or more'),
}) .refine((v) => pesosToCents(v.price) >= pesosToCents(v.cost), {
  message: 'Price must be at least equal to cost',
  path: ['price'],
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Name too long'),
})
