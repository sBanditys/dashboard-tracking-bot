'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
import type { BulkOperationResult } from '@/types/bulk'

/**
 * Bulk delete accounts or posts
 */
export function useBulkDelete(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (params: { ids: string[]; dataType: 'accounts' | 'posts' }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/bulk/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
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
                throw new Error(parseApiError(body, 'Failed to delete items'))
            }

            return response.json() as Promise<BulkOperationResult>
        },
        onSuccess: (data, variables) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
            }
            didRetryRef.current = false
            // Reset relevant infinite queries based on data type (clears stale pages)
            if (variables.dataType === 'accounts') {
                queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })
            } else if (variables.dataType === 'posts') {
                queryClient.resetQueries({ queryKey: ['guild', guildId, 'posts'] })
            }
            // Always invalidate guild details (counts may have changed) — non-infinite query
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
            // BulkResultsToast handles success display
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Bulk delete failed', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Bulk reassign accounts to different brand/group
 */
export function useBulkReassign(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (params: {
            ids: string[]
            targetBrandId: string
            targetGroupId?: string
        }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/bulk/reassign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
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
                throw new Error(parseApiError(body, 'Failed to reassign accounts'))
            }

            return response.json() as Promise<BulkOperationResult>
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
            }
            didRetryRef.current = false
            // Reset accounts infinite query (clears stale pages after reassignment)
            queryClient.resetQueries({ queryKey: ['guild', guildId, 'accounts'] })
            // Invalidate non-infinite queries (brands account counts, guild details)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
            // BulkResultsToast handles success display
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Bulk reassign failed', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}
