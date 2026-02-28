'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { parseApiError } from '@/lib/api-error'

/* ────────── Types ────────── */

export type RefreshProgressEvent =
  | { type: 'started'; totalRows: number; platforms: { instagram: number; tiktok: number; youtube: number } }
  | { type: 'batch_start'; platform: string; batchNum: number; totalBatches: number; batchSize: number }
  | { type: 'batch_complete'; platform: string; batchNum: number; totalBatches: number; itemsReturned: number; durationMs: number }
  | { type: 'batch_error'; platform: string; batchNum: number; totalBatches: number; error: string }
  | { type: 'platform_complete'; platform: string; total: number; updated: number; skipped: number; noData: number }
  | { type: 'complete'; downloadToken: string; summary: { updated: number; skipped: number; noData: number } }
  | { type: 'error'; message: string }

export type RefreshState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

/* ────────── Hook ────────── */

export function useRefresh() {
  const [state, setState] = useState<RefreshState>('idle')
  const [events, setEvents] = useState<RefreshProgressEvent[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [downloadToken, setDownloadToken] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startRefresh = useCallback(async (file: File) => {
    setState('uploading')
    setEvents([])
    setErrorMessage(null)
    setDownloadToken(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetchWithRetry(
        '/api/refresh',
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: controller.signal,
        }
      )

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(parseApiError(errBody, 'Failed to start CSV refresh'))
      }

      if (!response.body) {
        throw new Error('No response body for refresh stream')
      }

      setState('processing')

      // Read SSE stream via ReadableStream (EventSource doesn't support POST)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim()
            if (!raw) continue
            try {
              const event = JSON.parse(raw) as RefreshProgressEvent
              setEvents((prev) => [...prev, event])

              if (event.type === 'complete') {
                setDownloadToken(event.downloadToken)
                setState('complete')
              } else if (event.type === 'error') {
                setErrorMessage(event.message)
                setState('error')
              }
            } catch {
              // Skip malformed SSE data lines
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        const raw = buffer.slice(6).trim()
        if (raw) {
          try {
            const event = JSON.parse(raw) as RefreshProgressEvent
            setEvents((prev) => [...prev, event])
            if (event.type === 'complete') {
              setDownloadToken(event.downloadToken)
              setState('complete')
            } else if (event.type === 'error') {
              setErrorMessage(event.message)
              setState('error')
            }
          } catch {
            // Skip malformed final line
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState('idle')
        return
      }
      const message = err instanceof Error ? err.message : 'Unknown error'
      setErrorMessage(message)
      setState('error')
      toast.error('CSV refresh failed', { description: message })
    } finally {
      abortRef.current = null
    }
  }, [])

  const downloadResult = useCallback(async () => {
    if (!downloadToken) return

    try {
      const response = await fetchWithRetry(`/api/refresh/download/${downloadToken}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(parseApiError(errBody, 'Failed to download result'))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Extract filename from Content-Disposition or use default
      const disposition = response.headers.get('Content-Disposition')
      let filename = 'refreshed.xlsx'
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match?.[1]) {
          filename = match[1].replace(/['"]/g, '')
        }
      }

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed'
      toast.error('Download failed', { description: message })
    }
  }, [downloadToken])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState('idle')
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState('idle')
    setEvents([])
    setErrorMessage(null)
    setDownloadToken(null)
  }, [])

  return {
    state,
    events,
    errorMessage,
    downloadToken,
    startRefresh,
    downloadResult,
    cancel,
    reset,
  }
}
