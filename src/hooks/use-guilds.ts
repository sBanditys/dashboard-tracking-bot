'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSSE, type ConnectionState } from '@/hooks/use-sse'
import { useCallback, useState, useRef } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
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
            const response = await fetchWithRetry('/api/guilds')
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
            const response = await fetchWithRetry(`/api/guilds/${guildId}`)
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
            const response = await fetchWithRetry(`/api/guilds/${guildId}/status`)
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
            const response = await fetchWithRetry(`/api/guilds/${guildId}/usage?days=${days}`)
            if (!response.ok) {
                throw new Error('Failed to fetch guild usage')
            }
            return response.json()
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!guildId,
    })
}

/**
 * Real-time guild bot status with SSE integration
 *
 * Enhances polling with Server-Sent Events for push-based updates.
 * Falls back to polling when SSE is disconnected.
 */
export function useGuildStatusRealtime(guildId: string) {
    const queryClient = useQueryClient()

    const onMessage = useCallback(
        (data: unknown) => {
            queryClient.setQueryData(['guild', guildId, 'status'], data as GuildStatus)
        },
        [queryClient, guildId]
    )

    const { connectionState, reconnect } = useSSE(
        guildId ? `/api/guilds/${guildId}/status/stream` : null,
        { onMessage }
    )

    const query = useQuery<GuildStatus>({
        queryKey: ['guild', guildId, 'status'],
        queryFn: async () => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/status`)
            if (!response.ok) {
                throw new Error('Failed to fetch guild status')
            }
            return response.json()
        },
        staleTime: 30 * 1000, // 30 seconds
        // Only fall back to polling when retries are exhausted ('error') — not during transient reconnects
        refetchInterval: connectionState === 'error' ? 60_000 : false,
        enabled: !!guildId,
    })

    return {
        ...query,
        connectionState,
        reconnect,
    }
}

// Re-export ConnectionState type for convenience
export type { ConnectionState }

// Source: Codebase use-guilds.ts pattern + TanStack docs
import type { GuildSettings } from '@/types/guild'

interface UpdateSettingsRequest {
    logs_channel_id?: string | null
    watch_category_id?: string | null
    pause_category_id?: string | null
    updates_channel_id?: string | null
    updates_role_id?: string | null
    allowed_platforms?: string[]
}

export function useUpdateGuildSettings(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (settings: UpdateSettingsRequest) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            }, {
                onRetry: (attempt, maxAttempts) => {
                    setIsRetrying(true)
                    didRetryRef.current = true
                    if (attempt === 1) {
                        toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
                    }
                    console.warn(`Settings mutation retry ${attempt}/${maxAttempts}`)
                },
                onRetrySettled: () => {
                    setIsRetrying(false)
                },
            })

            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to update settings'))
            }

            return response.json() as Promise<{ settings: GuildSettings }>
        },
        onMutate: async (settings) => {
            // Cancel outgoing refetches (so they don't overwrite optimistic update)
            await queryClient.cancelQueries({ queryKey: ['guild', guildId] })

            // Snapshot previous value
            const previousGuild = queryClient.getQueryData<GuildDetails>(['guild', guildId])

            // Optimistically update to new value
            queryClient.setQueryData<GuildDetails>(['guild', guildId], (old) => {
                if (!old) return old
                return {
                    ...old,
                    settings: {
                        ...old.settings,
                        ...settings,
                    },
                }
            })

            // Return context with previous value
            return { previousGuild }
        },
        onError: (error, variables, context) => {
            // Rollback to previous value on error
            if (context?.previousGuild) {
                queryClient.setQueryData(['guild', guildId], context.previousGuild)
            }
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to update settings', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Settings saved successfully')
            }
            didRetryRef.current = false
        },
        onSettled: () => {
            // Always refetch after error or success to sync with server
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
    })

    return { ...mutation, isRetrying }
}

import type { ChannelsResponse } from '@/types/guild'

/**
 * Fetch Discord channels for a guild
 */
export function useGuildChannels(guildId: string) {
    return useQuery<ChannelsResponse>({
        queryKey: ['guild', guildId, 'channels'],
        queryFn: async () => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/channels`)
            if (!response.ok) {
                throw new Error('Failed to fetch channels')
            }
            return response.json()
        },
        staleTime: 5 * 60 * 1000,
        enabled: !!guildId,
    })
}

/**
 * Delete a tracking account
 */
export function useDeleteAccount(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (accountId: string) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/accounts/${accountId}`, {
                method: 'DELETE',
            }, {
                onRetry: (attempt) => {
                    setIsRetrying(true)
                    didRetryRef.current = true
                    if (attempt === 1) {
                        toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
                    }
                },
                onRetrySettled: () => {
                    setIsRetrying(false)
                },
            })
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to delete account'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Account deleted successfully')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to delete account', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Delete a brand
 */
export function useDeleteBrand(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (brandId: string) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/brands/${brandId}`, {
                method: 'DELETE',
            }, {
                onRetry: (attempt) => {
                    setIsRetrying(true)
                    didRetryRef.current = true
                    if (attempt === 1) {
                        toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })
                    }
                },
                onRetrySettled: () => {
                    setIsRetrying(false)
                },
            })
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to delete brand'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Brand deleted successfully')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to delete brand', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}
