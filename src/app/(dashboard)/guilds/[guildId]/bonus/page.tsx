'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'
import { RoundsTab } from '@/components/bonus/rounds-tab'
import { LeaderboardTab } from '@/components/bonus/leaderboard-tab'
import { CreateRoundModal } from '@/components/bonus/create-round-modal'

type TopTab = 'rounds' | 'leaderboard'

const TOP_TABS: { id: TopTab; label: string }[] = [
  { id: 'rounds', label: 'Rounds' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

/**
 * Main bonus page at /guilds/[guildId]/bonus
 *
 * Layout:
 * - Page header with "Bonus Rounds" title and optional Create Round button (admin only)
 * - Top-level tab switcher: Rounds / Leaderboard
 * - RoundsTab and LeaderboardTab content
 *
 * Note: CreateRoundModal is wired in Plan 03. The modal open state is
 * already declared here so Plan 03 can activate it without restructuring.
 */
export default function BonusPage() {
  const params = useParams()
  const guildId = params.guildId as string
  const [activeTab, setActiveTab] = useState<TopTab>('rounds')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { user } = useUser()
  const guild = user?.guilds?.find((g) => g.id === guildId)
  const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Bonus Rounds</h2>
          <p className="text-sm text-gray-400 mt-1">
            View and manage weekly bonus rounds and payments.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'bg-accent-purple hover:bg-accent-purple/80 text-white'
            )}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Round
          </button>
        )}
      </div>

      <CreateRoundModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        guildId={guildId}
        existingWeekStarts={[]}
      />

      {/* Top-level tab switcher */}
      <div className="inline-flex bg-surface border border-border rounded-lg p-1 gap-1">
        {TOP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
              activeTab === tab.id
                ? 'bg-accent-purple text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'rounds' ? (
        <RoundsTab guildId={guildId} isAdmin={isAdmin} onOpenCreate={() => setCreateModalOpen(true)} />
      ) : (
        <LeaderboardTab guildId={guildId} />
      )}
    </div>
  )
}
