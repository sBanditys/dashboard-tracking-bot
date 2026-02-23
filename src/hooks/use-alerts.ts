'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
import type {
    AlertThreshold,
    AlertSettings,
    ThresholdFilters,
    ThresholdPage,
    CreateThresholdRequest,
} from '@/types/alert'

/**
 * Fetch paginated alert thresholds with infinite scroll
 */
export function useAlertThresholds(guildId: string, filters: ThresholdFilters = {}) {
    return useInfiniteQuery<ThresholdPage>({
        queryKey: ['guild', guildId, 'alerts', 'thresholds', filters],
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams()
            params.set('page', String(pageParam))
            params.set('limit', '20')
            if (filters.groupId) params.set('groupId', filters.groupId)
            if (filters.platform) params.set('platform', filters.platform)
            if (filters.metricType) params.set('metricType', filters.metricType)
            if (filters.search) params.set('search', filters.search)

            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/alert-thresholds?${params.toString()}`
            )
            if (!response.ok) {
                throw new Error('Failed to fetch alert thresholds')
            }
            return response.json()
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.page >= lastPage.pagination.total_pages) {
                return undefined
            }
            return lastPage.pagination.page + 1
        },
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
        enabled: !!guildId,
    })
}

/**
 * Get the count of active thresholds from the infinite query cache
 */
export function useActiveThresholdCount(guildId: string) {
    const query = useAlertThresholds(guildId)
    const firstPage = query.data?.pages[0]
    const count = firstPage?.active_count ?? 0
    return { count, isLoading: query.isLoading }
}

/**
 * Create a new alert threshold for an account group
 */
export function useCreateThreshold(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: string
            data: CreateThresholdRequest
        }): Promise<AlertThreshold> => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
                {
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
                }
            )
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to create threshold'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Alert threshold created')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to create threshold', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Delete an alert threshold
 */
export function useDeleteThreshold(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async ({
            groupId,
            thresholdId,
        }: {
            groupId: string
            thresholdId: string
        }): Promise<void> => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds/${thresholdId}`,
                { method: 'DELETE' },
                {
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
                }
            )
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to delete threshold'))
            }
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Alert threshold deleted')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to delete threshold', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Toggle a threshold enabled/disabled — waits for API confirmation (no optimistic update)
 */
export function useToggleThreshold(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async ({
            groupId,
            thresholdId,
            enabled,
        }: {
            groupId: string
            thresholdId: string
            enabled: boolean
        }): Promise<AlertThreshold> => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds/${thresholdId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled }),
                },
                {
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
                }
            )
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to toggle threshold'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to toggle threshold', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Update alert settings for an account group
 */
export function useUpdateAlertSettings(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: string
            data: Partial<Pick<AlertSettings, 'streakAlerts' | 'thresholdAlerts' | 'statusAlerts'>>
        }): Promise<AlertSettings> => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/groups/${groupId}/alert-settings`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                },
                {
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
                }
            )
            if (!response.ok) {
                const body = await response.json()
                throw new Error(parseApiError(body, 'Failed to update alert settings'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Alert settings updated')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to update alert settings', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Bulk toggle multiple thresholds
 */
export function useBulkToggleThresholds(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (
            items: { groupId: string; thresholdId: string; enabled: boolean }[]
        ): Promise<void> => {
            const results = await Promise.allSettled(
                items.map(({ groupId, thresholdId, enabled }) =>
                    fetchWithRetry(
                        `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds/${thresholdId}`,
                        {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enabled }),
                        },
                        {
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
                        }
                    )
                )
            )
            const failures = results.filter((r) => r.status === 'rejected').length
            if (failures > 0) {
                throw new Error(`${failures} threshold(s) failed to toggle`)
            }
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Thresholds updated')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Bulk toggle partially failed', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Bulk delete multiple thresholds
 */
export function useBulkDeleteThresholds(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (
            items: { groupId: string; thresholdId: string }[]
        ): Promise<void> => {
            const results = await Promise.allSettled(
                items.map(({ groupId, thresholdId }) =>
                    fetchWithRetry(
                        `/api/guilds/${guildId}/groups/${groupId}/alert-thresholds/${thresholdId}`,
                        { method: 'DELETE' },
                        {
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
                        }
                    )
                )
            )
            const failures = results.filter((r) => r.status === 'rejected').length
            if (failures > 0) {
                throw new Error(`${failures} threshold(s) failed to delete`)
            }
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Thresholds deleted')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'alerts'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Bulk delete partially failed', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}
