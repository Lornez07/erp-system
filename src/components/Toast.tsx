import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toast-api'
import type { ToastItem, ToastKind } from './toast-api'

const barColor: Record<ToastKind, string> = {
  success: 'var(--color-accent)',
  error: 'var(--color-danger)',
  info: 'var(--color-muted)',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* bottom-right on desktop; stacked above the mobile bottom nav */}
      <div className="fixed bottom-20 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 md:bottom-4 md:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex items-stretch overflow-hidden border border-line bg-surface shadow-md"
            style={{ borderRadius: 'var(--radius-card)' }}
          >
            <div className="w-1 shrink-0" style={{ backgroundColor: barColor[t.kind] }} />
            <p className="px-3 py-2 text-sm">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
