'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { useCampaignAnalytics } from '@/hooks/use-campaigns'
import { DataTable } from '@/components/ui/data-table'
import { NoResults } from '@/components/empty-state'
import { centsToDisplay } from '@/lib/format'
import type { AnalyticsParticipant } from '@/types/campaign'

interface AnalyticsTabProps {
  guildId: string
  campaignId: string
  userId?: string
}

const columns = [
  {
    key: 'discordUserId',
    header: 'User',
    render: (p: AnalyticsParticipant) => p.username ?? p.discordUserId,
  },
  {
    key: 'postCount',
    header: 'Posts',
    render: (p: AnalyticsParticipant) => p.postCount.toLocaleString(),
  },
  {
    key: 'totalEarnedCents',
    header: 'Earned',
    render: (p: AnalyticsParticipant) => centsToDisplay(p.totalEarnedCents),
  },
]

export function AnalyticsTab({ guildId, campaignId, userId }: AnalyticsTabProps) {
  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCampaignAnalytics(guildId, campaignId, userId)

  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const participants = data?.pages.flatMap((p) => p.participants) ?? []

  if (userId && !isLoading && participants.length === 0) {
    return <NoResults query={userId} onClear={() => {}} />
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={participants}
        isLoading={isLoading}
        emptyMessage="No participants yet"
        keyExtractor={(p) => p.discordUserId}
      />

      <div ref={ref} />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
