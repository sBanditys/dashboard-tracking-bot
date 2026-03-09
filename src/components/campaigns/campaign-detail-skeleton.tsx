import { Skeleton } from '@/components/ui/skeleton'

export function CampaignDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Skeleton shape="rect" className="h-4 w-48" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton shape="rect" className="h-8 w-64" />
        <Skeleton shape="rect" className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton shape="rect" className="h-4 w-32" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-sm p-4 space-y-2">
            <Skeleton shape="rect" className="h-4 w-20" />
            <Skeleton shape="rect" className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div>
        <div className="flex justify-between mb-1">
          <Skeleton shape="rect" className="h-4 w-24" />
          <Skeleton shape="rect" className="h-4 w-12" />
        </div>
        <Skeleton shape="rect" className="h-2 w-full rounded-full" />
      </div>

      {/* Platform rates heading */}
      <Skeleton shape="rect" className="h-6 w-32" />

      {/* Rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton shape="circle" className="w-6 h-6" />
              <Skeleton shape="rect" className="h-4 w-16" />
            </div>
            <Skeleton shape="rect" className="h-5 w-14" />
          </div>
        ))}
      </div>

      {/* Settings toggle */}
      <Skeleton shape="rect" className="h-6 w-40" />
    </div>
  )
}
