'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type ConnectionState = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error'

interface UseSSEOptions {
    onMessage: (data: unknown) => void
    onError?: () => void
    maxRetries?: number
    initialRetryDelay?: number
    maxRetryDelay?: number
    /** Minimum delay between reconnection attempts after visibility change (ms) */
    reconnectCooldown?: number
}

// Heartbeat constants
const HEARTBEAT_TIMEOUT = 45_000        // 45s silence = stalled connection
const HEARTBEAT_CHECK_INTERVAL = 5_000  // poll every 5s
const HIDE_GRACE_MS = 15_000            // 15s grace period before disconnecting on tab hide

/**
 * React hook for Server-Sent Events (SSE) connections with exponential backoff reconnection.
 *
 * Features:
 * - Heartbeat timeout: closes and reconnects stalled connections after 45s of silence (SSE-01)
 * - Generation counter: prevents dual EventSource instances during rapid tab switches (SSE-02)
 * - 15-second tab-hide grace period: avoids disconnect/reconnect churn for brief tab switches
 * - Retry reset on tab return after grace expiry: recovers exhausted retries (SSE-03)
 * - 'reconnecting' state: visible feedback during stall-triggered reconnects
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
        initialRetryDelay = 2000,
        maxRetryDelay = 60000,
        reconnectCooldown = 5000,
    } = options

    const [connectionState, setConnectionState] = useState<ConnectionState>(
        url ? 'connecting' : 'disconnected'
    )
    const eventSourceRef = useRef<EventSource | null>(null)
    const retryCountRef = useRef(0)
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastConnectTimeRef = useRef<number>(0)

    // Generation counter — prevents stale connections from interfering with active ones (SSE-02)
    const connectGenerationRef = useRef<number>(0)
    // Last data event timestamp — used to detect stalled connections (SSE-01)
    const lastEventTimeRef = useRef<number>(Date.now())
    // Heartbeat polling interval handle (SSE-01)
    const heartbeatCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
    // Tab-hide grace timer — 15s before actually closing the connection
    const hideGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Ref to always hold the latest connect function — breaks circular dep between startHeartbeat and connect
    const connectRef = useRef<() => void>(() => {})

    // Store callbacks in refs to avoid effect re-runs
    const onMessageRef = useRef(onMessage)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onMessageRef.current = onMessage
        onErrorRef.current = onError
    }, [onMessage, onError])

    /** Clear the heartbeat check interval */
    const clearHeartbeat = useCallback(() => {
        if (heartbeatCheckRef.current !== null) {
            clearInterval(heartbeatCheckRef.current)
            heartbeatCheckRef.current = null
        }
    }, [])

    /** Start the heartbeat check interval for a given connection generation */
    const startHeartbeat = useCallback((generation: number) => {
        clearHeartbeat()
        lastEventTimeRef.current = Date.now()

        heartbeatCheckRef.current = setInterval(() => {
            const elapsed = Date.now() - lastEventTimeRef.current
            if (elapsed > HEARTBEAT_TIMEOUT) {
                if (connectGenerationRef.current !== generation) {
                    // Stale heartbeat — a newer connection took over, stop this interval
                    clearInterval(heartbeatCheckRef.current!)
                    heartbeatCheckRef.current = null
                    return
                }
                // Genuine stall detected on the active connection
                eventSourceRef.current?.close()
                clearHeartbeat()
                setConnectionState('reconnecting')
                connectRef.current()
            }
        }, HEARTBEAT_CHECK_INTERVAL)
    }, [clearHeartbeat])

    const connect = useCallback(() => {
        if (!url) {
            setConnectionState('disconnected')
            return
        }

        // Increment generation — any previous in-flight connection is now stale (SSE-02)
        const generation = ++connectGenerationRef.current
        console.warn(`[SSE] connect() gen=${generation} retryCount=${retryCountRef.current}`)

        // Clear any existing heartbeat from the previous generation
        clearHeartbeat()

        // Enforce cooldown between connection attempts to avoid rate limit storms
        const now = Date.now()
        const timeSinceLastConnect = now - lastConnectTimeRef.current
        if (timeSinceLastConnect < reconnectCooldown && lastConnectTimeRef.current > 0) {
            const waitTime = reconnectCooldown - timeSinceLastConnect
            retryTimeoutRef.current = setTimeout(() => {
                lastConnectTimeRef.current = Date.now()
                connect()
            }, waitTime)
            return
        }
        lastConnectTimeRef.current = now

        // Preserve 'reconnecting' state if set by heartbeat stall detection;
        // otherwise this is an initial or retry connection → 'connecting'
        setConnectionState((prev) => prev === 'reconnecting' ? 'reconnecting' : 'connecting')
        const es = new EventSource(url)
        eventSourceRef.current = es

        // Guard against EventSource firing onerror multiple times
        // (browser auto-reconnect can fire additional errors before close takes effect)
        let errorHandled = false

        es.onopen = () => {
            // Stale connection — a newer generation has already taken over
            if (connectGenerationRef.current !== generation) {
                es.close()
                return
            }
            setConnectionState('connected')
            retryCountRef.current = 0
            lastEventTimeRef.current = Date.now()
            startHeartbeat(generation)
        }

        es.onmessage = (event) => {
            // Stale connection — discard
            if (connectGenerationRef.current !== generation) {
                es.close()
                return
            }
            // Reset silence timer on every data event
            lastEventTimeRef.current = Date.now()
            try {
                const data = JSON.parse(event.data)
                onMessageRef.current(data)
            } catch {
                // Handle non-JSON messages - pass raw data
                onMessageRef.current(event.data)
            }
        }

        es.onerror = () => {
            // Prevent double-processing — browser may fire multiple onerror events
            if (errorHandled) return
            errorHandled = true

            const isStale = connectGenerationRef.current !== generation
            console.warn(`[SSE] onerror gen=${generation} current=${connectGenerationRef.current} stale=${isStale} retryCount=${retryCountRef.current}`)

            // Stale connection — discard
            if (isStale) {
                es.close()
                return
            }
            es.close()
            clearHeartbeat()

            if (retryCountRef.current < maxRetries) {
                setConnectionState('disconnected')
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
                console.warn(`[SSE] RETRIES EXHAUSTED — setting error state`)
                setConnectionState('error')
                onErrorRef.current?.()
            }
        }
    }, [url, maxRetries, initialRetryDelay, maxRetryDelay, reconnectCooldown, clearHeartbeat, startHeartbeat])

    // Keep connectRef in sync so startHeartbeat always calls the latest connect
    connectRef.current = connect

    const reconnect = useCallback(() => {
        retryCountRef.current = 0
        eventSourceRef.current?.close()
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
            retryTimeoutRef.current = null
        }
        clearHeartbeat()
        connect()
    }, [connect, clearHeartbeat])

    useEffect(() => {
        connect()

        return () => {
            eventSourceRef.current?.close()
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
            }
            clearHeartbeat()
            if (hideGraceTimerRef.current) {
                clearTimeout(hideGraceTimerRef.current)
            }
        }
    }, [connect, clearHeartbeat])

    // Handle tab visibility changes with 15-second grace period
    useEffect(() => {
        const handleVisibilityChange = () => {
            console.warn(`[SSE] visibility changed: hidden=${document.hidden} retryCount=${retryCountRef.current}`)
            if (document.hidden) {
                // Tab hidden — clear any pending retry and start grace period
                if (retryTimeoutRef.current) {
                    clearTimeout(retryTimeoutRef.current)
                    retryTimeoutRef.current = null
                }
                // Start grace period — don't disconnect immediately
                hideGraceTimerRef.current = setTimeout(() => {
                    // Null the ref FIRST so tab-return knows grace has expired
                    hideGraceTimerRef.current = null
                    eventSourceRef.current?.close()
                    clearHeartbeat()
                    setConnectionState('disconnected')
                }, HIDE_GRACE_MS)
            } else {
                // Tab visible again
                if (hideGraceTimerRef.current !== null) {
                    // Within grace period — cancel the pending disconnect, connection still open
                    clearTimeout(hideGraceTimerRef.current)
                    hideGraceTimerRef.current = null
                    // Do nothing — connection is still alive
                } else {
                    // Grace period already fired (tab was hidden > 15s) — reconnect
                    // Reset retry count so exhausted retries don't block recovery (SSE-03)
                    retryCountRef.current = 0
                    connect()
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (hideGraceTimerRef.current) {
                clearTimeout(hideGraceTimerRef.current)
            }
        }
    }, [url, connect, clearHeartbeat])

    // Handle browser online/offline events — immediate detection when network drops
    useEffect(() => {
        const handleOffline = () => {
            console.warn(`[SSE] OFFLINE event`)
            eventSourceRef.current?.close()
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current)
                retryTimeoutRef.current = null
            }
            clearHeartbeat()
            setConnectionState('disconnected')
        }

        const handleOnline = () => {
            console.warn(`[SSE] ONLINE event`)
            // Network restored — reset retries and reconnect
            retryCountRef.current = 0
            connect()
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [connect, clearHeartbeat])

    return { connectionState, reconnect }
}
