import type { ReactNode } from 'react'

type Tone = 'neutral' | 'low' | 'ok'

const toneStyles: Record<Tone, string> = {
  neutral: 'border-line text-muted',
  low: 'border-danger text-danger bg-surface',
  ok: 'border-accent text-accent bg-accent-soft',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const cls =
    'inline-block border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ' +
    toneStyles[tone]
  return (
    <span
      className={cls}
      style={{ borderRadius: 'var(--radius-badge)' }}
    >
      {children}
    </span>
  )
}
