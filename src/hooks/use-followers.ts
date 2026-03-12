'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { toast } from 'sonner'
import type { GroupFollowerStats, FollowerSnapshotsResponse } from '@/types/followers'

/**
 * Fetch group-level follower stats (total followers, growth deltas)
 */
export function useGroupFollowerStats(guildId: string, groupId: string) {
  return useQuery<GroupFollowerStats>({
    queryKey: ['guild', guildId, 'followers', 'group', groupId],
    queryFn: async () => {
      const response = await fetchWithRetry(
        `/api/guilds/${guildId}/followers?groupId=${groupId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch group follower stats')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!groupId,
  })
}

/**
 * Fetch follower snapshot time-series for a single account
 */
export function useFollowerSnapshots(guildId: string, accountId: string, limit = 7) {
  return useQuery<FollowerSnapshotsResponse>({
    queryKey: ['guild', guildId, 'followers', 'snapshots', accountId, limit],
    queryFn: async () => {
      const response = await fetchWithRetry(
        `/api/guilds/${guildId}/followers/${accountId}/snapshots?limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch follower snapshots')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!guildId && !!accountId,
  })
}

/**
 * Trigger an on-demand follower scrape for an account
 */
export function useFollowerScrape(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetchWithRetry(
        `/api/guilds/${guildId}/followers/${accountId}/scrape`,
        { method: 'POST' }
      )
      if (!response.ok) {
        const status = response.status
        if (status === 429) {
          const err = new Error('Rate limited')
          ;(err as Error & { status: number }).status = 429
          throw err
        }
        throw new Error('Failed to trigger refresh')
      }
      return response.json()
    },
    onSuccess: (_data, accountId) => {
      toast.success('Refresh queued')
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'followers', 'snapshots', accountId],
      })
    },
    onError: (error: Error & { status?: number }) => {
      if (error.status === 429) {
        toast.error('Rate limited — try again later')
      } else {
        toast.error('Failed to trigger refresh')
      }
    },
  })
}
