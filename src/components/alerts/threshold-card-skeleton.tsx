import { Skeleton } from '@/components/ui/skeleton'

interface ThresholdCardSkeletonProps {
  count?: number
}

function ThresholdCardSkeletonItem() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Metric icon circle */}
        <Skeleton shape="circle" className="w-9 h-9 flex-shrink-0" />

        {/* Center content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton shape="line" className="h-4 w-32" />
            <Skeleton shape="rect" className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton shape="line" className="h-3 w-24" />
        </div>

        {/* Right: toggle + delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Skeleton shape="rect" className="h-5 w-9 rounded-full" />
          <Skeleton shape="rect" className="h-6 w-6 rounded" />
        </div>
      </div>

      {/* Bottom: last triggered */}
      <div className="mt-3">
        <Skeleton shape="line" className="h-3 w-36" />
      </div>
    </div>
  )
}

export function ThresholdCardSkeleton({ count = 3 }: ThresholdCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ThresholdCardSkeletonItem key={i} />
      ))}
    </>
  )
}
