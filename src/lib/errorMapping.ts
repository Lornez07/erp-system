import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Map Postgres/PostgREST errors to user-friendly English messages.
 * Never exposes raw DB internals (constitution rule).
 */
export function mapDbError(err: PostgrestError | { code?: string; message?: string } | unknown): string {
  const e = err as { code?: string; message?: string } | null
  const code = e?.code ?? ''
  const message = e?.message ?? ''

  if (message.includes('INSUFFICIENT_STOCK')) {
    return 'Order exceeds stocked quantity. Reduce the quantity or save as draft.'
  }
  switch (code) {
    case '23505':
      return 'That value already exists — SKUs and order numbers must be unique.'
    case '23503':
      return 'This record is used by existing orders — deactivate it instead of deleting.'
    case '23514':
      return 'Check the quantities and amounts — one value is invalid.'
    case '42501':
      return "You don't have permission for this action. Ask the admin."
    default:
      return 'Database operation failed — try again.'
  }
}
