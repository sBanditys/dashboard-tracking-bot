'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Minus, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BonusTarget } from '@/types/bonus'

interface TargetsTabProps {
  targets: BonusTarget[]
}

type SortField = 'group' | 'achieved' | 'target_views' | 'actual_views'
type SortDir = 'asc' | 'desc'

function AchievementIcon({ achieved }: { achieved: boolean | null }) {
  if (achieved === null) {
    return <Minus className="h-4 w-4 text-gray-500" />
  }
  if (achieved) {
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }
  return <XCircle className="h-4 w-4 text-red-500" />
}

/**
 * Flat list of bonus targets showing group, views, and achievement status.
 * Sortable by group name and achievement.
 */
export function TargetsTab({ targets }: TargetsTabProps) {
  const [sortField, setSortField] = useState<SortField>('group')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...targets].sort((a, b) => {
    let cmp = 0
    if (sortField === 'group') {
      cmp = a.account_group_label.localeCompare(b.account_group_label)
    } else if (sortField === 'achieved') {
      // null last
      const av = a.achieved === null ? -1 : a.achieved ? 1 : 0
      const bv = b.achieved === null ? -1 : b.achieved ? 1 : 0
      cmp = av - bv
    } else if (sortField === 'target_views') {
      cmp = a.target_views - b.target_views
    } else if (sortField === 'actual_views') {
      const av = a.actual_views ?? -1
      const bv = b.actual_views ?? -1
      cmp = av - bv
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    )
  }

  if (targets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No targets for this round.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
            <th
              className="text-left py-2 pr-4 font-medium cursor-pointer hover:text-gray-200 select-none"
              onClick={() => handleSort('group')}
            >
              Group
              <SortIcon field="group" />
            </th>
            <th
              className="text-right py-2 px-4 font-medium cursor-pointer hover:text-gray-200 select-none"
              onClick={() => handleSort('target_views')}
            >
              Target
              <SortIcon field="target_views" />
            </th>
            <th
              className="text-right py-2 px-4 font-medium cursor-pointer hover:text-gray-200 select-none"
              onClick={() => handleSort('actual_views')}
            >
              Actual
              <SortIcon field="actual_views" />
            </th>
            <th
              className="text-center py-2 pl-4 font-medium cursor-pointer hover:text-gray-200 select-none"
              onClick={() => handleSort('achieved')}
            >
              Status
              <SortIcon field="achieved" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map((target) => (
            <tr key={target.id} className="hover:bg-surface-hover/30 transition-colors">
              <td className="py-2.5 pr-4 text-white font-medium">
                {target.account_group_label}
              </td>
              <td className="py-2.5 px-4 text-right text-gray-300 tabular-nums">
                {target.target_views.toLocaleString()}
              </td>
              <td className="py-2.5 px-4 text-right text-gray-300 tabular-nums">
                {target.actual_views !== null
                  ? target.actual_views.toLocaleString()
                  : <span className="text-gray-500">—</span>}
              </td>
              <td className="py-2.5 pl-4 text-center">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  target.achieved === null
                    ? 'bg-gray-800 text-gray-400'
                    : target.achieved
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-red-900/40 text-red-400'
                )}>
                  <AchievementIcon achieved={target.achieved} />
                  {target.achieved === null ? 'Pending' : target.achieved ? 'Achieved' : 'Missed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
