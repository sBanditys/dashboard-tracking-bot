'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import type {
  AnalyticsData,
  LeaderboardResponse,
  TopAccountsResponse,
  ActivityResponse,
  WeeklySubmissionsResponse,
  TimeRange,
} from '@/types/analytics'

/**
 * Fetch analytics overview data (counters + time-series)
 */
export function useAnalytics(guildId: string, range: TimeRange = 30) {
  return useQuery<AnalyticsData>({
    queryKey: ['guild', guildId, 'analytics', range],
    queryFn: async () => {
      const response = await fetch(`/api/guilds/${guildId}/analytics?range=${range}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change rapidly
    enabled: !!guildId,
  })
}

/**
 * Fetch analytics leaderboard (top performing accounts)
 */
export function useAnalyticsLeaderboard(
  guildId: string,
  range: TimeRange = 30,
  limit: number = 10
) {
  return useQuery<LeaderboardResponse>({
    queryKey: ['guild', guildId, 'analytics', 'leaderboard', range, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/guilds/${guildId}/analytics/leaderboard?range=${range}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!guildId,
  })
}

/**
 * Fetch top accounts by post metrics (VideoMetrics)
 */
export function useTopAccounts(
  guildId: string,
  range: TimeRange = 30,
  limit: number = 10
) {
  return useQuery<TopAccountsResponse>({
    queryKey: ['guild', guildId, 'analytics', 'top-accounts', range, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/guilds/${guildId}/analytics/top-accounts?range=${range}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch top accounts')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!guildId,
  })
}

/**
 * Fetch weekly submissions data
 */
export function useWeeklySubmissions(guildId: string, weeks: number = 8) {
  return useQuery<WeeklySubmissionsResponse>({
    queryKey: ['guild', guildId, 'analytics', 'weekly-submissions', weeks],
    queryFn: async () => {
      const response = await fetch(
        `/api/guilds/${guildId}/analytics/weekly-submissions?weeks=${weeks}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch weekly submissions')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!guildId,
  })
}

/**
 * Fetch analytics activity timeline with infinite scroll
 */
export function useAnalyticsActivity(guildId: string) {
  return useInfiniteQuery<ActivityResponse>({
    queryKey: ['guild', guildId, 'analytics', 'activity'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(
        `/api/guilds/${guildId}/analytics/activity?page=${pageParam}&limit=50`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch activity')
      }
      return response.json()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.next_page,
    staleTime: 60 * 1000, // 1 minute - activity changes more often
    maxPages: 10, // Prevent memory bloat
    enabled: !!guildId,
  })
}
