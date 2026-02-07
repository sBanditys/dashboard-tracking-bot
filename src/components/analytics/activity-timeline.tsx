'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { format, isToday, isYesterday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalyticsActivity } from '@/hooks/use-analytics'
import { ActivityEvent } from './activity-event'
import type { ActivityEvent as ActivityEventType } from '@/types/analytics'

interface ActivityTimelineProps {
  guildId: string
  className?: string
}

/**
 * Groups events by day with relative date labels (Today, Yesterday, date).
 */
function groupEventsByDay(events: ActivityEventType[]): Record<string, ActivityEventType[]> {
  return events.reduce((groups, event) => {
    const date = new Date(event.created_at)
    let label: string

    if (isToday(date)) {
      label = 'Today'
    } else if (isYesterday(date)) {
      label = 'Yesterday'
    } else {
      label = format(date, 'MMM d')
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(event)

    return groups
  }, {} as Record<string, ActivityEventType[]>)
}

/**
 * Activity timeline with day grouping and infinite scroll.
 * Shows recent activity events grouped by day with relative date headers.
 */
export function ActivityTimeline({ guildId, className }: ActivityTimelineProps) {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAnalyticsActivity(guildId)

  const { ref, inView } = useInView()

  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Flatten all pages and group by day
  const events = data?.pages.flatMap((p) => p.events) || []
  const groupedEvents = groupEventsByDay(events)

  return (
    <div className={cn('bg-surface border border-border rounded-sm p-6', className)}>
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      {isLoading ? (
        // Loading skeleton
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" style={{ width: `${60 + (i % 3) * 10}%` }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        // Empty state
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-400">No recent activity</p>
        </div>
      ) : (
        // Grouped events
        <div className="space-y-4">
          {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                {dateLabel}
              </h4>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <ActivityEvent key={event.id} event={event} guildId={guildId} />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasNextPage && <div ref={ref} className="h-4" />}

          {/* Loading more indicator */}
          {isFetchingNextPage && <Skeleton className="h-12 mt-2" />}
        </div>
      )}
    </div>
  )
}
