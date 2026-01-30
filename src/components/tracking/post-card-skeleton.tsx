import { Skeleton } from '@/components/ui/skeleton'

interface PostCardSkeletonProps {
  count?: number
}

export function PostCardSkeleton({ count = 1 }: PostCardSkeletonProps) {
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

            {/* Author handle placeholder */}
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Brand placeholder (hidden on mobile) */}
            <div className="hidden sm:block">
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Status badge placeholder */}
            <Skeleton className="h-6 w-20 rounded-full" shape="rect" />

            {/* Timestamp placeholder (hidden on mobile) */}
            <div className="hidden sm:block">
              <Skeleton className="h-3 w-24" />
            </div>

            {/* Expand icon placeholder */}
            <Skeleton className="w-4 h-4 rounded" shape="rect" />
          </div>
        </div>
      ))}
    </>
  )
}
