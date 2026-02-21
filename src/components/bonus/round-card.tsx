'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { centsToDisplay, useBonusRoundDetail } from '@/hooks/use-bonus'
import { TargetsTab } from '@/components/bonus/targets-tab'
import { PaymentsTab } from '@/components/bonus/payments-tab'
import { ResultsTab } from '@/components/bonus/results-tab'
import type { BonusRound } from '@/types/bonus'

interface RoundCardProps {
  round: BonusRound
  expanded: boolean
  onToggle: () => void
  guildId: string
  isAdmin: boolean
}

type InnerTab = 'targets' | 'payments' | 'results'

const INNER_TABS: { id: InnerTab; label: string }[] = [
  { id: 'targets', label: 'Targets' },
  { id: 'payments', label: 'Payments' },
  { id: 'results', label: 'Results' },
]

/**
 * Mini achievement indicator dots for collapsed card.
 */
function TargetDots({ targets }: { targets: BonusRound['targets'] }) {
  // Show up to 5 dots
  const visible = targets.slice(0, 5)
  const rest = targets.length - visible.length

  return (
    <div className="flex items-center gap-1">
      {visible.map((t) => (
        <span
          key={t.id}
          title={`${t.account_group_label}: ${t.achieved === null ? 'Pending' : t.achieved ? 'Achieved' : 'Missed'}`}
          className={cn(
            'inline-block h-2.5 w-2.5 rounded-full',
            t.achieved === null
              ? 'bg-gray-600'
              : t.achieved
              ? 'bg-green-500'
              : 'bg-red-500'
          )}
        />
      ))}
      {rest > 0 && (
        <span className="text-xs text-gray-500 ml-0.5">+{rest}</span>
      )}
    </div>
  )
}

/**
 * Collapsible bonus round card.
 * - Collapsed: shows week dates, bonus amount, target dots, and status badge.
 * - Expanded: fetches full round detail and shows Targets/Payments/Results tabs.
 */
export function RoundCard({ round, expanded, onToggle, guildId, isAdmin }: RoundCardProps) {
  const [innerTab, setInnerTab] = useState<InnerTab>('targets')
  const { data: detailData, isLoading: detailLoading } = useBonusRoundDetail(
    guildId,
    round.id,
    expanded
  )

  const weekStart = format(new Date(round.week_start), 'MMM d')
  const weekEnd = format(new Date(round.week_end), 'MMM d, yyyy')

  const achievedCount = round.targets.filter((t) => t.achieved === true).length
  const missedCount = round.targets.filter((t) => t.achieved === false).length

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg overflow-hidden transition-opacity duration-200',
        !round.evaluated && 'opacity-75'
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-4 hover:bg-surface-hover/30 transition-colors"
        onClick={onToggle}
      >
        {/* Left: dates + amount */}
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">
            {weekStart} – {weekEnd}
          </div>
          <div className="text-sm text-gray-400 mt-0.5">
            {centsToDisplay(round.bonus_amount_cents)} per group
          </div>
        </div>

        {/* Right: target dots + status badge + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <TargetDots targets={round.targets} />

          {round.evaluated ? (
            <div className="flex items-center gap-1.5">
              {achievedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {achievedCount}
                </span>
              )}
              {missedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-red-400">
                  <XCircle className="h-3.5 w-3.5" />
                  {missedCount}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}

          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-border">
          {/* Inner tab bar */}
          <div className="px-4 pt-3 pb-0">
            <div className="inline-flex bg-surface-hover border border-border rounded-md p-0.5 gap-0.5">
              {INNER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInnerTab(tab.id)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded transition-all duration-150',
                    innerTab === tab.id
                      ? 'bg-surface text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inner tab content */}
          <div className="p-4">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-accent-purple"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Loading round details...
              </div>
            ) : detailData ? (
              <>
                {innerTab === 'targets' && (
                  <TargetsTab targets={detailData.round.targets} />
                )}
                {innerTab === 'payments' && (
                  <PaymentsTab
                    roundId={round.id}
                    guildId={guildId}
                    payments={detailData.round.payments}
                    evaluated={round.evaluated}
                    isAdmin={isAdmin}
                  />
                )}
                {innerTab === 'results' && (
                  <ResultsTab
                    roundId={round.id}
                    guildId={guildId}
                    evaluated={round.evaluated}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-8 text-red-400 text-sm">
                Failed to load round details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
