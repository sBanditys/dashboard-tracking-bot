'use client'

import { use } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useCampaignDetail } from '@/hooks/use-campaigns'
import { centsToDisplay } from '@/lib/format'
import { StatCard } from '@/components/stat-card'
import { CampaignStatusBadge } from '@/components/campaigns/campaign-status-badge'
import { BudgetProgressBar } from '@/components/campaigns/budget-progress-bar'
import { PlatformRateCards } from '@/components/campaigns/platform-rate-cards'
import { CampaignSettings } from '@/components/campaigns/campaign-settings'
import { CampaignDetailSkeleton } from '@/components/campaigns/campaign-detail-skeleton'

interface PageProps {
  params: Promise<{ guildId: string; campaignId: string }>
}

export default function CampaignDetailPage({ params }: PageProps) {
  const { guildId, campaignId } = use(params)
  const { data, isLoading, isError, refetch } = useCampaignDetail(guildId, campaignId)

  if (isLoading) {
    return <CampaignDetailSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-400 mb-4">Failed to load campaign</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-accent-purple hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-gray-400 mb-4">Campaign not found</p>
        <Link
          href={`/guilds/${guildId}/campaigns`}
          className="text-accent-purple hover:underline"
        >
          Back to campaigns
        </Link>
      </div>
    )
  }

  const { campaign, totals } = data
  const budgetRemaining = Math.max(campaign.budgetCents - totals.totalEarnedCents, 0)

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-4">
        <Link
          href={`/guilds/${guildId}/campaigns`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Campaigns
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-600" />
        <span className="text-white">{campaign.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <p className="text-gray-400 text-sm mb-6">{campaign.brand.label}</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Earned"
          value={centsToDisplay(totals.totalEarnedCents)}
          icon="$"
        />
        <StatCard
          label="Participants"
          value={totals.participantCount}
        />
        <StatCard
          label="Posts"
          value={campaign._count.posts}
        />
        <StatCard
          label="Budget Remaining"
          value={centsToDisplay(budgetRemaining)}
          icon="$"
        />
      </div>

      {/* Budget progress bar */}
      <BudgetProgressBar
        totalEarnedCents={totals.totalEarnedCents}
        budgetCents={campaign.budgetCents}
      />

      {/* Platform rates */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Platform Rates</h2>
        <PlatformRateCards campaign={campaign} />
      </div>

      {/* Campaign settings */}
      <CampaignSettings campaign={campaign} />
    </div>
  )
}
