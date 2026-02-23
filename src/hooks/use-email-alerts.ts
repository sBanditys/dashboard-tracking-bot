'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
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
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (data: {
            deliveryMode: 'immediate' | 'digest'
            digestHour?: number | null
        }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/email-config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
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
                throw new Error(parseApiError(body, 'Failed to update email config'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Email delivery settings updated')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to update email settings', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Add a new email recipient — triggers verification email
 */
export function useAddRecipient(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (data: { email: string }) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/email-recipients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
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
                throw new Error(parseApiError(body, 'Failed to add recipient'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Verification email sent', {
                    description: 'The recipient must verify their email address',
                })
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to add recipient', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Remove an email recipient
 */
export function useRemoveRecipient(guildId: string) {
    const queryClient = useQueryClient()
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (recipientId: string) => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/email-recipients/${recipientId}`,
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
                throw new Error(parseApiError(body, 'Failed to remove recipient'))
            }
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Recipient removed')
            }
            didRetryRef.current = false
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'email-config'] })
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to remove recipient', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Resend verification email to a recipient
 */
export function useResendVerification(guildId: string) {
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (recipientId: string) => {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/email-recipients/${recipientId}/resend-verification`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                throw new Error(parseApiError(body, 'Failed to resend verification'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.success('Changes saved')
            } else {
                toast.success('Verification email resent')
            }
            didRetryRef.current = false
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Failed to resend verification', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}
