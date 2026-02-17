'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type { EmailConfigResponse } from '@/types/alert'

/**
 * Fetch email config, recipients, and max recipient limit for a guild
 */
export function useEmailConfig(guildId: string) {
    return useQuery<EmailConfigResponse>({
        queryKey: ['guild', guildId, 'email-config'],
        queryFn: async () => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/email-config`)
            if (!response.ok) {
                throw new Error('Failed to fetch email config')
            }
            return response.json()
        },
        staleTime: 60 * 1000,
        enabled: !!guildId,
    })
}

/**
 * Update email delivery config (mode and digest hour)
 */
export function useUpdateEmailConfig(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: {
            deliveryMode: 'immediate' | 'digest'
            digestHour?: number | null
        }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/email-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update email config')
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success('Email delivery settings updated')
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            toast.error('Failed to update email settings', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}

/**
 * Add a new email recipient — triggers verification email
 */
export function useAddRecipient(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: { email: string }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/email-recipients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to add recipient')
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success('Verification email sent', {
                description: 'The recipient must verify their email address',
            })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            toast.error('Failed to add recipient', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}

/**
 * Remove an email recipient
 */
export function useRemoveRecipient(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (recipientId: string) => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/email-recipients/${recipientId}`,
                { method: 'DELETE' }
            )
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to remove recipient')
            }
        },
        onSuccess: () => {
            toast.success('Recipient removed')
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            toast.error('Failed to remove recipient', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}

/**
 * Resend verification email to a recipient
 */
export function useResendVerification(guildId: string) {
    return useMutation({
        mutationFn: async (recipientId: string) => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/email-recipients/${recipientId}/resend-verification`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }
            )
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to resend verification')
            }
            return response.json()
        },
        onSuccess: () => {
            toast.success('Verification email resent')
        },
        onError: (error) => {
            toast.error('Failed to resend verification', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}
