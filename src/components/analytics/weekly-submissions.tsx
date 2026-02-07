'use client'

import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/platform-icon'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeeklySubmissionWeek } from '@/types/analytics'

interface WeeklySubmissionsProps {
  weeks: WeeklySubmissionWeek[]
  className?: string
}

export function WeeklySubmissions({ weeks, className }: WeeklySubmissionsProps) {
  if (weeks.length === 0) {
    return (
      <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Submissions</h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-400">No weekly submission data yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Weekly Submissions</h3>

      <div className="space-y-6">
        {weeks.map((week) => {
          const weekLabel = `Week of ${format(parseISO(week.week_start), 'MMM d, yyyy')}`

          return (
            <div key={week.week_start} className="border-b border-border last:border-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">{weekLabel}</h4>
                <span className="text-sm font-semibold text-white">
                  {week.total_views.toLocaleString()} views
                </span>
              </div>

              {/* Platform breakdown bar */}
              <div className="flex gap-3 mb-3">
                {week.instagram_views > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform="instagram" size="w-4 h-4" />
                    <span className="text-xs text-gray-400">{week.instagram_views.toLocaleString()}</span>
                  </div>
                )}
                {week.tiktok_views > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform="tiktok" size="w-4 h-4" />
                    <span className="text-xs text-gray-400">{week.tiktok_views.toLocaleString()}</span>
                  </div>
                )}
                {week.youtube_views > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform="youtube" size="w-4 h-4" />
                    <span className="text-xs text-gray-400">{week.youtube_views.toLocaleString()}</span>
                  </div>
                )}
                {week.x_views > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform="x" size="w-4 h-4" />
                    <span className="text-xs text-gray-400">{week.x_views.toLocaleString()}</span>
                  </div>
                )}
                {week.facebook_views > 0 && (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform="facebook" size="w-4 h-4" />
                    <span className="text-xs text-gray-400">{week.facebook_views.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Group breakdown */}
              <div className="space-y-1.5">
                {week.groups.slice(0, 5).map((group) => (
                  <div key={group.group_label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 truncate">{group.group_label}</span>
                    <span className="text-gray-300 ml-2 flex-shrink-0">
                      {group.total_views.toLocaleString()}
                    </span>
                  </div>
                ))}
                {week.groups.length > 5 && (
                  <p className="text-xs text-gray-500">+{week.groups.length - 5} more groups</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WeeklySubmissionsSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-sm p-6">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
