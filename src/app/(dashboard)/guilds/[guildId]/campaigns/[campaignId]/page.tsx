'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Download, Pencil, Trash2, Search } from 'lucide-react'
import { useCampaignDetail, useDeleteCampaign } from '@/hooks/use-campaigns'
import { useUser } from '@/hooks/use-user'
import { centsToDisplay } from '@/lib/format'
import { StatCard } from '@/components/stat-card'
import { CampaignStatusBadge } from '@/components/campaigns/campaign-status-badge'
import { BudgetProgressBar } from '@/components/campaigns/budget-progress-bar'
import { PlatformRateCards } from '@/components/campaigns/platform-rate-cards'
import { CampaignSettings } from '@/components/campaigns/campaign-settings'
import { CampaignDetailSkeleton } from '@/components/campaigns/campaign-detail-skeleton'
import { EditCampaignModal } from '@/components/campaigns/edit-campaign-modal'
import { ExportCampaignModal } from '@/components/campaigns/export-campaign-modal'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { AnalyticsTab } from '@/components/campaigns/analytics-tab'
import { PayoutsTab } from '@/components/campaigns/payouts-tab'
import { HistoryTab } from '@/components/campaigns/history-tab'

interface PageProps {
  params: Promise<{ guildId: string; campaignId: string }>
}

type CampaignTab = 'analytics' | 'payouts' | 'history'

export default function CampaignDetailPage({ params }: PageProps) {
  const { guildId, campaignId } = use(params)
  const { data, isLoading, isError, refetch } = useCampaignDetail(guildId, campaignId)
  const router = useRouter()
  const { user } = useUser()
  const deleteCampaign = useDeleteCampaign(guildId, campaignId)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportId, setExportId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`export-${campaignId}`) ?? null
  })
  const [activeTab, setActiveTab] = useState<CampaignTab>('analytics')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Auto-open export modal if there's a persisted in-progress export
  useEffect(() => {
    if (exportId) setExportOpen(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const guild = user?.guilds?.find((g) => g.id === guildId)
  const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0

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

  const tabs: { id: CampaignTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'payouts', label: 'Payouts' },
    { id: 'history', label: 'History' },
  ]

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
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={!!exportId}
              title={exportId ? 'Export in progress' : undefined}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-surface border border-border text-gray-300 hover:text-white hover:bg-surface-hover transition-colors"
            >
              <Pencil size={14} />
              Edit
            </button>
            {(campaign.status === 'Draft' || campaign.status === 'Completed') && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        )}
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

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user ID or username..."
            className="w-full bg-surface border border-border rounded-md px-3 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-purple"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={
              activeTab === tab.id
                ? 'px-4 py-2 text-sm font-medium rounded-full bg-accent-purple text-white shadow-sm transition-colors'
                : 'px-4 py-2 text-sm font-medium rounded-full text-gray-400 hover:text-gray-200 transition-colors'
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mb-6">
        {activeTab === 'analytics' && (
          <AnalyticsTab
            guildId={guildId}
            campaignId={campaignId}
            userId={debouncedSearch || undefined}
            onClearSearch={() => setSearch('')}
          />
        )}
        {activeTab === 'payouts' && (
          <PayoutsTab
            guildId={guildId}
            campaignId={campaignId}
            isAdmin={isAdmin}
            userId={debouncedSearch || undefined}
            onClearSearch={() => setSearch('')}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            guildId={guildId}
            campaignId={campaignId}
            userId={debouncedSearch || undefined}
            onClearSearch={() => setSearch('')}
          />
        )}
      </div>

      {/* Campaign settings */}
      <CampaignSettings campaign={campaign} />

      {/* Edit modal */}
      {isAdmin && (
        <EditCampaignModal
          guildId={guildId}
          campaignId={campaignId}
          campaign={data.campaign}
          version={campaign.version}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {isAdmin && (
        <ConfirmationModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          title="Delete Campaign"
          itemName={campaign.name}
          isLoading={deleteCampaign.isPending}
          onConfirm={() => {
            deleteCampaign.mutate(undefined, {
              onSuccess: () => {
                setDeleteOpen(false)
                router.push(`/guilds/${guildId}/campaigns`)
              },
            })
          }}
        />
      )}

      {/* Export modal */}
      {isAdmin && (
        <ExportCampaignModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          guildId={guildId}
          campaignId={campaignId}
          exportId={exportId}
          onExportStarted={(id) => {
            setExportId(id)
            localStorage.setItem(`export-${campaignId}`, id)
          }}
          onExportDone={() => {
            setExportId(null)
            localStorage.removeItem(`export-${campaignId}`)
            setExportOpen(false)
          }}
        />
      )}
    </div>
  )
}
