'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { toast } from 'sonner'

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
