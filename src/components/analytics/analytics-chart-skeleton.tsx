import { Skeleton } from '@/components/ui/skeleton'

export function AnalyticsChartSkeleton() {
  const barHeights = [40, 60, 30, 75, 50, 85, 45, 70, 55, 80, 35, 65]

  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="h-[300px] flex items-end gap-2">
        {barHeights.map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}
