'use client'

import { useState, useEffect } from 'react'
import { usePayoutHistory } from '@/hooks/use-campaigns'
import { DataTable } from '@/components/ui/data-table'
import { NoResults } from '@/components/empty-state'
import { centsToDisplay } from '@/lib/format'
import type { PayoutHistoryEntry } from '@/types/campaign'

interface HistoryTabProps {
  guildId: string
  campaignId: string
  userId?: string
}

function formatTimestamp(timestamp: string): string {
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date}, ${time}`
}

const columns = [
  {
    key: 'timestamp',
    header: 'Date',
    render: (e: PayoutHistoryEntry) => formatTimestamp(e.timestamp),
  },
  {
    key: 'actorId',
    header: 'Admin',
    render: (e: PayoutHistoryEntry) => e.actorUsername ?? e.actorId,
  },
  {
    key: 'discordUserId',
    header: 'Participant',
    render: (e: PayoutHistoryEntry) => e.username ?? e.discordUserId,
  },
  {
    key: 'amountCents',
    header: 'Amount',
    render: (e: PayoutHistoryEntry) => centsToDisplay(e.amountCents),
  },
]

export function HistoryTab({ guildId, campaignId, userId }: HistoryTabProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = usePayoutHistory(guildId, campaignId, page, 20, userId)

  // Reset page to 1 when userId changes
  useEffect(() => {
    setPage(1)
  }, [userId])

  const entries = data?.entries ?? []
  const totalCount = data?.pagination.totalCount ?? 0
  const pageSize = data?.pagination.pageSize ?? 20
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  if (userId && !isLoading && entries.length === 0) {
    return <NoResults query={userId} onClear={() => {}} />
  }

  return (
    <div>
      <DataTable
        columns={columns}
        data={entries}
        isLoading={isLoading}
        emptyMessage="No payout history yet"
        keyExtractor={(e) => e.id}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-md bg-surface border border-border text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-md bg-surface border border-border text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
