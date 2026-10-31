import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

/** Empty states explain the next action (design-anchor.md content rule). */
export function EmptyState({ title, description, action, children }: Props) {
  return (
    <section
      className="border border-dashed border-line bg-surface px-6 py-10 text-center"
      style={{ borderRadius: 'var(--radius-card)' }}
    >
      <div
        className="mx-auto mb-3 h-8 w-8 border-2 border-line"
        style={{ borderRadius: 'var(--radius-badge)' }}
        aria-hidden="true"
      />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium text-white"
          style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent)' }}
        >
          {action.label}
        </button>
      )}
      {children}
    </section>
  )
}
