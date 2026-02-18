'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import type {
    ExportRequest,
    ExportRecord,
    ExportHistoryResponse,
    ExportProgressEvent,
    ExportStatus,
} from '@/types/export'

function normalizeExportRecord(payload: unknown): ExportRecord {
    const candidate = (payload as { export?: ExportRecord })?.export ?? payload
    return candidate as ExportRecord
}

/**
 * Create a new export job
 */
export function useCreateExport(guildId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (request: ExportRequest) => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/exports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            }, { skipGlobalCooldown: true })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                if (response.status === 429) {
                    throw new Error(data.error || 'Too many exports. Please try again later.')
                }
                throw new Error(data.error || data.message || 'Failed to create export')
            }

            const payload = await response.json()
            const record = normalizeExportRecord(payload)

            if (!record?.id) {
                throw new Error('Export created but no export ID returned')
            }

            return record
        },
        onSuccess: () => {
            toast.success('Export created successfully', {
                description: 'Processing will begin shortly',
            })
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'exports'] })
        },
        onError: (error) => {
            // Refresh quota display after failed export attempt
            queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'exports'] })
            toast.error('Failed to create export', {
                description: error instanceof Error ? error.message : 'Unknown error',
            })
        },
    })
}

/**
 * Fetch export history with pagination
 */
export function useExportHistory(guildId: string, page: number = 1, limit: number = 20) {
    return useQuery<ExportHistoryResponse>({
        queryKey: ['guild', guildId, 'exports', page, limit],
        queryFn: async () => {
            const response = await fetchWithRetry(`/api/guilds/${guildId}/exports?page=${page}&limit=${limit}`)
            if (!response.ok) {
                throw new Error('Failed to fetch export history')
            }
            return response.json()
        },
        staleTime: 30 * 1000, // 30 seconds
        enabled: !!guildId,
    })
}

/**
 * Fetch status of a specific export with automatic polling for active exports
 */
export function useExportStatus(guildId: string, exportId: string | null) {
    return useQuery<ExportRecord>({
        queryKey: ['guild', guildId, 'exports', exportId],
        queryFn: async () => {
            if (!exportId) throw new Error('Export ID is required')

            const response = await fetchWithRetry(`/api/guilds/${guildId}/exports/${exportId}`)
            if (!response.ok) {
                throw new Error('Failed to fetch export status')
            }
            const payload = await response.json()
            return normalizeExportRecord(payload)
        },
        // Poll every 2 seconds while export is active, stop when complete/failed
        refetchInterval: (query) => {
            const data = query.state.data as ExportRecord | undefined
            if (!data) return false

            const isActive = data.status === 'pending' || data.status === 'processing'
            return isActive ? 2000 : false
        },
        enabled: !!guildId && !!exportId,
    })
}

/**
 * Real-time export progress via Server-Sent Events
 *
 * Connects to SSE endpoint for live progress updates during export processing.
 * Returns current progress state with automatic connection cleanup.
 */
export function useExportProgress(guildId: string, exportId: string | null) {
    const [progress, setProgress] = useState<number>(0)
    const [status, setStatus] = useState<ExportStatus>('pending')
    const [recordCount, setRecordCount] = useState<number>(0)
    const [message, setMessage] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (!guildId || !exportId) {
            return
        }

        const eventSource = new EventSource(`/api/guilds/${guildId}/exports/${exportId}/progress`)

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ExportProgressEvent
                setProgress(typeof data.progress === 'number' ? data.progress : 0)
                setStatus(data.status)
                setRecordCount(typeof data.recordCount === 'number' ? data.recordCount : 0)
                setMessage(data.message)
            } catch (error) {
                console.error('Failed to parse export progress event:', error)
            }
        }

        eventSource.onerror = () => {
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [guildId, exportId])

    return { progress, status, recordCount, message }
}
