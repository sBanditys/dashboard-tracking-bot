'use client'

import { useQuery } from '@tanstack/react-query'
import type {
    GuildsResponse,
    GuildDetails,
    GuildStatus,
    GuildUsage,
} from '@/types/guild'

/**
 * Fetch all accessible guilds
 */
export function useGuilds() {
    return useQuery<GuildsResponse>({
        queryKey: ['guilds'],
        queryFn: async () => {
            const response = await fetch('/api/guilds')
            if (!response.ok) {
                throw new Error('Failed to fetch guilds')
            }
            return response.json()
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    })
}

/**
 * Fetch a single guild's details
 */
export function useGuild(guildId: string) {
    return useQuery<GuildDetails>({
        queryKey: ['guild', guildId],
        queryFn: async () => {
            const response = await fetch(`/api/guilds/${guildId}`)
            if (!response.ok) {
                throw new Error('Failed to fetch guild')
            }
            return response.json()
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!guildId,
    })
}

/**
 * Fetch guild bot status and health
 */
export function useGuildStatus(guildId: string) {
    return useQuery<GuildStatus>({
        queryKey: ['guild', guildId, 'status'],
        queryFn: async () => {
            const response = await fetch(`/api/guilds/${guildId}/status`)
            if (!response.ok) {
                throw new Error('Failed to fetch guild status')
            }
            return response.json()
        },
        staleTime: 30 * 1000, // 30 seconds - refresh more often for status
        refetchInterval: 60 * 1000, // Auto-refresh every minute
        enabled: !!guildId,
    })
}

/**
 * Fetch guild usage statistics
 */
export function useGuildUsage(guildId: string, days: number = 30) {
    return useQuery<GuildUsage>({
        queryKey: ['guild', guildId, 'usage', days],
        queryFn: async () => {
            const response = await fetch(`/api/guilds/${guildId}/usage?days=${days}`)
            if (!response.ok) {
                throw new Error('Failed to fetch guild usage')
            }
            return response.json()
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!guildId,
    })
}
