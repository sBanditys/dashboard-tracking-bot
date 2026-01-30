# Phase 3: Tracking Data Display - Research

**Researched:** 2026-01-30
**Domain:** React data display with infinite scroll, filtering, and card-based layouts
**Confidence:** HIGH

## Summary

This phase transforms the existing table-based tracking views into card-based layouts with infinite scroll pagination, debounced instant filtering, and proper empty states. The codebase already has React Query v5, Headless UI, and a Skeleton component in place. The primary additions needed are:

1. **Infinite scroll** - Replace page-based `useQuery` with `useInfiniteQuery` + `react-intersection-observer`
2. **Card components** - Build expandable card components for accounts and posts (inline expansion, no detail pages)
3. **Filter bar** - Sticky filter bar with debounced search, platform dropdown (Headless UI Listbox), and date range picker
4. **Empty states** - Differentiate between "no data" and "no results for filter"

The existing `use-tracking.ts` hooks provide paginated data with filters already supported by the API. The transformation focuses on UI presentation and infinite scroll data management.

**Primary recommendation:** Use `useInfiniteQuery` from React Query v5 with `react-intersection-observer` for scroll detection, keeping filter state in URL params for shareability.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.20 | Data fetching with infinite scroll | Already in project; useInfiniteQuery is the standard for infinite lists |
| @headlessui/react | ^2.2.9 | Accessible Listbox dropdowns | Already in project; provides ARIA-compliant select components |
| tailwindcss | ^3.4.1 | Styling including sticky positioning | Already in project; handles all CSS needs |

### To Install
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-intersection-observer | ^9.x | Detect when scroll sentinel enters viewport | Triggers fetchNextPage for infinite scroll |
| react-day-picker | ^9.x | Date range picker calendar | Filter by date range; uses date-fns internally |
| date-fns | ^4.x | Date manipulation and formatting | Format dates, calculate ranges; peer dep of react-day-picker |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-intersection-observer | Native IntersectionObserver | More boilerplate, manual cleanup; library handles edge cases |
| react-day-picker | Native date inputs | Poor UX for ranges; no calendar visualization |
| Headless UI Listbox | Native select | Less styling control; no multi-select; poor accessibility |

**Installation:**
```bash
npm install react-intersection-observer react-day-picker date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── tracking/
│   │   ├── account-card.tsx      # Single account card with expand
│   │   ├── account-card-skeleton.tsx
│   │   ├── post-card.tsx         # Single post card with expand
│   │   ├── post-card-skeleton.tsx
│   │   ├── brand-card.tsx        # Brand display card
│   │   └── card-grid.tsx         # Grid container for cards
│   ├── filters/
│   │   ├── filter-bar.tsx        # Sticky container
│   │   ├── search-input.tsx      # Debounced text search
│   │   ├── platform-select.tsx   # Headless UI Listbox wrapper
│   │   └── date-range-picker.tsx # react-day-picker wrapper
│   ├── empty-state/
│   │   ├── empty-state.tsx       # Generic empty state
│   │   └── no-results.tsx        # Filter-specific empty
│   └── scroll/
│       └── scroll-to-top.tsx     # Floating scroll button
├── hooks/
│   └── use-tracking.ts           # Update to useInfiniteQuery
└── app/(dashboard)/guilds/[guildId]/
    ├── accounts/page.tsx         # Refactor to cards + infinite scroll
    ├── posts/page.tsx            # Refactor to cards + infinite scroll
    └── brands/page.tsx           # Already exists, add card styling
```

### Pattern 1: useInfiniteQuery with Intersection Observer
**What:** Replace useQuery with useInfiniteQuery for paginated endpoints
**When to use:** Any list that needs infinite scroll
**Example:**
```typescript
// Source: TanStack Query v5 docs
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

export function useAccountsInfinite(guildId: string, limit: number = 50) {
  const query = useInfiniteQuery({
    queryKey: ['guild', guildId, 'accounts', 'infinite', limit],
    queryFn: async ({ pageParam }) => {
      const response = await fetch(
        `/api/guilds/${guildId}/accounts?page=${pageParam}&limit=${limit}`
      )
      if (!response.ok) throw new Error('Failed to fetch accounts')
      return response.json() as Promise<AccountsResponse>
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Return undefined when no more pages
      if (lastPage.pagination.page >= lastPage.pagination.total_pages) {
        return undefined
      }
      return lastPage.pagination.page + 1
    },
    staleTime: 2 * 60 * 1000, // 2 minutes per DEV-002
  })

  return query
}

// In component:
function AccountsList({ guildId }: { guildId: string }) {
  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAccountsInfinite(guildId)

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Flatten pages for rendering
  const accounts = data?.pages.flatMap(page => page.accounts) ?? []

  return (
    <>
      {accounts.map(account => <AccountCard key={account.id} account={account} />)}
      {/* Sentinel element */}
      <div ref={ref} />
      {isFetchingNextPage && <AccountCardSkeleton count={3} />}
    </>
  )
}
```

### Pattern 2: Debounced Search Input
**What:** Delay search API calls until user stops typing
**When to use:** Any text input that triggers filtering
**Example:**
```typescript
// Source: React best practices
import { useState, useEffect, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// In component:
function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
      className="..."
    />
  )
}
```

### Pattern 3: Expandable Card with CSS Transition
**What:** Card that expands inline to show full content
**When to use:** Account and post cards per CONTEXT.md decisions
**Example:**
```typescript
// Source: CSS transition patterns
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ExpandableCardProps {
  preview: React.ReactNode
  expanded: React.ReactNode
}

export function ExpandableCard({ preview, expanded }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn(
        'w-full text-left bg-surface border border-border rounded-lg p-4',
        'transition-all duration-200 ease-in-out',
        'hover:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple'
      )}
      aria-expanded={isExpanded}
    >
      {preview}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          {expanded}
        </div>
      </div>
    </button>
  )
}
```

### Pattern 4: Sticky Filter Bar
**What:** Filter controls that stay visible when scrolling
**When to use:** Top of accounts and posts lists
**Example:**
```typescript
// Source: Tailwind CSS sticky positioning
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-4 -mx-4 px-4 border-b border-border">
      <div className="flex flex-wrap gap-3 items-center">
        {children}
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Fetching all pages on mount:** Only fetch first page; let scroll trigger subsequent fetches
- **Client-side filtering of infinite data:** Filter server-side; client filtering breaks pagination counts
- **Storing page number in component state:** Use useInfiniteQuery's built-in page management
- **No loading indicator at bottom:** Always show skeleton cards when fetching next page
- **Using grid-rows-[0fr] without overflow-hidden:** CSS grid collapse animation requires overflow-hidden on inner element

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Intersection detection | Manual scroll listener + getBoundingClientRect | react-intersection-observer | Handles observer cleanup, threshold options, SSR |
| Date range selection | Two date inputs | react-day-picker | Calendar UX, range visualization, accessibility |
| Accessible dropdown | Styled native select | Headless UI Listbox | Full ARIA support, keyboard navigation, styling freedom |
| Debounce function | setTimeout with cleanup | useDebounce hook (custom) | Simple enough to build; lodash is overkill |
| Infinite query state | Manual page tracking with useQuery | useInfiniteQuery | Handles page merging, refetching, caching automatically |

**Key insight:** The scroll detection and date picker problems have significant edge cases (observer cleanup, timezone handling, range validation) that libraries handle correctly. Debouncing is simple enough to hand-roll as a hook.

## Common Pitfalls

### Pitfall 1: Infinite Scroll Memory Bloat
**What goes wrong:** Loading hundreds of items keeps all DOM nodes mounted, causing memory issues
**Why it happens:** Naive infinite scroll keeps appending without cleanup
**How to avoid:** For very large lists (1000+ items), consider virtualization with @tanstack/virtual. For Phase 3 (50-100 items per load), standard DOM is acceptable.
**Warning signs:** Memory usage grows continuously; scrolling becomes sluggish

### Pitfall 2: Filter Changes Don't Reset Infinite Query
**What goes wrong:** Changing filters shows stale data from previous filter
**Why it happens:** useInfiniteQuery caches by queryKey; filters must be in queryKey
**How to avoid:** Include all filter values in queryKey array
**Warning signs:** Cached data appears briefly before new data loads

```typescript
// Correct: filters in queryKey
useInfiniteQuery({
  queryKey: ['accounts', guildId, filters.platform, filters.search],
  // ...
})
```

### Pitfall 3: Multiple fetchNextPage Calls
**What goes wrong:** Same page fetched multiple times simultaneously
**Why it happens:** Intersection observer fires before isFetchingNextPage updates
**How to avoid:** Check isFetchingNextPage before calling fetchNextPage
**Warning signs:** Duplicate items appear in list; network tab shows duplicate requests

```typescript
// Correct: guard against concurrent fetches
useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage()
  }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])
```

### Pitfall 4: Card Expansion Shifts Layout
**What goes wrong:** Expanding a card pushes other cards around unexpectedly
**Why it happens:** Content height change without proper containment
**How to avoid:** Use CSS Grid with grid-rows-[0fr]/grid-rows-[1fr] for smooth height animation
**Warning signs:** Jarring layout shifts when clicking cards

### Pitfall 5: Date Range Picker Timezone Issues
**What goes wrong:** Selected dates are off by one day
**Why it happens:** Date objects without explicit timezone handling
**How to avoid:** Use date-fns `startOfDay` and `endOfDay` with consistent timezone; send ISO strings to API
**Warning signs:** Filtering for "today" returns yesterday's or tomorrow's data

### Pitfall 6: Scroll-to-Top Button Always Visible
**What goes wrong:** Button shows even when already at top of page
**Why it happens:** No scroll position tracking
**How to avoid:** Use scroll event listener with threshold (e.g., show after 300px scroll)
**Warning signs:** Redundant button when user is already at top

## Code Examples

Verified patterns from official sources:

### Headless UI Listbox for Platform Filter
```typescript
// Source: https://headlessui.com/react/listbox
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react' // or inline SVG

const platforms = [
  { value: '', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
]

export function PlatformSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const selected = platforms.find(p => p.value === value) ?? platforms[0]

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton className="relative w-40 py-3 pl-3 pr-10 text-left bg-surface border border-border rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-purple">
          <span className="block truncate text-gray-300">{selected.label}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </span>
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          className="absolute z-10 mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg focus:outline-none"
        >
          {platforms.map((platform) => (
            <ListboxOption
              key={platform.value}
              value={platform.value}
              className="relative cursor-pointer select-none py-3 pl-10 pr-4 text-gray-300 data-[focus]:bg-background data-[selected]:text-white"
            >
              {({ selected }) => (
                <>
                  <span className={selected ? 'font-medium' : 'font-normal'}>
                    {platform.label}
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-accent-purple">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
```

### Date Range Picker with react-day-picker
```typescript
// Source: https://daypicker.dev/
import { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import 'react-day-picker/style.css'

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const formatRange = () => {
    if (!value?.from) return 'Select dates'
    if (!value.to) return format(value.from, 'MMM d, yyyy')
    return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="py-3 px-3 text-left bg-surface border border-border rounded-lg text-gray-300"
      >
        {formatRange()}
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-1 bg-surface border border-border rounded-lg p-3 shadow-lg">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={(range) => {
              onChange(range)
              if (range?.to) setIsOpen(false)
            }}
            classNames={{
              // Custom Tailwind classes for dark theme
              root: 'text-gray-300',
              day: 'hover:bg-background rounded',
              selected: 'bg-accent-purple text-white',
              range_middle: 'bg-accent-purple/20',
            }}
          />
        </div>
      )}
    </div>
  )
}
```

### Empty State Component
```typescript
// Source: Design system best practices (Shopify Polaris, Atlassian)
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 mb-4 text-gray-500">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{description}</p>
      {action && (
        <a
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}

// Usage for "no data" vs "no results"
<EmptyState
  icon={<UsersIcon />}
  title="No accounts yet"
  description="Start tracking social media accounts to see them here."
  action={{ label: 'Learn how to add accounts', href: '/docs/accounts' }}
/>

// For filtered "no results"
<div className="text-center py-8">
  <p className="text-gray-400">No results for "{query}"</p>
  <button onClick={clearFilters} className="text-accent-purple hover:underline mt-2">
    Clear filters
  </button>
</div>
```

### Scroll-to-Top Button
```typescript
// Source: React scroll-to-top patterns
import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300)
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 p-3 bg-surface border border-border rounded-full shadow-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5 text-gray-300" />
    </button>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useQuery + page state | useInfiniteQuery | React Query v3 (2021) | Built-in page management, automatic cache merging |
| Scroll event listeners | IntersectionObserver | Widely adopted 2020+ | Better performance, native API |
| getNextPageParam optional | getNextPageParam required | React Query v5 (2023) | Must explicitly define pagination logic |
| undefined to end pagination | null OR undefined | React Query v5 (2023) | Both values now indicate no more pages |

**Deprecated/outdated:**
- `react-infinite-scroll-component`: Still works but manual; useInfiniteQuery + IntersectionObserver is cleaner
- `scroll` event listeners for infinite scroll: Replaced by IntersectionObserver API
- React Query v4 syntax: v5 requires `initialPageParam` and has different `getNextPageParam` signature

## Open Questions

Things that couldn't be fully resolved:

1. **Page size selector persistence**
   - What we know: CONTEXT.md specifies 25/50/100 selector
   - What's unclear: Should preference persist across sessions (localStorage)?
   - Recommendation: Store in localStorage for UX consistency; include in queryKey for cache separation

2. **react-day-picker styling in dark theme**
   - What we know: Library supports custom classNames
   - What's unclear: Full set of classNames needed for dark theme consistency
   - Recommendation: Override classNames prop with Tailwind classes; may need custom CSS for some elements

3. **Virtualization threshold**
   - What we know: For very large lists (1000+ items), virtualization helps
   - What's unclear: Will any guild have 1000+ items in single view?
   - Recommendation: Skip virtualization in Phase 3; revisit if performance issues arise

## Sources

### Primary (HIGH confidence)
- TanStack Query v5 Documentation - useInfiniteQuery guide
- Headless UI React Documentation - Listbox component API
- react-intersection-observer GitHub - useInView hook API
- react-day-picker official site - DayPicker range mode

### Secondary (MEDIUM confidence)
- [LogRocket Blog - Pagination and Infinite Scroll](https://blog.logrocket.com/pagination-infinite-scroll-react-query-v3/) - useInfiniteQuery patterns
- [DEV.to - React Intersection Observer](https://dev.to/matan3sh/infinite-scroll-in-react-with-intersection-observer-3932) - Implementation patterns
- [Medium - Debounce in React](https://medium.com/@limaniratnayake/debounce-your-search-and-optimize-your-react-input-component-49a4e62e7e8f) - Debounce patterns

### Tertiary (LOW confidence)
- WebSearch results for skeleton loading patterns - General best practices
- WebSearch results for empty state patterns - Design guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in project or well-documented
- Architecture patterns: HIGH - Based on official documentation and existing codebase
- Pitfalls: MEDIUM - Based on common issues documented across multiple sources
- Code examples: HIGH - Adapted from official documentation

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - stable libraries)
