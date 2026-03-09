'use client'

import { use, useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Megaphone, Plus, RefreshCw } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { useCampaignsInfinite } from '@/hooks/use-campaigns'
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal'
import { GuildTabs } from '@/components/guild-tabs'
import { CampaignCard } from '@/components/campaigns/campaign-card'
import { CampaignCardSkeleton } from '@/components/campaigns/campaign-card-skeleton'
import { CampaignStatusSelect } from '@/components/campaigns/campaign-status-select'
import { EmptyState, NoResults } from '@/components/empty-state'
import type { CampaignStatus } from '@/types/campaign'

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Active: 'Active',
  Paused: 'Paused',
  SubmissionsClosed: 'Submissions Closed',
  Completed: 'Completed',
}

interface PageProps {
  params: Promise<{ guildId: string }>
}

export default function CampaignsPage({ params }: PageProps) {
  const { guildId } = use(params)
  const [status, setStatus] = useState<string>('')
  const [createOpen, setCreateOpen] = useState(false)

  const { user } = useUser()
  const guild = user?.guilds?.find((g) => g.id === guildId)
  const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCampaignsInfinite(
    guildId,
    status ? (status as CampaignStatus) : undefined
  )

  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const campaigns = data?.pages.flatMap((page) => page.campaigns) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-accent-purple hover:bg-accent-purple/90 text-white transition-colors"
          >
            <Plus size={16} />
            Create Campaign
          </button>
        )}
      </div>

      <GuildTabs guildId={guildId} />

      {/* Filter bar */}
      <div className="flex items-center">
        <CampaignStatusSelect value={status} onChange={setStatus} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <>
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-sm text-red-400">Failed to load campaigns</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:bg-surface-hover transition-colors"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        </>
      ) : campaigns.length === 0 ? (
        status ? (
          <NoResults
            query={STATUS_LABELS[status] ?? status}
            onClear={() => setStatus('')}
          />
        ) : (
          <EmptyState
            icon={<Megaphone className="w-16 h-16" />}
            title="No campaigns yet"
            description="Create one to get started."
          />
        )
      ) : (
        <>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                guildId={guildId}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={ref} />

          {isFetchingNextPage && (
            <p className="text-center text-sm text-gray-400 py-4">
              Loading more...
            </p>
          )}
        </>
      )}

      <CreateCampaignModal
        guildId={guildId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
