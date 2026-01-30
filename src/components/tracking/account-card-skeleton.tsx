import { Skeleton } from '@/components/ui/skeleton'

interface AccountCardSkeletonProps {
  count?: number
}

export function AccountCardSkeleton({ count = 1 }: AccountCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-lg p-4"
        >
          <div className="flex items-center gap-4">
            {/* Platform Icon placeholder */}
            <Skeleton className="w-6 h-6 rounded" shape="rect" />

            {/* Username placeholder */}
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Brand placeholder (hidden on mobile) */}
            <div className="hidden sm:block">
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Status badge placeholder */}
            <Skeleton className="h-6 w-16 rounded-full" shape="rect" />

            {/* Expand icon placeholder */}
            <Skeleton className="w-4 h-4 rounded" shape="rect" />
          </div>
        </div>
      ))}
    </>
  )
}
