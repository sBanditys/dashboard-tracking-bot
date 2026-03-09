import { Skeleton } from '@/components/ui/skeleton'

export function CampaignCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      {/* Top row: title + badge */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Info row */}
      <div className="flex items-center gap-4 mt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Date */}
      <Skeleton className="h-3 w-24 mt-1" />
    </div>
  )
}
