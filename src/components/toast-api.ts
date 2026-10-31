import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

export interface ToastApi {
  show: (message: string, kind?: ToastKind) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

// colocated in the api module so fast-refresh keeps Toast.tsx
// component-only (react/only-export-components)
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
