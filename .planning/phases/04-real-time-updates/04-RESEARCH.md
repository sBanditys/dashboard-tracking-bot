# Phase 4: Real-Time Updates - Research

**Researched:** 2026-01-31
**Domain:** Server-Sent Events (SSE), Real-time UI, React Query Integration
**Confidence:** HIGH

## Summary

This phase implements real-time bot status updates using Server-Sent Events (SSE). The research confirms SSE is the correct choice for this use case: unidirectional server-to-client updates, simpler than WebSockets, and works over standard HTTP. The codebase already has a polling-based `BotStatus` component and `useGuildStatus` hook that update every 60 seconds - these will be enhanced with SSE for sub-5-second updates.

The recommended approach is to create an SSE proxy route in Next.js that forwards events from the backend, use the native `EventSource` API on the client (sufficient for this use case), and integrate with React Query by using `queryClient.setQueryData()` to update the cache when SSE events arrive. This provides the best of both worlds: real-time updates via SSE plus React Query's caching, loading states, and error handling.

**Primary recommendation:** Use native EventSource with React Query cache updates, not a replacement for React Query. The SSE connection pushes status changes; React Query manages state and provides fallback polling.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native EventSource | Browser API | SSE client connection | Built-in, handles reconnection, sufficient for simple status updates |
| @tanstack/react-query | 5.x (installed) | Cache management, state | Already used, provides setQueryData for real-time updates |
| date-fns | 4.x (installed) | Relative time formatting | Already installed, use formatDistanceToNow for "5 minutes ago" |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @microsoft/fetch-event-source | 2.0.1 | Enhanced SSE client | Only if POST requests or custom headers needed (not needed for this phase) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native EventSource | @microsoft/fetch-event-source | More control over retry, supports POST/headers, but adds dependency for simple GET-only use case |
| SSE | WebSockets | Two-way communication not needed; SSE simpler for one-way status updates |
| SSE | Polling | Already have 60s polling; SSE provides sub-5s latency without constant requests |

**Installation:**
```bash
# No new packages needed - using native EventSource and existing dependencies
# Optional if enhanced control needed later:
npm install @microsoft/fetch-event-source
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/guilds/[guildId]/status/
│   ├── route.ts           # Existing polling endpoint (keep)
│   └── stream/
│       └── route.ts       # NEW: SSE streaming endpoint
├── hooks/
│   ├── use-guilds.ts      # Existing, add SSE integration
│   └── use-sse.ts         # NEW: Reusable SSE hook
├── components/
│   └── bot-status.tsx     # Existing, enhance with SSE state
└── types/
    └── guild.ts           # Existing, add SSE event types
```

### Pattern 1: SSE Proxy Route in Next.js App Router

**What:** Next.js API route that proxies SSE from backend, forwarding events to client
**When to use:** When backend provides SSE and dashboard needs to add auth/proxy layer

```typescript
// Source: Next.js App Router SSE pattern (verified via WebSearch)
// app/api/guilds/[guildId]/status/stream/route.ts

export const runtime = 'nodejs'       // Required for streaming
export const dynamic = 'force-dynamic' // Prevents caching

export async function GET(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Fetch SSE from backend
  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/guilds/${guildId}/status/stream`
  const backendResponse = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  // Forward the stream to client
  return new Response(backendResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
```

### Pattern 2: Custom useSSE Hook with Reconnection

**What:** React hook that manages EventSource connection with exponential backoff
**When to use:** Any component needing SSE with proper cleanup and reconnection

```typescript
// Source: MDN EventSource + exponential backoff best practices
// hooks/use-sse.ts

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseSSEOptions {
  onMessage: (data: unknown) => void
  onError?: () => void
  maxRetries?: number
  initialRetryDelay?: number
  maxRetryDelay?: number
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useSSE(url: string | null, options: UseSSEOptions) {
  const {
    onMessage,
    onError,
    maxRetries = 3,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
  } = options

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!url) return

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
        onMessage(data)
      } catch {
        // Handle non-JSON messages if needed
      }
    }

    es.onerror = () => {
      es.close()
      setConnectionState('disconnected')

      if (retryCountRef.current < maxRetries) {
        // Exponential backoff with jitter
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
        onError?.()
      }
    }
  }, [url, onMessage, onError, maxRetries, initialRetryDelay, maxRetryDelay])

  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    eventSourceRef.current?.close()
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

  return { connectionState, reconnect }
}
```

### Pattern 3: SSE + React Query Integration

**What:** SSE updates React Query cache, provides fallback polling
**When to use:** Real-time updates with caching and state management

```typescript
// Source: TanStack Query documentation + community patterns
// hooks/use-guilds.ts (enhanced)

import { useQueryClient } from '@tanstack/react-query'
import { useSSE } from './use-sse'
import type { GuildStatus } from '@/types/guild'

export function useGuildStatusRealtime(guildId: string) {
  const queryClient = useQueryClient()

  // SSE connection for real-time updates
  const { connectionState, reconnect } = useSSE(
    guildId ? `/api/guilds/${guildId}/status/stream` : null,
    {
      onMessage: (data) => {
        // Update React Query cache directly
        queryClient.setQueryData<GuildStatus>(
          ['guild', guildId, 'status'],
          data as GuildStatus
        )
      },
    }
  )

  // Fallback polling query (fires on mount and when SSE disconnected)
  const query = useQuery<GuildStatus>({
    queryKey: ['guild', guildId, 'status'],
    queryFn: async () => {
      const response = await fetch(`/api/guilds/${guildId}/status`)
      if (!response.ok) throw new Error('Failed to fetch status')
      return response.json()
    },
    staleTime: 30 * 1000,
    refetchInterval: connectionState === 'connected' ? false : 60 * 1000,
    enabled: !!guildId,
  })

  return {
    ...query,
    connectionState,
    reconnect,
  }
}
```

### Anti-Patterns to Avoid

- **Replacing React Query with SSE:** Don't remove React Query. Use SSE to push updates into React Query cache. This preserves caching, loading states, and provides polling fallback.

- **Not handling SSE cleanup:** Always close EventSource in useEffect cleanup to prevent memory leaks and orphaned connections.

- **Infinite retry without backoff:** Native EventSource retries automatically but can overwhelm servers. Implement exponential backoff with max retries.

- **Ignoring Page Visibility:** Consider pausing SSE when tab is hidden to reduce server load (optional optimization).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time ("5 min ago") | Custom time calculation | date-fns formatDistanceToNow | Already installed, handles edge cases, i18n support |
| Pulse animation | Custom CSS keyframes | Tailwind animate-pulse | Built-in, accessible (respects prefers-reduced-motion) |
| Ping animation (badge effect) | Custom SVG animation | Tailwind animate-ping | Built-in, composable with other utilities |
| SSE message parsing | Manual string parsing | JSON.parse on event.data | SSE spec sends data as strings, just parse JSON |
| Reconnection logic | Manual setTimeout chains | Built into EventSource + custom backoff | Native API handles basic reconnection |

**Key insight:** The existing stack (Tailwind, date-fns, React Query) already solves most UI/state problems. SSE is the only new pattern needed.

## Common Pitfalls

### Pitfall 1: SSE Connections Pile Up on Route Changes
**What goes wrong:** User navigates between guilds, old SSE connections stay open
**Why it happens:** useEffect cleanup not called or EventSource.close() not invoked
**How to avoid:** Always close EventSource in useEffect cleanup; use URL as dependency
**Warning signs:** Browser DevTools Network tab shows multiple /stream connections

### Pitfall 2: SSE Blocked by Caching/CDN
**What goes wrong:** Events arrive all at once or not at all
**Why it happens:** Next.js or CDN caches the SSE response
**How to avoid:** Add `export const dynamic = 'force-dynamic'` and proper headers
**Warning signs:** First event works, subsequent events don't stream

### Pitfall 3: React Query Stale Data After SSE Update
**What goes wrong:** Component shows stale data even after SSE update
**Why it happens:** Component using different query key than SSE update target
**How to avoid:** Ensure queryClient.setQueryData uses exact same key as useQuery
**Warning signs:** DevTools shows updated cache but UI doesn't reflect

### Pitfall 4: Memory Leak from Unmounted Component State Updates
**What goes wrong:** "Can't perform state update on unmounted component" (React <18)
**Why it happens:** SSE callback tries to update state after component unmount
**How to avoid:** Clean up EventSource in useEffect; React 18+ handles gracefully
**Warning signs:** Console warnings, performance degradation over time

### Pitfall 5: Backend SSE Not Available
**What goes wrong:** Dashboard SSE proxy returns 404 or non-SSE response
**Why it happens:** Backend doesn't have SSE endpoint yet (dependency on Phase 2)
**How to avoid:** Graceful fallback to polling; detect non-SSE response and disable SSE
**Warning signs:** Immediate reconnection loops, error state

### Pitfall 6: HTTP/1.1 Connection Limit
**What goes wrong:** User opens multiple tabs, some tabs can't connect
**Why it happens:** Browsers limit SSE connections to 6 per domain on HTTP/1.1
**How to avoid:** Use HTTP/2 in production; consider single multiplexed connection
**Warning signs:** Works in 1-2 tabs, fails silently in additional tabs

## Code Examples

Verified patterns from official sources:

### SSE API Route (Next.js App Router)
```typescript
// Source: Next.js streaming patterns, verified working
// app/api/guilds/[guildId]/status/stream/route.ts

import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/guilds/${guildId}/status/stream`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      }
    )

    if (!response.ok) {
      return new Response('Backend error', { status: response.status })
    }

    // Proxy the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Nginx: disable buffering
      },
    })
  } catch {
    return new Response('Failed to connect', { status: 502 })
  }
}
```

### Enhanced BotStatus Component with SSE
```typescript
// Source: CONTEXT.md decisions + existing component
// components/bot-status.tsx (enhanced)

'use client'

import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface BotStatusProps {
  healthy: boolean
  lastHeartbeat?: string
  version?: string | null
  connectionState?: ConnectionState
  onReconnect?: () => void
  className?: string
}

export function BotStatus({
  healthy,
  lastHeartbeat,
  version,
  connectionState = 'connected',
  onReconnect,
  className,
}: BotStatusProps) {
  const getStatusDisplay = () => {
    if (connectionState === 'connecting') {
      return { dot: 'bg-gray-400', text: 'Connecting...', textColor: 'text-gray-400' }
    }
    if (connectionState === 'error') {
      return { dot: 'bg-yellow-500', text: 'Connection lost', textColor: 'text-yellow-400' }
    }
    if (healthy) {
      return { dot: 'bg-green-500 animate-pulse', text: 'Online', textColor: 'text-green-400' }
    }
    return { dot: 'bg-red-500', text: 'Offline', textColor: 'text-red-400' }
  }

  const status = getStatusDisplay()

  return (
    <button
      onClick={connectionState === 'error' ? onReconnect : undefined}
      className={cn(
        'flex items-center gap-2 transition-all',
        connectionState === 'error' && 'cursor-pointer hover:opacity-80',
        className
      )}
      disabled={connectionState !== 'error'}
    >
      <div className={cn('h-3 w-3 rounded-full', status.dot)} />
      <div className="flex flex-col items-start">
        <span className={cn('text-sm font-medium', status.textColor)}>
          {status.text}
        </span>
        {!healthy && lastHeartbeat && connectionState === 'connected' && (
          <span className="text-xs text-gray-500">
            Last seen: {formatDistanceToNow(new Date(lastHeartbeat), { addSuffix: true })}
            {version && ` - v${version}`}
          </span>
        )}
        {!healthy && connectionState === 'connected' && (
          <span className="text-xs text-gray-500">Check Discord</span>
        )}
        {connectionState === 'error' && (
          <span className="text-xs text-yellow-500">Click to retry</span>
        )}
      </div>
    </button>
  )
}
```

### Client-Side EventSource Usage
```typescript
// Source: MDN EventSource documentation
// Basic client usage pattern

useEffect(() => {
  if (!guildId) return

  const eventSource = new EventSource(`/api/guilds/${guildId}/status/stream`)

  eventSource.onopen = () => {
    console.log('SSE connected')
  }

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    // Update state or React Query cache
  }

  eventSource.onerror = () => {
    console.log('SSE error, will auto-reconnect')
    // Native EventSource auto-reconnects
  }

  return () => {
    eventSource.close()
  }
}, [guildId])
```

### Tailwind Animation for Status Indicator
```typescript
// Source: Tailwind CSS animation docs
// Discord-style status indicator

// Online: pulsing green dot
<div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />

// Offline: static red dot
<div className="h-3 w-3 rounded-full bg-red-500" />

// Connecting: gray dot
<div className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />

// For ping effect (optional badge-style notification):
<span className="relative flex h-3 w-3">
  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
</span>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling every 5-10 seconds | SSE for push, polling as fallback | Long established | Reduces server load, provides instant updates |
| Custom WebSocket wrapper | Native EventSource for simple cases | Always preferred for unidirectional | Less complexity, browser handles reconnection |
| Replace data fetching with SSE | SSE + React Query hybrid | TanStack Query v5 pattern | Best of both: real-time + caching + loading states |

**Deprecated/outdated:**
- Using `res.write()` in Pages Router API routes for SSE (use App Router ReadableStream instead)
- Ignoring `prefers-reduced-motion` for status animations (use Tailwind's `motion-safe:` variant)

## Open Questions

Things that couldn't be fully resolved:

1. **Backend SSE Endpoint Format**
   - What we know: Backend needs to provide `/api/v1/guilds/{guildId}/status/stream` SSE endpoint
   - What's unclear: Exact event format, heartbeat interval, event types
   - Recommendation: Implement proxy assuming JSON messages; coordinate with backend on exact schema

2. **Vercel Deployment Considerations**
   - What we know: Vercel has timeout limits (60s Pro); SSE connections may drop
   - What's unclear: Whether production deployment is on Vercel or self-hosted
   - Recommendation: Implement reconnection logic regardless; works for both scenarios

3. **Multi-Tab Behavior**
   - What we know: HTTP/1.1 limits to 6 connections per domain; HTTP/2 handles ~100
   - What's unclear: Production HTTP version, whether users open many tabs
   - Recommendation: Graceful degradation - SSE fails silently in excess tabs, polling works

## Sources

### Primary (HIGH confidence)
- MDN EventSource API - https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- Tailwind CSS Animation - https://tailwindcss.com/docs/animation
- TanStack Query Documentation - https://tanstack.com/query/v5/docs

### Secondary (MEDIUM confidence)
- Next.js SSE discussions - https://github.com/vercel/next.js/discussions/48427
- @microsoft/fetch-event-source - https://github.com/Azure/fetch-event-source
- Upstash SSE streaming guide - https://upstash.com/blog/sse-streaming-llm-responses

### Tertiary (LOW confidence)
- Medium articles on SSE patterns (verify implementations before using)
- Community patterns for TanStack Query + SSE integration

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using native APIs and existing dependencies
- Architecture: HIGH - Established SSE + React Query pattern
- Pitfalls: MEDIUM - Based on community reports, some may not apply to this specific setup

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (30 days - SSE and React Query patterns are stable)
