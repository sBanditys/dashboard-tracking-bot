/**
 * Skeleton loading card that matches the collapsed RoundCard dimensions.
 * Displays pulse animation while bonus rounds are loading.
 */
export function RoundCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between">
        {/* Left: date range + amount */}
        <div className="space-y-2">
          <div className="h-4 bg-surface-hover rounded w-40" />
          <div className="h-4 bg-surface-hover rounded w-24" />
        </div>

        {/* Right: target indicators + status badge */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-5 w-5 bg-surface-hover rounded-full" />
            ))}
          </div>
          <div className="h-6 bg-surface-hover rounded w-16" />
        </div>
      </div>
    </div>
  )
}
