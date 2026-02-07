'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BulkOperationResult } from '@/types/bulk'

/**
 * Bulk delete accounts or posts
 */
export function useBulkDelete(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: { ids: string[]; dataType: 'accounts' | 'posts' }) => {
            const response = await fetch(`/api/guilds/${guildId}/bulk/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to delete items')
            }

            return response.json() as Promise<BulkOperationResult>
        },
        onSuccess: (data, variables) => {
            // Invalidate relevant queries based on data type
            if (variables.dataType === 'accounts') {
                queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
            } else if (variables.dataType === 'posts') {
                queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'posts'] })
            }
            // Always invalidate guild details (counts may have changed)
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
    })
}

/**
 * Bulk reassign accounts to different brand/group
 */
export function useBulkReassign(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (params: {
            ids: string[]
            targetBrandId: string
            targetGroupId?: string
        }) => {
            const response = await fetch(`/api/guilds/${guildId}/bulk/reassign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to reassign accounts')
            }

            return response.json() as Promise<BulkOperationResult>
        },
        onSuccess: () => {
            // Reassignment affects accounts, brands (account counts), and guild details
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'brands'] })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
        },
    })
}
