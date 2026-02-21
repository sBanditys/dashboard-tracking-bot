'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type {
  BonusRound,
  BonusRoundDetailResponse,
  BonusResultsResponse,
  BonusLeaderboardResponse,
  BonusRoundsResponse,
  CreateBonusRoundRequest,
  RoundFilter,
} from '@/types/bonus'

// ─────────────────────────────────────────────────────────────
// Query Key Factory
// Prevents cache key mismatch between fetches and mutations.
// ─────────────────────────────────────────────────────────────

export const bonusKeys = {
  rounds: (guildId: string, filter: RoundFilter, cursor: string | null) =>
    ['guild', guildId, 'bonus', 'rounds', filter, cursor] as const,
  roundDetail: (guildId: string, roundId: string) =>
    ['guild', guildId, 'bonus', 'round', roundId] as const,
  results: (guildId: string, roundId: string) =>
    ['guild', guildId, 'bonus', 'results', roundId] as const,
  leaderboard: (guildId: string, weeks: number) =>
    ['guild', guildId, 'bonus', 'leaderboard', weeks] as const,
}

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────

/**
 * Convert cents to dollar display string: e.g. 5000 -> "$50.00"
 */
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─────────────────────────────────────────────────────────────
// Query Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Load More pagination hook for bonus rounds list.
 *
 * Uses accumulated state pattern (not useInfiniteQuery).
 * Filter changes reset the list to the first page.
 */
export function useBonusRounds(guildId: string, filter: RoundFilter) {
  const [rounds, setRounds] = useState<BonusRound[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const evaluated =
    filter === 'all' ? undefined : filter === 'evaluated' ? 'true' : 'false'

  const query = useQuery({
    queryKey: bonusKeys.rounds(guildId, filter, cursor),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '10' })
      if (cursor) params.set('cursor', cursor)
      if (evaluated !== undefined) params.set('evaluated', evaluated)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds?${params}`
      )
      if (!res.ok) throw new Error('Failed to load bonus rounds')
      return res.json() as Promise<BonusRoundsResponse>
    },
    staleTime: 30 * 1000,
    enabled: !!guildId,
  })

  // Accumulate rounds when data changes
  useEffect(() => {
    if (query.data) {
      if (cursor === null) {
        // First page — replace list
        setRounds(query.data.rounds)
      } else {
        // Subsequent pages — append
        setRounds((prev) => [...prev, ...query.data!.rounds])
      }
      setHasMore(query.data.has_more)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  const loadMore = () => {
    if (query.data?.next_cursor) {
      setCursor(query.data.next_cursor)
    }
  }

  // Reset when filter or guild changes
  useEffect(() => {
    setRounds([])
    setCursor(null)
    setHasMore(false)
  }, [filter, guildId])

  const reset = () => {
    setRounds([])
    setCursor(null)
    setHasMore(false)
  }

  return {
    rounds,
    hasMore,
    loadMore,
    isLoading: query.isLoading,
    isError: query.isError,
    reset,
  }
}

/**
 * Fetch a single bonus round with full targets and payments detail.
 * Only fetches when `enabled` is true (i.e., card is expanded).
 */
export function useBonusRoundDetail(
  guildId: string,
  roundId: string,
  enabled: boolean
) {
  return useQuery<BonusRoundDetailResponse>({
    queryKey: bonusKeys.roundDetail(guildId, roundId),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}`
      )
      if (!res.ok) throw new Error('Failed to load bonus round')
      return res.json()
    },
    staleTime: 30 * 1000,
    enabled: !!guildId && !!roundId && enabled,
  })
}

/**
 * Fetch results for an evaluated bonus round.
 * Only fetches when `enabled` is true (i.e., Results tab is active AND round is evaluated).
 */
export function useBonusResults(
  guildId: string,
  roundId: string,
  enabled: boolean
) {
  return useQuery<BonusResultsResponse>({
    queryKey: bonusKeys.results(guildId, roundId),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/results`
      )
      if (!res.ok) throw new Error('Failed to load bonus results')
      return res.json()
    },
    staleTime: 30 * 1000,
    enabled: !!guildId && !!roundId && enabled,
  })
}

/**
 * Fetch the bonus achievement leaderboard for a given time range.
 * Backend max is 52 weeks (from leaderboardQuerySchema). Use weeks=52 for "All time".
 * Week boundaries use Sunday start (matching backend weekBoundary.ts).
 */
export function useBonusLeaderboard(guildId: string, weeks: number) {
  return useQuery<BonusLeaderboardResponse>({
    queryKey: bonusKeys.leaderboard(guildId, weeks),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/leaderboard?weeks=${weeks}`
      )
      if (!res.ok) throw new Error('Failed to load bonus leaderboard')
      return res.json()
    },
    staleTime: 30 * 1000,
    enabled: !!guildId,
  })
}

// ─────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────

/**
 * Create a new bonus round.
 * On success: invalidates rounds list queries and shows success toast.
 */
export function useCreateBonusRound(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: CreateBonusRoundRequest) => {
      const res = await fetchWithRetry(`/api/guilds/${guildId}/bonus/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to create bonus round'
        )
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate all rounds queries (all filters + cursors)
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'bonus', 'rounds'],
      })
      toast.success('Bonus round created successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to create bonus round', {
        description: error.message,
      })
    },
  })
}

/**
 * Update an individual payment's paid status with optimistic updates.
 *
 * - Optimistically flips paid status in cache immediately.
 * - Reverts on error and shows error toast.
 * - When toggling to unpaid, shows Sonner warning toast with Undo action (5s).
 * - On settled: invalidates roundDetail query for fresh server state.
 */
export function useUpdatePayment(guildId: string) {
  const queryClient = useQueryClient()

  type Vars = {
    roundId: string
    paymentId: string
    paid: boolean
    notes?: string
  }

  const mutation = useMutation<unknown, Error, Vars, { previous: BonusRoundDetailResponse | undefined; roundId: string }>({
    mutationFn: async ({ roundId, paymentId, paid, notes }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/payments/${paymentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid, ...(notes !== undefined && { notes }) }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to update payment'
        )
      }
      return res.json()
    },
    onMutate: async ({ roundId, paymentId, paid }) => {
      // Cancel in-flight refetches for this round
      await queryClient.cancelQueries({
        queryKey: bonusKeys.roundDetail(guildId, roundId),
      })

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<BonusRoundDetailResponse>(
        bonusKeys.roundDetail(guildId, roundId)
      )

      // Optimistically update payment paid status in cache
      queryClient.setQueryData<BonusRoundDetailResponse>(
        bonusKeys.roundDetail(guildId, roundId),
        (old) => {
          if (!old) return old
          return {
            ...old,
            round: {
              ...old.round,
              payments: old.round.payments.map((p) =>
                p.id === paymentId
                  ? {
                      ...p,
                      paid,
                      paid_at: paid ? new Date().toISOString() : null,
                      paid_by: paid ? 'optimistic' : null,
                    }
                  : p
              ),
            },
          }
        }
      )

      return { previous, roundId }
    },
    onError: (err, _variables, context) => {
      // Revert optimistic update on error
      if (context?.previous) {
        queryClient.setQueryData(
          bonusKeys.roundDetail(guildId, context.roundId),
          context.previous
        )
      }
      toast.error('Failed to update payment', { description: err.message })
    },
    onSuccess: (_data, { roundId, paymentId, paid }) => {
      // Show undo toast when toggling to unpaid
      if (!paid) {
        const toastId = `unpay-${paymentId}`
        toast.warning('Payment marked as unpaid', {
          id: toastId,
          action: {
            label: 'Undo',
            onClick: () => {
              toast.dismiss(toastId)
              mutation.mutate({ roundId, paymentId, paid: true })
            },
          },
          duration: 5000,
        })
      }
    },
    onSettled: (_data, _err, variables) => {
      // Invalidate to sync with server after optimistic update
      queryClient.invalidateQueries({
        queryKey: bonusKeys.roundDetail(guildId, variables.roundId),
      })
    },
  })

  return mutation
}

/**
 * Bulk update all payments in a round (mark all paid/unpaid).
 * On success: invalidates roundDetail query and shows success toast.
 */
export function useBulkUpdatePayments(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roundId,
      paid,
      notes,
    }: {
      roundId: string
      paid: boolean
      notes?: string
    }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/payments/bulk`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid, ...(notes !== undefined && { notes }) }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to bulk update payments'
        )
      }
      return res.json()
    },
    onSuccess: (_data, { roundId, paid }) => {
      queryClient.invalidateQueries({
        queryKey: bonusKeys.roundDetail(guildId, roundId),
      })
      toast.success(
        paid ? 'All payments marked as paid' : 'All payments marked as unpaid'
      )
    },
    onError: (error: Error) => {
      toast.error('Failed to bulk update payments', {
        description: error.message,
      })
    },
  })
}

/**
 * Evaluate (or re-evaluate) a bonus round with current data.
 * Works for both unevaluated rounds (first evaluation) and already-evaluated rounds (refresh).
 * On success: invalidates rounds list and round detail queries, shows success toast.
 */
export function useEvaluateBonusRound(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roundId }: { roundId: string }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to evaluate bonus round'
        )
      }
      return res.json()
    },
    onSuccess: (_data, { roundId }) => {
      // Invalidate rounds list and this round's detail
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'bonus', 'rounds'],
      })
      queryClient.invalidateQueries({
        queryKey: bonusKeys.roundDetail(guildId, roundId),
      })
      queryClient.invalidateQueries({
        queryKey: bonusKeys.results(guildId, roundId),
      })
      toast.success('Bonus round evaluated with latest data')
    },
    onError: (error: Error) => {
      toast.error('Failed to evaluate bonus round', {
        description: error.message,
      })
    },
  })
}

/**
 * Auto-save payment notes on blur.
 *
 * Sends the full payload (paid + notes) to avoid race conditions when
 * a paid-status toggle and a notes save fire concurrently.
 * See 12-RESEARCH.md Pitfall 4.
 */
export function useUpdatePaymentNotes(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roundId,
      paymentId,
      paid,
      notes,
    }: {
      roundId: string
      paymentId: string
      paid: boolean
      notes: string
    }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/bonus/rounds/${roundId}/payments/${paymentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid, notes }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to save notes'
        )
      }
      return res.json()
    },
    onSuccess: (_data, { roundId }) => {
      queryClient.invalidateQueries({
        queryKey: bonusKeys.roundDetail(guildId, roundId),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to save notes', { description: error.message })
    },
  })
}
