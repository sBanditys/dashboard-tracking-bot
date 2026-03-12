interface AccountCardSkeletonProps {
  count?: number
}

function SingleAccountCardSkeleton() {
  return (
    <div className="bg-[#2d2d2d] border border-[#404040] rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Profile photo skeleton */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#404040] animate-pulse" />

        {/* Username + platform skeleton */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-28 bg-[#404040] rounded animate-pulse" />
            <div className="h-3.5 w-7 bg-[#404040] rounded animate-pulse" />
          </div>
        </div>

        {/* Follower count + growth skeleton */}
        <div className="flex-shrink-0 text-right space-y-1">
          <div className="h-4 w-20 bg-[#404040] rounded animate-pulse ml-auto" />
          <div className="h-3 w-16 bg-[#404040] rounded animate-pulse ml-auto" />
        </div>

        {/* Sparkline skeleton */}
        <div className="flex-shrink-0 w-20 h-8 bg-[#404040] rounded animate-pulse" />
      </div>
    </div>
  )
}

export function AccountCardSkeleton({ count = 1 }: AccountCardSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SingleAccountCardSkeleton key={i} />
      ))}
    </div>
  )
}
