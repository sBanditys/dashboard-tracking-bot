interface GroupCardSkeletonProps {
  count?: number
}

function SingleGroupCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {/* Group name + brand */}
      <div className="mb-3 space-y-1.5">
        <div className="h-4 w-32 bg-surface-hover rounded animate-pulse" />
        <div className="h-3 w-20 bg-surface-hover rounded animate-pulse" />
      </div>

      {/* Stacked avatars */}
      <div className="flex items-center mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-surface-hover animate-pulse border-2 border-surface"
            style={{ marginLeft: i === 0 ? 0 : '-8px' }}
          />
        ))}
      </div>

      {/* Total followers */}
      <div className="mb-2">
        <div className="h-8 w-28 bg-surface-hover rounded animate-pulse" />
        <div className="h-3 w-20 bg-surface-hover rounded animate-pulse mt-1" />
      </div>

      {/* Growth rows */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3 w-12 bg-surface-hover rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface-hover rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-12 bg-surface-hover rounded animate-pulse" />
          <div className="h-3 w-20 bg-surface-hover rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function GroupCardSkeleton({ count = 1 }: GroupCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SingleGroupCardSkeleton key={i} />
      ))}
    </>
  )
}
