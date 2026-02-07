import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LeaderboardSkeletonProps {
  count?: number
  className?: string
}

/**
 * Loading skeleton for Leaderboard component.
 * Matches the structure with header and row skeletons.
 */
export function LeaderboardSkeleton({
  count = 5,
  className,
}: LeaderboardSkeletonProps) {
  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      {/* Header skeleton */}
      <Skeleton className="h-6 w-40 mb-4" />

      {/* Column headers skeleton */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 pb-3 border-b border-border mb-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>

      {/* Row skeletons */}
      <div className="space-y-0">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 py-3 border-b border-border last:border-0 items-center"
          >
            <Skeleton shape="circle" className="h-6 w-6" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
