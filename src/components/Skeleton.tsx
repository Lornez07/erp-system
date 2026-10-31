interface ListSkeletonProps {
  rows?: number
}

/** Table-shaped loading placeholder — matches data-table rhythm, no layout shift. */
export function ListSkeleton({ rows = 5 }: ListSkeletonProps) {
  const rowDelays = Array.from({ length: rows }).map((_, i) => i * 60)
  const badgeDelays = [0, 90, 180, 270, 360]
  return (
    <div
      className="divide-y divide-line border border-line bg-surface"
      style={{ borderRadius: 'var(--radius-card)' }}
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center gap-4 border-b border-line px-4 py-2">
        <div className="h-3 w-24 animate-pulse bg-line" />
        <div className="hidden h-3 w-16 animate-pulse bg-line sm:block" />
        <div className="ml-auto h-3 w-16 animate-pulse bg-line" />
      </div>
      {rowDelays.map((delay, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="h-3 flex-1 animate-pulse bg-line" style={{ animationDelay: delay + 'ms' }} />
          <div className="hidden h-3 w-16 animate-pulse bg-line sm:block" />
          <div className="h-3 w-20 animate-pulse bg-line" style={{ animationDelay: (badgeDelays[i % 5] || 0) + 'ms' }} />
        </div>
      ))}
    </div>
  )
}
