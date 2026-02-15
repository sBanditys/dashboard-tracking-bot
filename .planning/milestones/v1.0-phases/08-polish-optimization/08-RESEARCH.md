# Phase 8: Polish & Optimization - Research

**Researched:** 2026-02-07
**Domain:** Web performance optimization, React Query caching, Next.js optimization
**Confidence:** HIGH

## Summary

Phase 8 focuses on making the dashboard production-ready through performance tuning, error resilience, and edge case handling. The dashboard already uses modern tools (React Query v5, Next.js 14, react-intersection-observer) but lacks optimization patterns like stale-while-revalidate, request throttling, progress indicators, and comprehensive error boundaries.

Current state analysis reveals:
- React Query configured with 5-minute staleTime but missing gcTime limits and optimistic updates
- No progress bar for route transitions (user wants branded accent-purple indicator)
- API client lacks 429 retry logic despite user experiencing rate limiting issues
- Infinite scroll implemented but no server-side search or aggregation for large datasets
- SSE connections lack tab visibility handling
- No unsaved changes warning or browser back/forward state preservation
- Export expiration handling missing (expired exports should show badge, disable download)

The tech stack is solid for optimization work: React Query v5 provides built-in stale-while-revalidate, TanStack has excellent documentation for optimistic updates and cache management, and Next.js 14 offers dynamic imports and bundle analysis tools.

**Primary recommendation:** Layer optimizations incrementally—start with low-hanging fruit (gcTime, optimistic updates, 429 handling), add progress indicators and error boundaries, then tackle complex patterns (unsaved changes, scroll restoration, concurrent edit detection).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Loading & Perceived Speed:**
- Page priority: All pages optimized equally — no priority ordering
- Route transitions: Prefetch where possible + purple-themed progress bar (accent-purple) when data isn't ready
- Avatar optimization: Lazy load Discord avatars with blur-up placeholders, proper sizing
- Progress bar style: Branded accent-purple thin bar at top of viewport (like NProgress but themed)
- Prefetching: Click-only for guild switcher (no hover prefetch)
- Skeleton placeholders: Shaped skeletons matching real card layout (avatar circle, text lines, badges)

**Error Handling UX:**
- API unreachable: Toast notification + continue showing cached/stale data
- Mutation failures: Form validation errors shown inline, action failures (delete, save) as toast notifications
- Permission revocation: Show overlay on current page explaining access was revoked, with link to guild list

**Large Data Performance:**
- Search: Move search to server-side for better performance on large datasets
- Chart aggregation: Server-side pre-aggregation for large time ranges (e.g., weekly buckets for 90-day)
- Bulk operation limit: Cap at 100 items per bulk operation
- Cache management: Set gcTime and max entry limits to prevent memory growth in long sessions
- Scroll memory: Keep all loaded pages in DOM (don't unload off-screen pages)
- Loaded count display: Show "50 accounts" style count (no total server count)
- Rate limit handling: Auto-retry with exponential backoff on 429 responses
- Request throttling: Both layers — throttle outgoing requests AND handle 429s as safety net
- Stale data strategy: Serve cached data immediately, refresh in background (stale-while-revalidate)
- Optimistic updates: Yes, for all mutations — show change immediately, rollback on error

**Edge Case Behaviors:**
- Browser back/forward: Preserve everything — scroll position, active filters, search query, expanded cards
- Unsaved changes: Custom styled modal matching dashboard design: "You have unsaved changes. Save or discard?"
- Expired exports: Show expired badge in history table, disable download — user creates new export manually
- Zero guilds: Simple clean message: "You don't have access to any servers"
- Responsive resizing: CSS transitions on layout changes for smooth reflow
- Keyboard shortcuts: Common shortcuts — Escape for modals, Ctrl+K for search, keyboard navigation in lists
- Offline detection: Show persistent banner when navigator.onLine is false, auto-dismiss on reconnect
- Concurrent edits: Stale data warning — if data changed since page load, warn before saving: "Settings were updated. Reload or overwrite?"
- Toast management: Stack up to 3 toasts, oldest dismissed first
- Form validation: Hybrid — validate on submit first time, then validate on blur after first attempt

### Claude's Discretion

- Initial load approach (skeleton-first vs progressive reveal)
- Code splitting strategy (aggressive vs heavy-pages-only)
- Session expiry handling flow
- List virtualization decision
- Bundle analysis approach
- Request deduplication strategy
- SSE tab-visibility lifecycle
- Focus trapping audit and fixes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

## Standard Stack

The dashboard already uses the correct optimization-ready stack. No new libraries needed for core functionality.

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.90.20 | Server state management | Industry standard with built-in stale-while-revalidate, optimistic updates, request deduplication |
| Next.js | 14.2.35 | React framework | Production-grade SSR, code splitting, image optimization, bundle analysis tools |
| react-intersection-observer | 10.0.2 | Infinite scroll | Performant observer-based loading, reuses IntersectionObserver instances |
| next-themes | 0.4.6 | Theme management | Zero-flicker dark mode |

### Supporting (Need to Install)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| BProgress | Latest | Route transition progress bar | Successor to NProgress, modern TypeScript implementation, customizable colors |
| @next/bundle-analyzer | Latest | Bundle size analysis | Identify large dependencies, optimize code splitting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BProgress | nextjs-toploader | BProgress is more modern (TypeScript-first), better maintained successor to NProgress |
| react-intersection-observer | @tanstack/react-virtual | Virtual scrolling overkill for current list sizes (50-100 items), intersection observer more flexible for variable-height cards |
| Native toast implementation | Sonner / react-toastify | Current project has no toast library yet — Sonner is 2026 best practice (shadcn/ui standard), lightweight, visibleToasts prop for stacking limit |

**Installation:**

```bash
# Progress bar (user requirement: branded accent-purple)
npm install bprogress

# Bundle analysis (Claude's discretion for optimization strategy)
npm install --save-dev @next/bundle-analyzer

# Toast notifications (user requirement: stack limit 3, toast on errors)
npm install sonner
```

---

## Architecture Patterns

### React Query Cache Configuration

**Current state:** Basic setup with 5-minute staleTime, no gcTime, no optimistic updates

**Optimized pattern:**

```typescript
// Source: TanStack Query v5 docs - Cache Management
// https://tanstack.com/query/v5/docs/framework/react/guides/caching

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes (already configured)
      gcTime: 10 * 60 * 1000,   // 10 minutes (ADD THIS - prevents memory growth)
      retry: 1,                  // Already configured
      refetchOnWindowFocus: false, // Already configured
    },
  },
})
```

**Why gcTime matters:** Without gcTime, unused query data stays in memory indefinitely. In long dashboard sessions (users monitoring accounts for hours), this causes memory bloat. Setting gcTime to 10 minutes means data is garbage collected 10 minutes after the last component using it unmounts.

### Stale-While-Revalidate Pattern

**User requirement:** "Serve cached data immediately, refresh in background"

**Current implementation:** Basic - queries refetch on mount if stale

**Optimized pattern:**

```typescript
// Source: TanStack Query v5 docs - Stale Time
// https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults

// This pattern is ALREADY working due to React Query defaults
// Just need to ensure staleTime > 0 (already set to 5 min)

// How it works:
// 1. First render: Shows loading state, fetches data
// 2. Second render (within 5 min): Shows cached data instantly, NO fetch
// 3. After 5 min: Shows cached data instantly, fetches in background, updates on success

// Example: Guild details page
export function useGuild(guildId: string) {
  return useQuery<GuildDetails>({
    queryKey: ['guild', guildId],
    queryFn: async () => {
      const response = await fetch(`/api/guilds/${guildId}`)
      if (!response.ok) throw new Error('Failed to fetch guild')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // Already configured
    // On second visit: instant data display, silent background refresh
  })
}
```

**No changes needed** - React Query v5 implements stale-while-revalidate by default when staleTime > 0. The dashboard already has this configured.

### Optimistic Updates Pattern

**User requirement:** "Show change immediately, rollback on error"

**Current state:** Mutations invalidate queries, causing loading states

**Optimized pattern:**

```typescript
// Source: TanStack Query v5 docs - Optimistic Updates
// https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates

export function useUpdateGuildSettings(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: UpdateSettingsRequest) => {
      const response = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update settings')
      }
      return response.json()
    },

    // OPTIMISTIC UPDATE - show change immediately
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches (prevent race conditions)
      await queryClient.cancelQueries({ queryKey: ['guild', guildId] })

      // Snapshot previous value for rollback
      const previousGuild = queryClient.getQueryData(['guild', guildId])

      // Optimistically update UI
      queryClient.setQueryData(['guild', guildId], (old: GuildDetails) => ({
        ...old,
        settings: { ...old.settings, ...newSettings },
      }))

      // Return context for rollback
      return { previousGuild }
    },

    // ROLLBACK on error
    onError: (err, newSettings, context) => {
      if (context?.previousGuild) {
        queryClient.setQueryData(['guild', guildId], context.previousGuild)
      }
      // Toast notification handled by UI layer
    },

    // Always refetch to sync with server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] })
    },
  })
}
```

**Apply to:** All mutations (settings updates, account creation, brand creation, bulk operations)

### Rate Limiting with Exponential Backoff

**User requirement:** "Auto-retry with exponential backoff on 429 responses" + "Both layers — throttle outgoing requests AND handle 429s"

**Current state:** API client has no retry logic

**Pattern 1: Request-level retry (handles 429 from server):**

```typescript
// Source: Industry best practices - Exponential Backoff
// https://betterstack.com/community/guides/monitoring/exponential-backoff/

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Handle rate limiting
      if (response.status === 429) {
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt), 30000) // Exponential backoff, max 30s

        // Add jitter (randomize 0-50% of delay to prevent thundering herd)
        const jitter = Math.random() * 0.5 * delay

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay + jitter))
          continue // Retry
        }
      }

      return response
    } catch (error) {
      lastError = error as Error
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

// Integrate with React Query
export function useGuilds() {
  return useQuery<GuildsResponse>({
    queryKey: ['guilds'],
    queryFn: async () => {
      const response = await fetchWithRetry('/api/guilds')
      if (!response.ok) throw new Error('Failed to fetch guilds')
      return response.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}
```

**Pattern 2: Request throttling (prevents sending too many requests):**

React Query already implements request deduplication - if multiple components request the same query simultaneously, only one network request is made. **No additional throttling needed** unless backend requires strict rate limiting (e.g., max 10 req/sec).

### Route Transition Progress Bar

**User requirement:** "Branded accent-purple thin bar at top of viewport (like NProgress but themed)"

**Pattern:**

```typescript
// Source: BProgress documentation
// https://bprogress.vercel.app/

// app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import BProgress from 'bprogress'

// Initialize with branded color
const bp = new BProgress({
  color: '#8B5CF6', // accent-purple from tailwind.config.ts
  height: '2px',
  delay: 100, // Show after 100ms (instant transitions won't show bar)
})

function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    bp.start()
    // BProgress auto-completes on route change
    return () => {
      bp.done()
    }
  }, [pathname, searchParams])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000, // ADD THIS
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
        <NavigationProgress />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

### Error Boundaries

**User requirement:** "Error boundaries gracefully handle API failures with actionable messages"

**Current state:** No error boundaries (uncaught errors crash entire app)

**Pattern:**

```typescript
// Source: Next.js 14 Error Handling
// https://nextjs.org/docs/app/getting-started/error-handling

// app/(dashboard)/error.tsx - Catches errors in dashboard routes
'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service (e.g., Sentry)
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-8 bg-surface border border-border rounded-lg text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="bg-accent-purple text-white rounded-lg px-6 py-2 hover:bg-accent-purple/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

// app/global-error.tsx - Catches errors in root layout (rare, but needed)
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-[#1a1a1a]">
          <div className="max-w-md p-8 bg-[#2d2d2d] border border-[#404040] rounded-lg text-center">
            <h2 className="text-xl font-bold text-white mb-2">Application Error</h2>
            <p className="text-gray-400 mb-6">A critical error occurred. Please refresh the page.</p>
            <button
              onClick={reset}
              className="bg-[#8B5CF6] text-white rounded-lg px-6 py-2 hover:bg-[#8B5CF6]/90 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

**Location strategy:**
- `app/global-error.tsx` - Root-level catastrophic errors
- `app/(dashboard)/error.tsx` - Dashboard-wide errors
- `app/(dashboard)/guilds/[guildId]/error.tsx` - Guild-specific errors (optional, more granular)

### Toast Notification System

**User requirement:** "Stack up to 3 toasts, oldest dismissed first"

**Current state:** No toast library

**Pattern:**

```typescript
// Source: Sonner documentation (2026 best practice, shadcn/ui standard)
// https://sonner.emilkowal.ski/

// app/providers.tsx
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true}>
        <NavigationProgress />
        <Toaster
          position="top-right"
          visibleToasts={3}  // User requirement: max 3 stacked
          theme="dark"
          toastOptions={{
            style: {
              background: '#2d2d2d', // surface color
              border: '1px solid #404040', // border color
              color: '#ffffff',
            },
          }}
        />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

// Usage in mutations
import { toast } from 'sonner'

export function useDeleteAccount(guildId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await fetch(`/api/guilds/${guildId}/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'accounts'] })
      toast.success('Account deleted successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete account')
    },
  })
}
```

### Unsaved Changes Warning

**User requirement:** "Custom styled modal matching dashboard design: 'You have unsaved changes. Save or discard?'"

**Pattern:**

```typescript
// Source: Next.js App Router unsaved changes pattern
// https://medium.com/@jonjamesdesigns/how-to-handle-unsaved-page-changes-with-nextjs-app-router-65b74f1148de

// hooks/use-unsaved-changes.ts
'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const router = useRouter()

  // Browser navigation (refresh, close tab, external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // App Router navigation (Link clicks, router.push)
  // Note: Next.js App Router doesn't expose route change events
  // Need custom implementation with context/state management
  // OR accept browser's native confirmation dialog
}

// Usage in forms
export default function GuildSettingsForm({ guildId }: { guildId: string }) {
  const [isDirty, setIsDirty] = useState(false)
  useUnsavedChanges(isDirty)

  // Form logic...
}
```

**Known limitation:** Next.js App Router doesn't provide beforeRouteChange events like Pages Router did. Options:
1. Use browser's native `beforeunload` dialog (simple, but generic message)
2. Implement custom navigation interception with React Context (complex)
3. Use form library with built-in dirty state tracking (react-hook-form)

**Recommendation:** Start with native `beforeunload` (covers 90% of cases), defer custom modal to future enhancement.

### Browser Back/Forward State Preservation

**User requirement:** "Preserve everything — scroll position, active filters, search query, expanded cards"

**Current state:** React Query caches data, but UI state (filters, scroll) is lost

**Pattern:**

```typescript
// Source: Next.js automatically preserves scroll position
// But filters/search require sessionStorage

// hooks/use-persistent-state.ts
import { useState, useEffect } from 'react'

export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  // Initialize from sessionStorage
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    const stored = sessionStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  })

  // Persist to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}

// Usage in accounts page
export default function AccountsPage({ params }: PageProps) {
  const { guildId } = params

  // Replace useState with usePersistentState for filters
  const [search, setSearch] = usePersistentState(`${guildId}-accounts-search`, '')
  const [platform, setPlatform] = usePersistentState(`${guildId}-accounts-platform`, '')
  const [group, setGroup] = usePersistentState(`${guildId}-accounts-group`, '')

  // Scroll position preserved automatically by Next.js
}
```

**Why sessionStorage:** Survives page refreshes and back/forward navigation, but clears when tab closes (desired - don't persist stale filters between sessions).

### Skeleton Placeholders

**User requirement:** "Shaped skeletons matching real card layout (avatar circle, text lines, badges)"

**Current state:** Basic skeleton component exists, used in AccountCardSkeleton

**Pattern (already implemented correctly):**

```typescript
// components/tracking/account-card-skeleton.tsx
export function AccountCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-lg p-4">
          {/* Avatar circle */}
          <Skeleton shape="circle" className="w-12 h-12 mb-3" />

          {/* Username line */}
          <Skeleton className="h-4 w-32 mb-2" />

          {/* Platform badge */}
          <Skeleton className="h-6 w-20 mb-3" />

          {/* Brand line */}
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </>
  )
}
```

**Already correct** - matches real AccountCard structure. Repeat pattern for other card types (PostCard, BrandCard).

---

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast stacking/queueing | Custom toast component with array state | Sonner library | Handles z-index, animations, accessibility, swipe-to-dismiss, auto-dismiss timers, promise-based toasts (loading→success/error) |
| Progress bar animations | Custom CSS animations + route listener | BProgress | Handles edge cases (instant navigations, back button, manual start/stop), auto-timing, customizable easing |
| Exponential backoff retry | Manual setTimeout with attempt counter | Built into React Query v5 | `retry` and `retryDelay` options with exponential backoff built-in, plus 429-specific handling needs custom layer |
| Request deduplication | Tracking in-flight requests with Map | React Query's default behavior | Automatically dedupes identical queries, shares results across components |
| Infinite scroll sentinel | Manual IntersectionObserver setup | react-intersection-observer | Handles cleanup, multiple observers, SSR compatibility |
| Form dirty state tracking | Manual comparison of initial vs current values | React Hook Form's `formState.isDirty` | Tracks nested objects, arrays, handles reset, integrates with validation |

**Key insight:** Performance optimization libraries are mature in 2026. Don't reinvent caching, retry logic, or animation timing - these have subtle edge cases (race conditions, memory leaks, animation jank) that libraries already solve.

---

## Common Pitfalls

### Pitfall 1: Memory Leaks from Unbounded Query Cache

**What goes wrong:** Long-running dashboard sessions (users monitoring accounts for hours) accumulate cached queries. Without gcTime, old queries stay in memory forever, causing browser slowdown.

**Why it happens:** React Query v5 defaults:
- `gcTime: 5 minutes` (but only if query is **completely unused**)
- Queries with even one active observer never get garbage collected
- Switching between guilds/pages creates new queries but old ones persist

**How to avoid:**
1. Set explicit `gcTime: 10 * 60 * 1000` in QueryClient config
2. For rarely-accessed data (audit logs, export history), use shorter gcTime: `gcTime: 2 * 60 * 1000`
3. Monitor cache size in React Query DevTools (shows # of queries in cache)

**Warning signs:**
- Browser DevTools Memory tab shows steady growth over time
- Dashboard feels sluggish after 30+ minutes of use
- React Query DevTools shows 50+ cached queries

### Pitfall 2: Optimistic Update Race Conditions

**What goes wrong:** User clicks "Save settings", sees change immediately, but server rejects update. Meanwhile, user navigates away, then back - sees old data. Confusion: "Did my change save or not?"

**Why it happens:** Optimistic update flow:
1. `onMutate` updates cache immediately
2. User sees new value
3. Mutation fails (network error, validation)
4. `onError` rolls back cache
5. BUT if user navigated away, rollback happens in background
6. User returns, sees old value, thinks save succeeded then reverted

**How to avoid:**
1. Always show toast notification on mutation error: `toast.error('Settings update failed')`
2. In `onError`, call `queryClient.invalidateQueries()` to force refetch from server
3. For critical mutations (delete, bulk operations), show loading state until confirmed

**Warning signs:**
- User reports "changes disappearing" after navigation
- Mutation errors logged but user unaware (no toast)

### Pitfall 3: 429 Retry Storms

**What goes wrong:** API returns 429 (rate limited). Dashboard retries immediately. Server still overloaded, returns 429 again. Dashboard retries again. Exponential requests, server crashes.

**Why it happens:** Naive retry logic without backoff:
```typescript
// BAD - creates retry storm
if (response.status === 429) {
  return fetchData() // Immediate retry
}
```

**How to avoid:**
1. Implement exponential backoff: wait 1s, 2s, 4s, 8s between retries
2. Respect `Retry-After` header from server
3. Add jitter (randomize delay ±50%) to prevent thundering herd
4. Cap maximum retries (3 attempts is standard)

**Warning signs:**
- Multiple 429 errors in rapid succession (< 1s apart)
- Server CPU/memory spikes correlate with dashboard usage

### Pitfall 4: Infinite Scroll Memory Bloat

**What goes wrong:** User scrolls through 500+ accounts. All 500 are rendered in DOM. Browser becomes unresponsive.

**Why it happens:** react-intersection-observer loads new pages but never unloads old pages. User requirement: "Keep all loaded pages in DOM" (for scroll restoration).

**How to avoid:**
1. Accept tradeoff: 500 items × 200 bytes/item = 100KB DOM (acceptable for modern browsers)
2. For 1000+ items, recommend virtualization: `@tanstack/react-virtual` (but breaks scroll restoration)
3. Optimize card rendering: avoid heavy components, use memo for expensive calculations

**Warning signs:**
- Browser DevTools shows > 50MB DOM size
- Scrolling feels janky (< 30 FPS)
- "Load more" button appears sluggish

**Mitigation:** User requirement explicitly allows this tradeoff. Monitor performance in production, revisit if users report issues.

### Pitfall 5: SSE Connection Leaks

**What goes wrong:** User opens multiple browser tabs. Each tab creates SSE connection. User closes tabs without cleanup. Server hits connection limit, new connections rejected.

**Why it happens:** EventSource doesn't auto-close on tab hide. Current `useSSE` hook creates connection on mount, closes on unmount - but unmount doesn't fire when tab hidden (only when component removed from DOM).

**How to avoid:**
1. Listen to `visibilitychange` event: close SSE when tab hidden, reconnect when visible
2. Set connection timeout: close after 5 minutes of inactivity
3. Server-side: implement connection limits per user, return 429 if exceeded

**Warning signs:**
- Server logs show > 10 SSE connections per user
- Users report "real-time updates stopped working" after opening multiple tabs

**Pattern to add:**
```typescript
// hooks/use-sse.ts - Add visibility handling
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      eventSourceRef.current?.close()
      setConnectionState('disconnected')
    } else {
      connect() // Reconnect when tab visible
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [connect])
```

### Pitfall 6: Skeleton Flash on Cached Data

**What goes wrong:** User visits Accounts page, then navigates away, then returns within 5 minutes. Cached data exists, but skeleton shows briefly before rendering cards.

**Why it happens:** React Query renders:
1. `isLoading: true` (while checking cache)
2. `isLoading: false, data: cached` (cache hit)
3. Skeleton visible for ~50ms between states

**How to avoid:**
Use `isPlaceholderData` flag instead of `isLoading`:
```typescript
const { data, isLoading, isPlaceholderData } = useAccounts(guildId, page, limit)

// Show skeleton only on true initial load, not on cached data
if (isLoading && !data) {
  return <AccountCardSkeleton count={6} />
}

// Show cached data immediately, even if stale
return <AccountCards accounts={data.accounts} />
```

**Warning signs:**
- Flicker when navigating back to recently-visited pages
- Users report "loading unnecessarily"

---

## Code Examples

Verified patterns from official sources:

### Progressive Loading with Suspense (Claude's Discretion - Initial Load Approach)

**Option 1: Skeleton-first (recommended for dashboard)**

```typescript
// Source: Next.js 14 Loading UI and Streaming
// https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming

// app/(dashboard)/guilds/[guildId]/accounts/loading.tsx
export default function AccountsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-surface rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AccountCardSkeleton count={6} />
      </div>
    </div>
  )
}
```

**Option 2: Progressive reveal (shows content as it loads)**

```typescript
// More complex - requires React Suspense boundaries around each section
// Not recommended for this dashboard (adds complexity, minimal benefit)
```

**Recommendation:** Skeleton-first. Users prefer consistent loading UX over progressive reveal for data-heavy pages.

### Dynamic Imports for Code Splitting (Claude's Discretion - Splitting Strategy)

**Heavy component example:**

```typescript
// Source: Next.js 14 Lazy Loading
// https://nextjs.org/docs/app/guides/lazy-loading

// Recharts is heavy (200KB+) - only load on Analytics page
// app/(dashboard)/guilds/[guildId]/analytics/page.tsx
import dynamic from 'next/dynamic'

const AnalyticsChart = dynamic(
  () => import('@/components/analytics/analytics-chart'),
  {
    loading: () => <AnalyticsChartSkeleton />,
    ssr: false // Chart uses browser APIs
  }
)

export default function AnalyticsPage({ params }: PageProps) {
  return (
    <div>
      <AnalyticsChart data={data} />
    </div>
  )
}
```

**Recommendation:** Split only heavy pages (Analytics with Recharts). Don't over-split - HTTP/2 makes multiple small bundles efficient.

### Bundle Analysis Setup (Claude's Discretion - Analysis Approach)

```bash
# Source: Next.js Bundle Analysis
# https://nextjs.org/docs/app/guides/package-bundling

# Install analyzer
npm install --save-dev @next/bundle-analyzer

# next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer({
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/avatars/**',
      },
    ],
  },
})

# Run analysis
ANALYZE=true npm run build
```

**Recommendation:** Run analysis once during Phase 8, identify any dependencies > 100KB, consider lazy loading or alternatives.

### Offline Detection Banner

**User requirement:** "Show persistent banner when navigator.onLine is false, auto-dismiss on reconnect"

```typescript
// components/offline-banner.tsx
'use client'

import { useState, useEffect } from 'react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    const handleOffline = () => setIsOffline(true)
    const handleOnline = () => setIsOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500/20 border-b border-yellow-500/50 px-4 py-2 z-50">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-yellow-400 text-sm">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium">You're offline. Changes won't sync until connection is restored.</span>
      </div>
    </div>
  )
}

// Add to root layout
// app/layout.tsx
import { OfflineBanner } from '@/components/offline-banner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### Keyboard Shortcuts (User Requirement)

**User requirement:** "Escape for modals, Ctrl+K for search, keyboard navigation in lists"

```typescript
// hooks/use-keyboard-shortcuts.ts
'use client'

import { useEffect } from 'react'

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape - handled by Headless UI Dialog automatically

      // Ctrl+K or Cmd+K - focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]')
        searchInput?.focus()
      }

      // Arrow keys - navigate between cards (if implemented)
      // More complex - requires focus management library
      // Recommend deferring to post-launch enhancement
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}

// Add data attribute to search inputs
// components/filters/search-input.tsx
<input
  type="text"
  data-search-input // Enable Ctrl+K targeting
  placeholder={placeholder}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  className="..."
/>
```

**Recommendation:** Implement Escape (auto-handled by Headless UI) and Ctrl+K (search focus). Defer arrow key navigation (complex, low ROI).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NProgress | BProgress | 2024 | TypeScript-first, better API, actively maintained |
| Custom toast arrays | Sonner | 2025 | Shadcn/ui standard, promise-based toasts, better UX |
| React Query v4 `cacheTime` | React Query v5 `gcTime` | 2023 | Clearer naming, avoids confusion with `staleTime` |
| Manual retry logic | React Query built-in + 429-specific layer | 2026 | Query retries built-in, but 429 still needs custom handling |
| Virtualization everywhere | Intersection Observer for most cases | 2025 | Virtualization overkill for < 500 items, IO more flexible |
| Pages Router `beforeunload` | App Router native dialog | 2023 | App Router removed route change events, use browser native |

**Deprecated/outdated:**
- **NProgress**: Successor is BProgress (TypeScript, better maintained)
- **react-toastify**: Still maintained but Sonner is 2026 best practice (lighter, better DX)
- **React Query v4 API**: Migrate `cacheTime` → `gcTime`, `idle` → `inactive`

---

## Open Questions

Things that couldn't be fully resolved:

### 1. Server-Side Search Implementation

**What we know:** User requirement is "move search to server-side for large datasets". Current implementation filters client-side after fetching all pages.

**What's unclear:**
- Does backend API support search query params? (Need to check backend routes)
- Current infinite query fetches all pages then filters - need to modify to send `?search=term` to backend
- Will require backend changes to implement search on accounts/posts tables

**Recommendation:** Verify backend has search endpoint, then update frontend to pass search param in query string. Falls under "server-side changes may be needed" assumption.

### 2. Concurrent Edit Detection

**What we know:** User requirement is "if data changed since page load, warn before saving: 'Settings were updated. Reload or overwrite?'"

**What's unclear:**
- Requires backend to return `updated_at` timestamp or version field
- Frontend needs to compare timestamp on save vs timestamp when page loaded
- If mismatch, show modal with "Reload" and "Overwrite" options

**Recommendation:** Check if backend returns `updated_at` field. If not, this is a larger backend change (need to add timestamps to DashboardAuditLog or settings table).

### 3. Virtualization Decision

**What we know:** User requirement is "Claude's discretion on list virtualization". Current implementation uses infinite scroll with all items in DOM.

**What's unclear:**
- At what list size does performance degrade? 100 items? 500? 1000?
- User requirement also says "keep all loaded pages in DOM" (for scroll restoration), which conflicts with virtualization (virtualizes away off-screen items)

**Recommendation:** Start without virtualization (current approach is fine). If production usage shows guilds with 1000+ accounts causing jank, revisit with `@tanstack/react-virtual`. Document this as "optimize if needed" in plan.

### 4. Focus Trapping in Headless UI

**What we know:** User requirement is "audit existing Headless UI behavior" for focus trapping. Headless UI Dialog component should handle this automatically.

**What's unclear:**
- Does current implementation have any custom focus management that conflicts?
- Are all modals using Headless UI Dialog correctly (role="dialog", aria-modal="true")?

**Recommendation:** Audit all modal components during implementation. Headless UI should handle focus trapping correctly out of the box - just verify no custom code breaks it.

---

## Sources

### Primary (HIGH confidence)

- [TanStack Query v5 Documentation](https://tanstack.com/query/v5/docs/framework/react/guides/caching) - Cache management, stale-while-revalidate, optimistic updates
- [TanStack Query v5 Migration Guide](https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5) - `cacheTime` → `gcTime` rename
- [Next.js 14 Performance Optimization](https://nextjs.org/docs/app/guides/lazy-loading) - Dynamic imports, code splitting
- [Next.js 14 Loading UI and Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming) - Skeleton loading patterns
- [Next.js 14 Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Error boundaries, global-error.js
- [Next.js 14 Bundle Analysis](https://nextjs.org/docs/app/guides/package-bundling) - @next/bundle-analyzer setup

### Secondary (MEDIUM confidence)

- [Best Practices for Loading States in Next.js | Fishtank](https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs) - Skeleton design principles
- [Enhancing User Experience with Skeleton Loaders | PySquad](https://medium.com/@pysquad/enhancing-user-experience-with-skeleton-loaders-in-react-js-and-next-js-86b80b89e59d) - Skeleton implementation patterns
- [BProgress Documentation](https://bprogress.vercel.app/) - Progress bar setup, customization
- [Next NProgress Bar](https://next-nprogress-bar.vercel.app/) - Alternative progress bar library
- [Mastering Exponential Backoff | Better Stack](https://betterstack.com/community/guides/monitoring/exponential-backoff/) - Retry pattern implementation
- [Complete Guide to Handling API Rate Limits | Ayrshare](https://www.ayrshare.com/complete-guide-to-handling-rate-limits-prevent-429-errors/) - 429 handling strategies
- [HTTP Error 429 (Too Many Requests) | Postman](https://blog.postman.com/http-error-429/) - Rate limiting best practices
- [How-to handle unsaved page changes with NextJS app router | Jon James](https://medium.com/@jonjamesdesigns/how-to-handle-unsaved-page-changes-with-nextjs-app-router-65b74f1148de) - Unsaved changes pattern
- [Prevent Route Changes and Unsaved Data Loss in Next.js | Robert S](https://betterprogramming.pub/prevent-route-changes-and-unsaved-data-loss-in-next-js-f93622d73791) - beforeunload implementation
- [Next.js Error Handling Patterns | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/error-handling-nextjs/) - Error boundary patterns
- [Mastering Accessible Modals with ARIA | A11Y Collective](https://www.a11y-collective.com/blog/modal-accessibility/) - Focus trapping best practices
- [How to Build Accessible Modals with Focus Traps | UXPin](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) - Keyboard navigation
- [Limit the number of toast displayed | React-Toastify](https://fkhadra.github.io/react-toastify/limit-the-number-of-toast-displayed/) - Toast stacking patterns
- [Top 9 React notification libraries in 2026 | Knock](https://knock.app/blog/the-top-notification-libraries-for-react) - Sonner vs alternatives
- [10 Best React Toast Components | ReactScript](https://reactscript.com/best-toast-notification/) - Toast library comparison

### Tertiary (LOW confidence - general guidance)

- [react-intersection-observer performance discussions](https://www.npmjs.com/package/react-intersection-observer) - Performance characteristics for large lists
- [Using Intersection Observer API in React | DEV Community](https://dev.to/emmanueloloke/using-intersection-observer-api-in-react-56b0) - Intersection Observer patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified versions and APIs via Context7
- Architecture patterns: HIGH - TanStack Query v5 and Next.js 14 docs are authoritative, patterns verified
- Pitfalls: MEDIUM - Based on community patterns and production experience reports, not empirical testing
- Edge cases: MEDIUM - User requirements are clear, but some patterns (concurrent edits, server-side search) depend on backend implementation

**Research date:** 2026-02-07
**Valid until:** 60 days (stable ecosystem, no fast-moving changes expected)

**Research notes:**
- User has experienced rate limiting issues firsthand - this is a proven pain point, not theoretical
- Current codebase is well-structured for optimization (React Query, Next.js 14, TypeScript strict mode)
- Most optimizations are configuration changes, not architectural rewrites
- Biggest unknowns are backend capabilities (search endpoints, timestamps for concurrent edit detection)
