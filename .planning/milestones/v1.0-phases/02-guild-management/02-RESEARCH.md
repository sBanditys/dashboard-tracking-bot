# Phase 2: Guild Management - Research

**Researched:** 2026-01-29
**Domain:** Multi-Tenant Guild Management, Organization Switching, Permission-Based Access
**Confidence:** MEDIUM-HIGH

## Summary

This phase implements multi-tenant guild management where users can view, select, and switch between Discord guilds (organizations) they have access to. The standard approach uses React Query for server-state management with path-based routing (`/guilds/[guildId]`), context-free guild switching (storing active guild in URL only), and proper cache invalidation strategies when switching contexts. The UI pattern follows a guild list page with status indicators, a guild detail view with stats and quick actions, and optionally a guild switcher component in the topbar for quick navigation between guilds.

Research shows that multi-tenant applications in 2026 follow a hybrid state management approach: React Query handles server data (guild lists, guild details, permissions), while URL parameters handle active context (which guild is selected). The most critical pitfall is stale data when switching guilds—requiring explicit cache key strategies and invalidation patterns to prevent users from seeing data from a previous guild.

**Primary recommendation:** Use path-based routing with `[guildId]` dynamic segments, structure React Query keys hierarchically (`['guilds']` → `['guild', guildId]` → `['guild', guildId, 'status']`), avoid storing active guild in Context/state (use URL as source of truth), and implement a guild switcher dropdown using Headless UI for accessibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14.x (App Router) | Multi-tenant routing | Official docs show path-based routing with `[orgId]` dynamic segments |
| React Query | 5.x | Guild data & cache management | Industry standard for multi-tenant server state, hierarchical cache keys |
| TypeScript | 5.x | Type safety | Critical for guild/permission type safety across tenant boundaries |
| Headless UI | 1.x/2.x | Accessible dropdown components | Official Tailwind Labs library, full ARIA support for dropdown menus |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 4.x | Client UI state (optional) | If need lightweight store for UI-only state like "recently viewed guilds" |
| clsx | 2.x | Conditional styling | Status badges, active states in guild switcher |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Path-based routing (`/guilds/[id]`) | Subdomain routing (`guild1.app.com`) | Subdomain better for white-labeling but requires wildcard SSL, DNS config, not needed for Discord guilds |
| React Query | Context API for guild data | Context causes stale data issues, no automatic refetching, manual cache management |
| Headless UI | Radix UI | Similar capabilities, slightly different API, Headless UI official Tailwind companion |
| URL state | localStorage/cookies for active guild | URL is shareable, bookmark-able, back button works naturally |

**Installation:**
```bash
npm install @headlessui/react
# React Query and TypeScript already installed from Phase 1
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── guilds/
│   │   │   ├── page.tsx                    # Guild list with status indicators
│   │   │   └── [guildId]/
│   │   │       ├── page.tsx                # Guild overview/dashboard
│   │   │       ├── brands/page.tsx         # Scoped to guild context
│   │   │       ├── accounts/page.tsx       # Scoped to guild context
│   │   │       └── settings/page.tsx       # Scoped to guild context
│   ├── api/
│   │   └── guilds/
│   │       ├── route.ts                    # GET /api/guilds (list)
│   │       └── [guildId]/
│   │           ├── route.ts                # GET /api/guilds/:id (details)
│   │           ├── status/route.ts         # GET /api/guilds/:id/status (bot health)
│   │           └── usage/route.ts          # GET /api/guilds/:id/usage (stats)
├── components/
│   ├── guild-switcher.tsx                  # Dropdown for quick guild switching
│   ├── guild-card.tsx                      # Reusable guild display card
│   └── status-badge.tsx                    # Online/offline indicator
├── hooks/
│   ├── use-guilds.ts                       # List all guilds
│   ├── use-guild.ts                        # Single guild details
│   ├── use-guild-status.ts                 # Real-time status polling
│   └── use-active-guild.ts (optional)      # Extract guildId from URL params
├── types/
│   └── guild.ts                            # Guild, GuildSettings, GuildStatus types
└── lib/
    └── permissions.ts (future)             # Permission checking utilities
```

### Pattern 1: Hierarchical React Query Keys
**What:** Structure cache keys from generic to specific to enable selective invalidation
**When to use:** Any multi-tenant application where context switching should clear related data
**Example:**
```typescript
// Source: https://tkdodo.eu/blog/effective-react-query-keys
// Hierarchical structure enables partial invalidation

// All guilds
['guilds']

// Specific guild
['guild', guildId]

// Guild's status
['guild', guildId, 'status']

// Guild's usage with filter
['guild', guildId, 'usage', { days: 30 }]

// Invalidation examples:
queryClient.invalidateQueries({ queryKey: ['guilds'] })                    // Refetch guild list
queryClient.invalidateQueries({ queryKey: ['guild', guildId] })            // Refetch all data for one guild
queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'status'] })  // Just status
```

**Why this matters:** When user switches guilds, you can invalidate just that guild's data without affecting others. Enables efficient cache management across tenant boundaries.

### Pattern 2: URL as Single Source of Truth
**What:** Store active guild in URL params, not React state or Context
**When to use:** Multi-tenant applications where users switch between organizations
**Example:**
```typescript
// GOOD: Read from URL
function GuildPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params
  const { data: guild } = useGuild(guildId)  // React Query handles caching
  // ...
}

// BAD: Storing in Context causes stale data
const GuildContext = createContext<string>()  // ❌ Don't do this
```

**Why this matters:** URLs are shareable, bookmarkable, work with browser back/forward, and eliminate an entire class of stale state bugs. Research shows this is the #1 mistake in multi-tenant apps.

### Pattern 3: Guild Switcher Dropdown
**What:** Accessible dropdown menu in topbar showing current guild with quick-switch capability
**When to use:** When users frequently switch between multiple guilds
**Example:**
```typescript
// Source: https://headlessui.com/react/menu
import { Menu } from '@headlessui/react'

function GuildSwitcher({ currentGuildId }: { currentGuildId?: string }) {
  const { data } = useGuilds()
  const router = useRouter()

  const currentGuild = data?.guilds.find(g => g.id === currentGuildId)

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2">
        {currentGuild ? currentGuild.name : 'Select Guild'}
        <ChevronDownIcon />
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-56 bg-surface border">
        {data?.guilds.map((guild) => (
          <Menu.Item key={guild.id}>
            {({ active }) => (
              <button
                onClick={() => router.push(`/guilds/${guild.id}`)}
                className={active ? 'bg-accent-purple' : ''}
              >
                <span>{guild.name}</span>
                {guild.id === currentGuildId && <CheckIcon />}
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  )
}
```

**Accessibility:** Headless UI automatically handles ARIA attributes, keyboard navigation (arrow keys, enter, escape), focus management, and screen reader announcements.

### Pattern 4: Permission-Based Filtering
**What:** API returns only guilds where user has manage permissions
**When to use:** Multi-tenant apps with role-based access control
**Example:**
```typescript
// Backend API (existing bot API returns this already)
// GET /api/v1/guilds
// Returns: Guilds where user has MANAGE_GUILD or ADMINISTRATOR permissions

// Frontend just displays what API returns - no client-side filtering needed
export function useGuilds() {
  return useQuery<GuildsResponse>({
    queryKey: ['guilds'],
    queryFn: async () => {
      const response = await fetch('/api/guilds')  // Proxies to bot API
      if (!response.ok) throw new Error('Failed to fetch guilds')
      return response.json()
    },
    staleTime: 2 * 60 * 1000,  // 2 minutes
  })
}
```

**Why this matters:** Server enforces permissions, client trusts the API response. No stale permissions—always current based on user's actual Discord roles.

### Pattern 5: Optimistic UI Updates
**What:** Show immediate feedback when switching guilds, even before data loads
**When to use:** Improving perceived performance during navigation
**Example:**
```typescript
// Using Next.js Link with prefetching
<Link
  href={`/guilds/${guild.id}`}
  prefetch={true}  // Prefetch on hover
  className="guild-card"
>
  {/* Guild preview */}
</Link>

// React Query prefetching
const queryClient = useQueryClient()
const prefetchGuild = (guildId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['guild', guildId],
    queryFn: () => fetch(`/api/guilds/${guildId}`).then(r => r.json())
  })
}
```

### Anti-Patterns to Avoid
- **Storing active guild in Context:** Causes stale data, doesn't sync with URL, breaks browser back button
- **Single queryKey for all guilds:** `['guilds', guildId, 'data']` is less flexible than `['guild', guildId]`
- **Not invalidating on switch:** User sees previous guild's data briefly
- **Client-side permission filtering:** Permissions must be enforced server-side
- **Over-fetching on mount:** Guild list shouldn't fetch details for all guilds immediately

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible dropdown menu | Custom div with onClick | Headless UI Menu | Handles ARIA, keyboard nav, focus trapping, mobile touch, escape to close |
| Multi-select / filter guilds | Custom checkbox UI | Headless UI Listbox with multiple | Screen reader support, keyboard navigation built-in |
| Status polling | setInterval loops | React Query refetchInterval | Automatic cleanup, pause when tab inactive, error retry logic |
| Loading skeletons | Animated divs | Match existing patterns from Phase 1 | Consistency, `<Skeleton>` component already exists |
| Guild search/filter | Custom input + filter logic | Native browser search if <10 guilds, debounced input if >10 | Users expect browser Find (Cmd+F) to work |

**Key insight:** Accessibility is the primary reason not to hand-roll these patterns. Headless UI has been battle-tested with screen readers, keyboard-only navigation, and mobile assistive tech. Building custom solutions requires deep ARIA expertise and testing with real assistive devices.

## Common Pitfalls

### Pitfall 1: Stale Data When Switching Guilds
**What goes wrong:** User switches from Guild A to Guild B, but sees Guild A's data for 1-2 seconds because React Query cache hasn't updated

**Why it happens:** React Query cache keys don't automatically clear when URL changes. If both guilds have been visited, the cache might show stale data.

**How to avoid:**
- Use proper query key structure: `['guild', guildId]` not `['currentGuild']`
- React Query will automatically fetch fresh data when `guildId` changes
- Set appropriate `staleTime` - 2 minutes for list, 30 seconds for real-time status
- Use suspense boundaries or loading states to prevent flash of wrong content

**Warning signs:**
- User reports "seeing wrong guild's data briefly"
- Status indicators show data from previous guild
- Console shows multiple rapid refetches

### Pitfall 2: Infinite Redirect Loops with Protected Routes
**What goes wrong:** Middleware redirects `/guilds` → `/login` → `/guilds` → `/login` infinitely

**Why it happens:** Middleware runs on every request including redirects, and matcher config isn't specific enough

**How to avoid:**
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|legal).*)',
  ],
}
```

**Warning signs:**
- Browser shows "too many redirects" error
- Network tab shows rapid redirect chain
- Page never loads

### Pitfall 3: Not Handling "No Guilds" State
**What goes wrong:** User logs in but has no guilds (bot not added to any servers they manage), sees broken UI or error

**Why it happens:** Developers assume `guilds.length > 0` in their code

**How to avoid:**
```typescript
if (data?.guilds.length === 0) {
  return (
    <EmptyState>
      <p>No guilds found.</p>
      <p>Make sure the bot is added to Discord servers where you have manage permissions.</p>
      <Button href={DISCORD_BOT_INVITE_URL}>Add Bot to Server</Button>
    </EmptyState>
  )
}
```

**Warning signs:**
- Map over empty array shows nothing
- User confused why page is blank
- No call-to-action to add bot

### Pitfall 4: Mobile Dropdown Menu Not Touch-Friendly
**What goes wrong:** Guild switcher dropdown works on desktop but is hard to use on mobile (items too small, can't scroll)

**Why it happens:** Tailwind defaults assume desktop-first, dropdown positioning breaks on small screens

**How to avoid:**
```typescript
// Headless UI Menu with mobile considerations
<Menu.Items className="absolute right-0 mt-2 w-full sm:w-56 max-h-60 overflow-auto">
  {/* Items with larger touch targets */}
  <Menu.Item>
    {({ active }) => (
      <button className="w-full px-4 py-3 text-left">  {/* py-3 for larger tap target */}
        {guild.name}
      </button>
    )}
  </Menu.Item>
</Menu.Items>
```

**Warning signs:**
- Mobile users can't tap items reliably
- Dropdown extends beyond viewport
- Can't scroll to see all guilds on mobile

### Pitfall 5: Race Conditions with Parallel Queries
**What goes wrong:** Guild details page fires 3+ queries (guild, status, usage) simultaneously, but they complete out of order causing UI flicker

**Why it happens:** React Query fetches in parallel by default, network timing is unpredictable

**How to avoid:**
- Accept parallel fetching as good (faster than sequential)
- Use loading states per-section rather than whole-page
- Use `enabled` option to wait for critical data:
```typescript
const { data: guild } = useGuild(guildId)
const { data: status } = useGuildStatus(guildId, {
  enabled: !!guild  // Only fetch status after guild loaded
})
```

**Warning signs:**
- UI sections appear in random order
- Flash of empty state then data
- Users report "jumpy" page load

### Pitfall 6: Over-Aggressive Polling Drains Performance
**What goes wrong:** Setting `refetchInterval: 5000` on guild list causes API hammering when user has 20+ guilds

**Why it happens:** Polling every query individually, not considering cumulative API load

**How to avoid:**
- Guild list: manual refetch only (staleTime: 2 minutes, no interval)
- Guild status: `refetchInterval: 60000` (1 minute) - this is real-time data
- Guild details: staleTime: 2 minutes, no interval
- Only poll status for *currently active* guild:
```typescript
const { data: status } = useGuildStatus(guildId, {
  refetchInterval: isActive ? 60000 : false  // Only poll if viewing this guild
})
```

**Warning signs:**
- Network tab shows constant requests
- Mobile users complain about data usage
- Backend logs show hammering from single user

## Code Examples

Verified patterns from official sources:

### Guild List with Status Indicators
```typescript
// Source: Existing codebase + WebSearch findings
'use client'

import { useGuilds } from '@/hooks/use-guilds'
import { GuildCard } from '@/components/guild-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function GuildsPage() {
  const { data, isLoading, isError } = useGuilds()

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">Failed to load guilds. Please try again.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  if (data?.guilds.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-sm p-8 text-center">
        <p className="text-gray-400 mb-4">
          No guilds found. Make sure the bot is added to your Discord servers.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_BOT_INVITE_URL}
          className="text-accent-purple hover:underline"
        >
          Add Bot to Server →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Your Guilds</h1>
        <p className="text-gray-400">
          Select a guild to view tracking data and manage settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.guilds.map((guild) => (
          <GuildCard key={guild.id} guild={guild} />
        ))}
      </div>
    </div>
  )
}
```

### Guild Switcher in Topbar
```typescript
// Source: https://headlessui.com/react/menu + codebase patterns
'use client'

import { Menu } from '@headlessui/react'
import { useGuilds } from '@/hooks/use-guilds'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function GuildSwitcher() {
  const { data } = useGuilds()
  const params = useParams()
  const router = useRouter()
  const currentGuildId = params.guildId as string | undefined

  const currentGuild = data?.guilds.find(g => g.id === currentGuildId)

  if (!data || data.guilds.length === 0) return null

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-sm hover:border-accent-purple/50 transition-colors">
        <span className="text-sm font-medium text-white truncate max-w-[200px]">
          {currentGuild?.name || 'Select Guild'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Menu.Items className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-sm shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
        <div className="py-1">
          {data.guilds.map((guild) => (
            <Menu.Item key={guild.id}>
              {({ active }) => (
                <button
                  onClick={() => router.push(`/guilds/${guild.id}`)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex items-center justify-between transition-colors',
                    active ? 'bg-accent-purple/10' : '',
                    guild.id === currentGuildId ? 'bg-accent-purple/20' : ''
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {guild.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {guild.client_name}
                    </p>
                  </div>
                  {guild.id === currentGuildId && (
                    <svg className="w-4 h-4 text-accent-purple ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
            </Menu.Item>
          ))}
        </div>
      </Menu.Items>
    </Menu>
  )
}
```

### Status Badge Component
```typescript
// Reusable status indicator for guilds
'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'degraded'
  label?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    degraded: 'bg-yellow-500',
  }

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    degraded: 'Degraded',
  }

  return (
    <div className={cn('flex items-center gap-1.5', textSize)}>
      <span className={cn('rounded-full', dotSize, statusColors[status])} />
      <span className="text-gray-300">{label || statusLabels[status]}</span>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store active org in Context | URL parameters as source of truth | ~2023-2024 | Eliminates entire class of stale state bugs, enables sharing/bookmarking |
| Flat query keys `['data', id]` | Hierarchical keys `['resource', id, 'sub']` | React Query v4+ (2022) | Enables selective invalidation, better cache management |
| Manual fetch on mount | React Query with staleTime | Mainstream ~2020-2021 | Automatic background refetching, no stale data |
| Radix UI Dropdown | Headless UI Menu | Both current (2024-2026) | Headless UI official Tailwind companion, simpler API |
| Build custom RBAC UI | Permission-based API filtering | Always recommended | Server enforces security, client trusts API |
| WebSockets for status | SSE with React Query polling | SSE gaining traction 2024-2025 | Simpler than WebSockets, works through proxies, HTTP-based |

**Deprecated/outdated:**
- **Redux for server state**: React Query/SWR handle this better with less boilerplate
- **useEffect for data fetching**: React Query declarative approach eliminates race conditions
- **localStorage for active org**: Doesn't sync across tabs, doesn't work with SSR
- **Custom dropdown with divs**: Fails accessibility audits, hard to maintain

## Open Questions

Things that couldn't be fully resolved:

1. **Should guild switcher be in topbar or sidebar?**
   - What we know: Topbar is more common in SaaS apps (see Vercel, GitHub), sidebar is Discord's pattern
   - What's unclear: User's preference not stated in requirements
   - Recommendation: Implement in topbar for easy access from any page. If users want it in sidebar, trivial to move component.

2. **How many guilds until we need search/filtering?**
   - What we know: <10 guilds, browser Cmd+F works fine. >20 guilds needs type-ahead search
   - What's unclear: What's user's typical guild count?
   - Recommendation: Start without search. Add debounced search input if >10 guilds in testing. Use Headless UI Combobox pattern for type-ahead.

3. **Should SSE replace polling for bot status?**
   - What we know: Prior decision was "SSE for real-time updates", but Phase 1 implemented polling
   - What's unclear: Does backend support SSE endpoints yet?
   - Recommendation: Keep polling (`refetchInterval: 60000`) for now. SSE is better but adds complexity. Can upgrade in Phase 3+ if needed.

4. **Guild-scoped breadcrumbs pattern?**
   - What we know: Breadcrumbs exist from Phase 1, should show "Guild Name > Brands" hierarchy
   - What's unclear: Should breadcrumbs include guild switcher inline?
   - Recommendation: Update breadcrumb component to accept guild context: `Home > [Guild Switcher] > Brands`. Keeps navigation context visible.

## Sources

### Primary (HIGH confidence)
- [TanStack Query v5 Docs - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) - Cache invalidation strategies
- [TkDodo's Blog - Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) - Hierarchical key patterns (2025)
- [Headless UI React Menu](https://headlessui.com/react/menu) - Accessible dropdown implementation
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant) - Official multi-tenant patterns
- [How to Implement SSE in React](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) - January 2026 guide
- Existing codebase - `/src/hooks/use-guilds.ts`, `/src/types/guild.ts`, Phase 1 patterns

### Secondary (MEDIUM confidence)
- [Multi-Tenancy in React Applications - Clerk](https://clerk.com/articles/multi-tenancy-in-react-applications-guide) - Sept 2025, organization switching patterns
- [State Management in 2026 - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Hybrid state approach
- [Multi-Tenant Architecture in Next.js - Medium](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0) - Path-based routing
- [React Query as State Manager - TkDodo](https://tkdodo.eu/blog/react-query-as-a-state-manager) - Server state vs client state
- [Dropdown Menu UI Best Practices - Eleken](https://www.eleken.co/blog-posts/dropdown-menu-ui) - Mobile considerations
- [Shadcn Multi-Account Switcher Pattern](https://www.shadcn.io/patterns/dropdown-menu-profile-4) - UI pattern reference

### Tertiary (LOW confidence - WebSearch only)
- Various Medium articles on multi-tenant React apps (2024-2025) - General patterns, not Next.js specific
- Community discussions on GitHub about SSE integration with React Query - No official support yet
- UI pattern galleries for dropdown menus - Design inspiration but not implementation guides

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - React Query, Headless UI, Next.js patterns verified with official docs and TkDodo (React Query maintainer)
- Architecture: **MEDIUM-HIGH** - URL-based routing verified, hierarchical keys verified, Context anti-pattern confirmed. Guild switcher placement is opinion-based.
- Pitfalls: **MEDIUM** - Stale data issues confirmed in multiple sources, redirect loops are known Next.js issue. Specific solutions tested in existing codebase.
- SSE integration: **MEDIUM** - SSE patterns verified but official React Query support limited. Polling is simpler, works now.

**Research date:** 2026-01-29
**Valid until:** ~30 days (Feb 2026) - React Query and Next.js are stable, unlikely to change. Headless UI v2 in beta but v1 fully supported.
