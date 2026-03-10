'use client'

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type {
  CampaignStatus,
  CampaignsResponse,
  CampaignDetailResponse,
  AnalyticsResponse,
  PayoutsResponse,
  PayoutHistoryResponse,
  ExportTriggerResponse,
  ExportStatusResponse,
  MarkPaidResponse,
  BulkMarkPaidResponse,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '@/types/campaign'
import { ConflictError } from '@/types/campaign'

// ---------------------------------------------------------------------------
// Query Key Factory
// All keys nest under ['guild', guildId, 'campaigns', ...] so
// campaignKeys.all(guildId) invalidates everything campaign-related
// without touching bonus/tracking caches.
// ---------------------------------------------------------------------------

export const campaignKeys = {
  all: (guildId: string) =>
    ['guild', guildId, 'campaigns'] as const,
  list: (guildId: string, status?: string) =>
    ['guild', guildId, 'campaigns', 'list', status ?? 'all'] as const,
  detail: (guildId: string, campaignId: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId] as const,
  analytics: (guildId: string, campaignId: string, userId?: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'analytics', userId] as const,
  payouts: (guildId: string, campaignId: string, page: number, userId?: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'payouts', page, userId] as const,
  payoutHistory: (guildId: string, campaignId: string, page: number, userId?: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'history', page, userId] as const,
  exportStatus: (guildId: string, campaignId: string, exportId: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'export', exportId] as const,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data === null || typeof data !== 'object') return fallback
  const obj = data as { error?: string | { message?: string } }
  if (typeof obj.error === 'string') return obj.error
  if (typeof obj.error === 'object' && obj.error !== null && typeof obj.error.message === 'string') {
    return obj.error.message
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Read Hooks (6)
// ---------------------------------------------------------------------------

/**
 * Paginated campaign list with cursor-based infinite scroll.
 * Optionally filtered by campaign status.
 */
export function useCampaignsInfinite(guildId: string, status?: CampaignStatus) {
  return useInfiniteQuery({
    queryKey: campaignKeys.list(guildId, status),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (pageParam) params.set('cursor', pageParam)
      if (status) params.set('status', status)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns?${params}`
      )
      if (!res.ok) throw new Error('Failed to load campaigns')
      return res.json() as Promise<CampaignsResponse>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId,
    retry: 2,
  })
}

/**
 * Single campaign detail with brand info and totals.
 */
export function useCampaignDetail(guildId: string, campaignId: string) {
  return useQuery<CampaignDetailResponse>({
    queryKey: campaignKeys.detail(guildId, campaignId),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}`
      )
      if (!res.ok) throw new Error('Failed to load campaign')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!campaignId,
  })
}

/**
 * Campaign analytics with cursor-based infinite scroll.
 * Optionally filtered by userId.
 */
export function useCampaignAnalytics(
  guildId: string,
  campaignId: string,
  userId?: string
) {
  return useInfiniteQuery({
    queryKey: campaignKeys.analytics(guildId, campaignId, userId),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (pageParam) params.set('cursor', pageParam)
      if (userId) params.set('userId', userId)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/analytics?${params}`
      )
      if (!res.ok) throw new Error('Failed to load analytics')
      return res.json() as Promise<AnalyticsResponse>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!campaignId,
    retry: 2,
  })
}

/**
 * Campaign payouts with offset-based pagination.
 * Page is 0-indexed (backend uses min(0)).
 */
export function useCampaignPayouts(
  guildId: string,
  campaignId: string,
  page = 0,
  pageSize = 20,
  userId?: string
) {
  return useQuery<PayoutsResponse>({
    queryKey: campaignKeys.payouts(guildId, campaignId, page, userId),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (userId) params.set('userId', userId)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts?${params}`
      )
      if (!res.ok) throw new Error('Failed to load payouts')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!campaignId,
    placeholderData: keepPreviousData,
  })
}

/**
 * Payout history with offset-based pagination.
 * Page is 1-indexed (backend uses min(1)) -- different from payouts!
 */
export function usePayoutHistory(
  guildId: string,
  campaignId: string,
  page = 1,
  pageSize = 20,
  userId?: string
) {
  return useQuery<PayoutHistoryResponse>({
    queryKey: campaignKeys.payoutHistory(guildId, campaignId, page, userId),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (userId) params.set('userId', userId)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts/history?${params}`
      )
      if (!res.ok) throw new Error('Failed to load payout history')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!campaignId,
    placeholderData: keepPreviousData,
  })
}

/**
 * Poll export status every 3 seconds while exportId is present.
 */
export function useCampaignExportStatus(
  guildId: string,
  campaignId: string,
  exportId: string | null
) {
  return useQuery<ExportStatusResponse>({
    queryKey: campaignKeys.exportStatus(guildId, campaignId, exportId!),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/export/${exportId}`
      )
      if (!res.ok) throw new Error('Failed to check export status')
      return res.json()
    },
    enabled: !!guildId && !!campaignId && !!exportId,
    refetchInterval: 3000,
  })
}

// ---------------------------------------------------------------------------
// Mutation Hooks (6)
// ---------------------------------------------------------------------------

/**
 * Create a new campaign.
 */
export function useCreateCampaign(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const res = await fetchWithRetry(`/api/guilds/${guildId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(data, 'Failed to create campaign'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Campaign created')
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(guildId) })
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'audit-log'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign')
    },
  })
}

/**
 * Update a campaign. Throws ConflictError on 409 (optimistic lock).
 * Consuming components should check `error instanceof ConflictError`.
 */
export function useUpdateCampaign(guildId: string, campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateCampaignInput) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 409) {
          const parsed = data as { campaign?: import('@/types/campaign').Campaign }
          throw new ConflictError(
            'Campaign was modified by someone else',
            parsed.campaign!
          )
        }
        throw new Error(extractErrorMessage(data, 'Failed to update campaign'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Campaign updated')
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(guildId, campaignId),
      })
    },
    onError: (error: Error) => {
      // Do NOT toast for ConflictError -- consuming component handles it
      if (error instanceof ConflictError) return
      toast.error(error.message || 'Failed to update campaign')
    },
  })
}

/**
 * Delete a campaign. Backend enforces Draft/Completed status guard.
 */
export function useDeleteCampaign(guildId: string, campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(data, 'Failed to delete campaign'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Campaign deleted')
      queryClient.invalidateQueries({ queryKey: campaignKeys.all(guildId) })
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'audit-log'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete campaign')
    },
  })
}

/**
 * Mark a single participant as paid with optimistic update.
 * Follows the same pattern as useUpdatePayment from use-bonus.ts.
 */
export function useMarkPaid(guildId: string, campaignId: string) {
  const queryClient = useQueryClient()

  const payoutsPrefix = [
    'guild', guildId, 'campaigns', 'detail', campaignId, 'payouts',
  ]

  type Vars = { discordUserId: string }

  return useMutation<
    MarkPaidResponse,
    Error,
    Vars,
    { previousData: [readonly unknown[], unknown][] }
  >({
    mutationFn: async ({ discordUserId }: Vars) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts/mark-paid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discordUserId }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(data, 'Failed to mark as paid'))
      }
      return res.json()
    },
    onMutate: async ({ discordUserId }) => {
      // Cancel in-flight refetches for payouts
      await queryClient.cancelQueries({ queryKey: payoutsPrefix })

      // Snapshot current payouts data for rollback
      const previousData = queryClient.getQueriesData<PayoutsResponse>({
        queryKey: payoutsPrefix,
      })

      // Optimistically update matching participant
      queryClient.setQueriesData<PayoutsResponse>(
        { queryKey: payoutsPrefix },
        (old) => {
          if (!old) return old
          return {
            ...old,
            participants: old.participants.map((p) =>
              p.discordUserId === discordUserId
                ? { ...p, isPaid: true, paidAt: new Date().toISOString() }
                : p
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (err, _vars, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) =>
          queryClient.setQueryData(queryKey, data)
        )
      }
      toast.error(err.message || 'Failed to mark as paid')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: payoutsPrefix })
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'audit-log'],
      })
    },
  })
}

/**
 * Bulk mark multiple participants as paid.
 * No optimistic updates (too complex for bulk).
 */
export function useBulkMarkPaid(guildId: string, campaignId: string) {
  const queryClient = useQueryClient()

  const payoutsPrefix = [
    'guild', guildId, 'campaigns', 'detail', campaignId, 'payouts',
  ]

  return useMutation<BulkMarkPaidResponse, Error, { discordUserIds: string[] }>({
    mutationFn: async ({ discordUserIds }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: discordUserIds }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          extractErrorMessage(data, 'Failed to process bulk payments')
        )
      }
      return res.json()
    },
    onMutate: async () => {
      // Cancel in-flight refetches to prevent stale overwrites
      await queryClient.cancelQueries({ queryKey: payoutsPrefix })
    },
    onSuccess: (data) => {
      toast.success(
        `Marked ${data.paidCount} participant${data.paidCount !== 1 ? 's' : ''} as paid ($${(data.totalCents / 100).toFixed(2)} total)`
      )
      queryClient.invalidateQueries({ queryKey: payoutsPrefix })
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'audit-log'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process bulk payments')
    },
  })
}

/**
 * Trigger a campaign data export. Returns exportId for polling.
 */
export function useTriggerExport(guildId: string, campaignId: string) {
  return useMutation<
    ExportTriggerResponse,
    Error,
    { format: string; scope: string }
  >({
    mutationFn: async ({ format, scope }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, scope }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(extractErrorMessage(data, 'Failed to start export'))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Export queued')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start export')
    },
  })
}
