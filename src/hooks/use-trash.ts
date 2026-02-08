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
 * Raw trash item from backend (snake_case)
 */
interface RawTrashItem {
    id: string
    name: string
    type: 'account' | 'post'
    platform: string | null
    deleted_at?: string
    deletedAt?: string
    deleted_by?: string | null
    deletedBy?: string | null
    days_until_purge?: number
    daysUntilPurge?: number
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

function normalizeTrashItem(raw: RawTrashItem): TrashItem {
    return {
        id: raw.id,
        name: raw.name,
        type: raw.type,
        platform: raw.platform,
        deletedAt: raw.deletedAt ?? raw.deleted_at ?? '',
        deletedBy: raw.deletedBy ?? raw.deleted_by ?? null,
        daysUntilPurge: raw.daysUntilPurge ?? raw.days_until_purge ?? 30,
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
            const data = await response.json()
            return {
                ...data,
                items: (data.items || []).map(normalizeTrashItem),
            }
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

            // 410 Gone means item was already permanently deleted — treat as success
            if (response.status === 410) {
                return { success: true, alreadyDeleted: true }
            }

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to permanently delete item')
            }

            return response.json()
        },
        onSuccess: (_data, variables) => {
            toast.success('Item permanently deleted')
            // Remove the item from trash cache immediately
            queryClient.setQueriesData<TrashResponse>(
                { queryKey: ['guild', guildId, 'trash'] },
                (old) => {
                    if (!old) return old
                    return {
                        ...old,
                        items: old.items.filter((item) => item.id !== variables.itemId),
                        pagination: {
                            ...old.pagination,
                            total: Math.max(0, old.pagination.total - 1),
                        },
                    }
                }
            )
            // Also invalidate to sync with server
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'trash'] })
        },
        onError: (error) => {
            toast.error('Failed to permanently delete item', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}
