'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseSSEOptions {
    onMessage: (data: unknown) => void
    onError?: () => void
    maxRetries?: number
    initialRetryDelay?: number
    maxRetryDelay?: number
}

/**
 * React hook for Server-Sent Events (SSE) connections with exponential backoff reconnection.
 *
 * @param url - SSE endpoint URL, or null to disable connection
 * @param options - Configuration options
 * @returns Connection state and reconnect function
 */
export function useSSE(url: string | null, options: UseSSEOptions) {
    const {
        onMessage,
        onError,
        maxRetries = 3,
        initialRetryDelay = 1000,
        maxRetryDelay = 30000,
    } = options

    const [connectionState, setConnectionState] = useState<ConnectionState>(
        url ? 'connecting' : 'disconnected'
    )
    const eventSourceRef = useRef<EventSource | null>(null)
    const retryCountRef = useRef(0)
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Store callbacks in refs to avoid effect re-runs
    const onMessageRef = useRef(onMessage)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onMessageRef.current = onMessage
        onErrorRef.current = onError
    }, [onMessage, onError])

    const connect = useCallback(() => {
        if (!url) {
            setConnectionState('disconnected')
            return
        }

        setConnectionState('connecting')
        const es = new EventSource(url)
        eventSourceRef.current = es

        es.onopen = () => {
            setConnectionState('connected')
            retryCountRef.current = 0 // Reset on successful connection
        }

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                onMessageRef.current(data)
            } catch {
                // Handle non-JSON messages - pass raw data
                onMessageRef.current(event.data)
            }
        }

        es.onerror = () => {
            es.close()
            setConnectionState('disconnected')

            if (retryCountRef.current < maxRetries) {
                // Exponential backoff with 50% jitter
                const delay = Math.min(
                    initialRetryDelay * Math.pow(2, retryCountRef.current),
                    maxRetryDelay
                )
                const jitter = delay * 0.5 * Math.random()

                retryTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current++
                    connect()
                }, delay + jitter)
            } else {
                setConnectionState('error')
                onErrorRef.current?.()
            }
        }
    }, [url, maxRetries, initialRetryDelay, maxRetryDelay])

    const reconnect = useCallback(() => {
        retryCountRef.current = 0
        eventSourceRef.current?.close()
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
        }
        connect()
    }, [connect])

    useEffect(() => {
        connect()

        return () => {
            eventSourceRef.current?.close()
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
            }
        }
    }, [connect])

    // Handle tab visibility changes - close connection when hidden, reconnect when visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab is hidden - close connection to prevent leaks
                eventSourceRef.current?.close()
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current)
                    retryTimeoutRef.current = null
                }
                setConnectionState('disconnected')
            } else if (url) {
                // Tab is visible again - reconnect
                connect()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [url, connect])

    return { connectionState, reconnect }
}
