'use client'

import { useState, useEffect } from 'react'
import { useCampaignPayouts, useMarkPaid, useBulkMarkPaid } from '@/hooks/use-campaigns'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { NoResults } from '@/components/empty-state'
import { centsToDisplay } from '@/lib/format'
import type { PayoutParticipant } from '@/types/campaign'

interface PayoutsTabProps {
  guildId: string
  campaignId: string
  isAdmin: boolean
  userId?: string
  onClearSearch?: () => void
}

type StatusFilter = 'all' | 'unpaid' | 'paid'

const MAX_SELECTION = 50

export function PayoutsTab({ guildId, campaignId, isAdmin, userId, onClearSearch }: PayoutsTabProps) {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unpaid')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [markPaidTarget, setMarkPaidTarget] = useState<PayoutParticipant | null>(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  const { data, isLoading } = useCampaignPayouts(guildId, campaignId, page, 20, userId)
  const markPaid = useMarkPaid(guildId, campaignId)
  const bulkMarkPaid = useBulkMarkPaid(guildId, campaignId)

  // Reset page and selection when userId changes
  useEffect(() => {
    setPage(0)
    setSelected(new Set())
  }, [userId])

  // Clear selection on page or status filter change
  useEffect(() => {
    setSelected(new Set())
  }, [page, statusFilter])

  const participants = data?.participants ?? []
  const totalCount = data?.pagination.totalCount ?? 0
  const pageSize = data?.pagination.pageSize ?? 20
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  // Client-side status filtering
  const filtered = participants.filter((p) => {
    if (statusFilter === 'unpaid') return !p.isPaid
    if (statusFilter === 'paid') return p.isPaid
    return true
  })

  const unpaidOnPage = filtered.filter((p) => !p.isPaid)

  const allUnpaidSelected =
    unpaidOnPage.length > 0 && unpaidOnPage.every((p) => selected.has(p.discordUserId))

  function toggleOne(discordUserId: string, isPaid: boolean) {
    if (isPaid) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(discordUserId)) {
        next.delete(discordUserId)
      } else {
        if (next.size < MAX_SELECTION) {
          next.add(discordUserId)
        }
      }
      return next
    })
  }

  function toggleAll() {
    if (allUnpaidSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        unpaidOnPage.forEach((p) => next.delete(p.discordUserId))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        let added = next.size
        for (const p of unpaidOnPage) {
          if (added >= MAX_SELECTION) break
          if (!next.has(p.discordUserId)) {
            next.add(p.discordUserId)
            added++
          }
        }
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-background/50">
            <tr>
              {isAdmin && <th className="px-4 py-3 w-10" />}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Earned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              {isAdmin && <th className="px-4 py-3 w-24" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {isAdmin && <td className="px-4 py-3 w-10" />}
                <td className="px-4 py-3"><div className="h-4 bg-surface-hover rounded animate-pulse w-32" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-surface-hover rounded animate-pulse w-20" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-surface-hover rounded animate-pulse w-16" /></td>
                {isAdmin && <td className="px-4 py-3 w-24" />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {isAdmin && selected.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">{selected.size} selected</span>
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="bg-accent-purple hover:bg-accent-purple/90 text-white text-sm px-3 py-1.5 rounded-md transition-colors"
              >
                Mark Paid
              </button>
            </div>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter)
            setPage(0)
          }}
          className="bg-surface border border-border rounded-md px-3 py-1.5 text-sm text-gray-300"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Table */}
      {userId && !isLoading && filtered.length === 0 ? (
        <NoResults query={userId} onClear={onClearSearch ?? (() => {})} />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-sm p-8 text-center">
          <p className="text-gray-400">No participants yet</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background/50">
                <tr>
                  {isAdmin && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allUnpaidSelected}
                        onChange={toggleAll}
                        className="accent-accent-purple"
                        aria-label="Select all unpaid"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Earned
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.discordUserId} className="hover:bg-background/30 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selected.has(p.discordUserId)}
                          onChange={() => toggleOne(p.discordUserId, p.isPaid)}
                          disabled={p.isPaid || (!selected.has(p.discordUserId) && selected.size >= MAX_SELECTION)}
                          className="accent-accent-purple disabled:opacity-40"
                          aria-label={`Select ${p.discordUserId}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-300">{p.username ?? p.discordUserId}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{centsToDisplay(p.totalEarnedCents)}</td>
                    <td className="px-4 py-3">
                      {p.isPaid ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          Unpaid
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {!p.isPaid && (
                          <button
                            type="button"
                            onClick={() => setMarkPaidTarget(p)}
                            className="text-xs px-2 py-1 rounded-md bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm rounded-md bg-surface border border-border text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-md bg-surface border border-border text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Single mark-paid confirmation */}
      {isAdmin && markPaidTarget && (
        <ConfirmationModal
          open={markPaidTarget !== null}
          onClose={() => setMarkPaidTarget(null)}
          onConfirm={() => {
            if (!markPaidTarget) return
            markPaid.mutate(
              { discordUserId: markPaidTarget.discordUserId },
              {
                onSuccess: () => {
                  setSelected((s) => {
                    const n = new Set(s)
                    n.delete(markPaidTarget.discordUserId)
                    return n
                  })
                  setMarkPaidTarget(null)
                },
              }
            )
          }}
          title="Mark as Paid"
          itemName={markPaidTarget.username ?? markPaidTarget.discordUserId}
          isLoading={markPaid.isPending}
          confirmLabel="Mark Paid"
          confirmClassName="bg-accent-purple hover:bg-accent-purple/90"
          loadingLabel="Processing..."
          description={
            <>
              Mark{' '}
              <span className="text-white font-medium">{markPaidTarget.username ?? markPaidTarget.discordUserId}</span> as
              paid for{' '}
              <span className="text-white font-medium">
                {centsToDisplay(markPaidTarget.totalEarnedCents)}
              </span>
              ?
            </>
          }
        />
      )}

      {/* Bulk mark-paid confirmation */}
      {isAdmin && (
        <ConfirmationModal
          open={bulkConfirmOpen}
          onClose={() => setBulkConfirmOpen(false)}
          onConfirm={() => {
            bulkMarkPaid.mutate(
              { discordUserIds: Array.from(selected) },
              {
                onSuccess: () => {
                  setBulkConfirmOpen(false)
                  setSelected(new Set())
                },
              }
            )
          }}
          title="Bulk Mark as Paid"
          itemName=""
          isLoading={bulkMarkPaid.isPending}
          confirmLabel="Mark All Paid"
          confirmClassName="bg-accent-purple hover:bg-accent-purple/90"
          loadingLabel="Processing..."
          description={
            <>
              Mark{' '}
              <span className="text-white font-medium">{selected.size}</span> participant
              {selected.size !== 1 ? 's' : ''} as paid?
            </>
          }
        />
      )}
    </div>
  )
}
