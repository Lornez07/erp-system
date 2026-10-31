import { z } from 'zod'

export const orderFormSchema = z.object({
  customer_id: z.coerce.number().int().positive('Pick a customer'),
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    qty: z.coerce.number().int().min(1, 'Qty must be at least 1'),
    unit_price: z.coerce.number().min(0, 'Price must be 0 or more'),
})).min(1, "Add at least one line item"),
}).superRefine((val, ctx) => {
  const seen = new Set<number>()
  val.items.forEach((item, idx) => {
    if (seen.has(item.product_id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['items', idx, 'product_id'],
        message: 'Same product twice — merge lines',
      })
    }
    seen.add(item.product_id)
  })
})

export type OrderFormValues = z.infer<typeof orderFormSchema>

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name too long'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').max(120).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
})
