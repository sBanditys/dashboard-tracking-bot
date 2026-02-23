'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'
import type { ImportPreview, ImportProgressEvent } from '@/types/import'

/**
 * Trigger a CSV template download for bulk account imports
 */
export function useImportTemplate(guildId: string) {
    const downloadTemplate = async () => {
        const response = await fetchWithRetry(
            `/api/guilds/${guildId}/accounts/template`
        )
        if (!response.ok) {
            throw new Error('Failed to download template')
        }

        // Preserve Content-Disposition filename from backend
        const disposition = response.headers.get('Content-Disposition')
        let filename = 'import-template.csv'
        if (disposition) {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (match?.[1]) {
                filename = match[1].replace(/['"]/g, '')
            }
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return { downloadTemplate }
}

/**
 * Upload a CSV file for import preview and validation
 */
export function useImportPreview(guildId: string) {
    const [isRetrying, setIsRetrying] = useState(false)
    const didRetryRef = useRef(false)

    const mutation = useMutation({
        mutationFn: async (file: File): Promise<ImportPreview> => {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/accounts/import`,
                {
                    method: 'POST',
                    body: formData,
                    // Do NOT set Content-Type — browser sets it with boundary for multipart
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
                throw new Error(parseApiError(body, 'Failed to preview import'))
            }
            return response.json()
        },
        onSuccess: () => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
            }
            didRetryRef.current = false
        },
        onError: (error) => {
            if (didRetryRef.current) {
                toast.dismiss('mutation-retry')
                toast.error('Failed to save changes. Please try again later.')
            } else {
                toast.error('Import preview failed', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                })
            }
            didRetryRef.current = false
        },
    })

    return { ...mutation, isRetrying }
}

/**
 * Confirm and execute an import with POST-SSE streaming progress
 *
 * Uses fetch + ReadableStream since EventSource does not support POST.
 * Calls onProgress for each parsed SSE event during processing.
 */
export function useConfirmImport(guildId: string) {
    const queryClient = useQueryClient()
    const [isConfirming, setIsConfirming] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const confirm = async (
        importId: string,
        onProgress: (event: ImportProgressEvent) => void
    ) => {
        setIsConfirming(true)
        setError(null)

        try {
            const response = await fetchWithRetry(
                `/api/guilds/${guildId}/accounts/import/confirm`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ importId }),
                    credentials: 'include',
                }
            )

            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}))
                throw new Error(parseApiError(errBody, 'Failed to confirm import'))
            }

            if (!response.body) {
                throw new Error('No response body for import stream')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                // Keep the last incomplete line in the buffer
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const raw = line.slice(6).trim()
                        if (!raw) continue
                        try {
                            const event = JSON.parse(raw) as ImportProgressEvent
                            onProgress(event)
                        } catch {
                            // Skip malformed SSE data lines
                        }
                    }
                }
            }

            // Process any remaining buffer content
            if (buffer.startsWith('data: ')) {
                const raw = buffer.slice(6).trim()
                if (raw) {
                    try {
                        const event = JSON.parse(raw) as ImportProgressEvent
                        onProgress(event)
                    } catch {
                        // Skip malformed final line
                    }
                }
            }

            // Invalidate accounts cache after successful import
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
        } catch (err) {
            const importError = err instanceof Error ? err : new Error(String(err))
            setError(importError)
            toast.error('Import failed', {
                description: importError.message,
            })
        } finally {
            setIsConfirming(false)
        }
    }

    return { confirm, isConfirming, error }
}
