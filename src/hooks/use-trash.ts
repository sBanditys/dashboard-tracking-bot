'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'

/**
 * Trash item representation
 */
export interface TrashItem {
    id: string
    name: string
    type: 'account' | 'post'
    platform: string | null
    deletedAt: string
    deletedBy: string | null
    daysUntilPurge: number
}

/**
 * Trash listing response
 */
interface TrashResponse {
    items: TrashItem[]
    pagination: {
        page: number
        limit: number
        total: number
        total_pages: number
    }
}

/**
 * Fetch paginated trash items with optional type filter
 */
export function useTrashItems(
    guildId: string,
    type?: 'accounts' | 'posts',
    page: number = 1,
    limit: number = 50
) {
    return useQuery<TrashResponse>({
        queryKey: ['guild', guildId, 'trash', type, page, limit],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.set('page', page.toString())
            params.set('limit', limit.toString())
            if (type) params.set('type', type)

            const response = await fetchWithRetry(`/api/guilds/${guildId}/trash?${params.toString()}`)
            if (!response.ok) {
                throw new Error('Failed to fetch trash items')
            }
            return response.json()
        },
        staleTime: 60 * 1000, // 1 minute
        enabled: !!guildId,
    })
}

/**
 * Restore an item from trash
 */
export function useRestoreItem(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: { itemId: string; dataType: 'accounts' | 'posts' }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/trash/${params.itemId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dataType: params.dataType }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to restore item')
            }

            return response.json()
        },
        onSuccess: (data, variables) => {
            toast.success('Item restored successfully')
            // Invalidate trash, the restored data type list, and guild details
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'trash'] })
            if (variables.dataType === 'accounts') {
                queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
            } else if (variables.dataType === 'posts') {
                queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'posts'] })
            }
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
        onError: (error) => {
            toast.error('Failed to restore item', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}

/**
 * Permanently delete an item from trash
 */
export function usePermanentDelete(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: { itemId: string; dataType: 'accounts' | 'posts' }) => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/trash/${params.itemId}?dataType=${params.dataType}`,
                {
                    method: 'DELETE',
                }
            )

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to permanently delete item')
            }

            return response.json()
        },
        onSuccess: () => {
            toast.success('Item permanently deleted')
            // Only invalidate trash query (item is gone permanently)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'trash'] })
        },
        onError: (error) => {
            toast.error('Failed to permanently delete item', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}
