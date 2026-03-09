# Phase 26: Campaign List & Detail - Research

**Researched:** 2026-03-09
**Domain:** Next.js page components, infinite scroll, campaign UI
**Confidence:** HIGH

## Summary

Phase 26 builds read-only campaign UI: a list page with infinite scroll and status filtering, plus a detail page with summary counters, platform rate cards, and a budget utilization bar. All data hooks (`useCampaignsInfinite`, `useCampaignDetail`) and types (`Campaign`, `CampaignDetailResponse`, `CampaignStatus`) are already built from Phase 25. The work is purely UI component creation following established project patterns.

The codebase has strong precedents for every pattern needed. Infinite scroll with `useInView` + `useInfiniteQuery` is used on both the Posts and Accounts pages. Card layouts with `bg-surface border border-border rounded-lg` are standard. The `StatusSelect` component provides the exact Headless UI Listbox pattern to clone for campaign status filtering. `StatCard`, `PlatformIcon`, `EmptyState`, `NoResults`, `Skeleton`, `Breadcrumbs`, `ConnectionIssuesBanner`, and `centsToDisplay` are all ready-made reusable components.

**Primary recommendation:** Clone the Posts page structure for the list (infinite scroll + filter bar + card grid), clone `StatusSelect` for campaign-specific status dropdown, and build the detail page as a new route with `StatCard` grid + custom budget bar + platform rate cards.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card-based layout (single column, like bonus RoundCard pattern)
- Each card shows: campaign name, status badge (pill), brand name, budget (formatted via centsToDisplay), post count, participant count, created date
- Clicking a card navigates to separate detail page at `/guilds/[guildId]/campaigns/[campaignId]`
- Top bar with StatusSelect-style dropdown above the card list
- Campaign-specific status select component with 5 statuses + "All" option
- Pill-shaped (rounded-full) badges with semantic colors: Draft=gray-500, Active=green-500, Paused=yellow-500, SubmissionsClosed=orange-500, Completed=blue-500
- Header section: campaign name, status badge, brand name
- Row of 4 StatCards: Total Earned, Participants, Posts, Budget Remaining
- Budget utilization progress bar: colored by threshold (green <50%, yellow 50-80%, orange 80-90%, red 90%+)
- Platform rate cards section: PlatformIcon + rate per platform, only show platforms with non-null rates
- Collapsible "Campaign Settings" section (collapsed by default): rules, dailySubmissionLimit, paymentMethods, channel IDs
- Breadcrumbs navigation: Campaigns > [Campaign Name]
- New "Campaigns" tab added to GuildTabs
- List route: `/guilds/[guildId]/campaigns/page.tsx`
- Detail route: `/guilds/[guildId]/campaigns/[campaignId]/page.tsx`
- No total count displayed (cursor pagination doesn't return totals)
- List loading: 3-4 skeleton cards matching campaign card layout
- Detail loading: full page skeleton (header shimmer + 4 stat card skeletons + budget bar + rate card placeholders)
- Failed list load: inline error message with "Try again" button + ConnectionIssuesBanner
- Invalid/deleted campaign ID: "Campaign not found" centered message with link back
- Mobile: stat cards 2x2 grid, rate cards stack vertically, budget bar full-width
- Empty state: "No campaigns yet" with description (no action button)
- Status filter no results: NoResults component with "Clear filters" button

### Claude's Discretion
- Campaigns tab position in GuildTabs order
- Skeleton component exact shimmer patterns
- Exact spacing, padding, and typography within cards
- Detail page section spacing
- Collapsible section animation/transition
- Loading spinner for infinite scroll "load more" at bottom of list

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAMP-01 | User can view paginated campaign list with cursor-based infinite scroll | `useCampaignsInfinite` hook ready; `useInView` + intersection observer pattern from Posts/Accounts pages |
| CAMP-02 | User can filter campaigns by status (Draft/Active/Paused/SubmissionsClosed/Completed) | `StatusSelect` Headless UI Listbox pattern to clone; hook accepts optional `status` param |
| CAMP-03 | User can view campaign detail with summary counters (earned, participants, posts, budget remaining) | `useCampaignDetail` hook ready; `StatCard` component for counters; `centsToDisplay` for formatting |
| CAMP-04 | User can see color-coded status badges on list and detail views | New `CampaignStatusBadge` component with 5-color mapping per CONTEXT decisions |
| CAMP-08 | User can see platform rate cards with icons on campaign detail | `PlatformIcon` component ready; campaign type has `instagramRateCents`, `tiktokRateCents`, `youtubeRateCents` |
| CAMP-09 | User can see budget utilization progress bar on campaign detail | Custom progress bar; data: `totals.totalEarnedCents` / `campaign.budgetCents`; thresholds from `closeThreshold` |
</phase_requirements>

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16 | App router pages at `/guilds/[guildId]/campaigns/` | Project framework |
| React | ^19 | Component rendering | Project framework |
| @tanstack/react-query | ^5.90 | `useCampaignsInfinite` / `useCampaignDetail` hooks | Already used everywhere |
| @headlessui/react | ^2.2.9 | Listbox for campaign status select | Same as existing `StatusSelect` |
| react-intersection-observer | ^10.0.2 | `useInView` for infinite scroll sentinel | Same as Posts/Accounts pages |
| lucide-react | ^0.564 | Icons (ChevronDown, RefreshCw, etc.) | Project icon library |
| date-fns | ^4.1 | Date formatting for campaign cards | Already used in RoundCard |
| tailwindcss | ^3.4.1 | All styling | Project CSS framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.0.7 | Toast notifications | Error retry feedback (if needed) |
| clsx (via cn) | ^2.1.1 | Conditional class merging | All component styling |

### Alternatives Considered
None -- all libraries are already in the project and match existing patterns exactly.

## Architecture Patterns

### New Files Structure
```
src/
├── app/(dashboard)/guilds/[guildId]/campaigns/
│   ├── page.tsx                    # Campaign list page (CAMP-01, CAMP-02, CAMP-04)
│   └── [campaignId]/
│       └── page.tsx                # Campaign detail page (CAMP-03, CAMP-04, CAMP-08, CAMP-09)
├── components/campaigns/
│   ├── campaign-card.tsx           # List card component
│   ├── campaign-card-skeleton.tsx  # Skeleton for list loading
│   ├── campaign-status-badge.tsx   # Color-coded pill badge (shared list + detail)
│   ├── campaign-status-select.tsx  # Status filter dropdown (Listbox clone)
│   ├── budget-progress-bar.tsx     # Budget utilization bar with color thresholds
│   ├── platform-rate-cards.tsx     # Rate card grid with PlatformIcon
│   ├── campaign-settings.tsx       # Collapsible settings section
│   └── campaign-detail-skeleton.tsx # Detail page skeleton
```

### Pattern 1: Infinite Scroll List Page
**What:** Page with `useInfiniteQuery` + intersection observer sentinel + status filter
**When to use:** Campaign list page (same as Posts/Accounts pages)
**Example:**
```typescript
// Source: Posts page pattern (src/app/(dashboard)/guilds/[guildId]/posts/page.tsx)
const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
  useCampaignsInfinite(guildId, statusFilter || undefined)

const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage()
  }
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

const campaigns = data?.pages.flatMap(page => page.campaigns) ?? []
```

### Pattern 2: Detail Page with Params
**What:** Server component params unwrapping with `use()` + detail query hook
**When to use:** Campaign detail page
**Example:**
```typescript
// Source: All guild subpages use this pattern
interface PageProps {
  params: Promise<{ guildId: string; campaignId: string }>
}

export default function CampaignDetailPage({ params }: PageProps) {
  const { guildId, campaignId } = use(params)
  const { data, isLoading, isError, refetch } = useCampaignDetail(guildId, campaignId)
  // ...
}
```

### Pattern 3: Status Badge Component
**What:** Reusable pill badge that maps CampaignStatus to colors
**When to use:** On campaign cards and detail page header
**Example:**
```typescript
const STATUS_STYLES: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
  Draft:             { bg: 'bg-gray-500',   text: 'text-gray-800',   label: 'Draft' },
  Active:            { bg: 'bg-green-500',  text: 'text-green-900',  label: 'Active' },
  Paused:            { bg: 'bg-yellow-500', text: 'text-yellow-900', label: 'Paused' },
  SubmissionsClosed: { bg: 'bg-orange-500', text: 'text-orange-900', label: 'Submissions Closed' },
  Completed:         { bg: 'bg-blue-500',   text: 'text-blue-900',   label: 'Completed' },
}
```

### Pattern 4: Budget Progress Bar
**What:** Horizontal bar showing budget utilization with color thresholds
**When to use:** Campaign detail page
**Example:**
```typescript
// percentage = (totalEarnedCents / budgetCents) * 100
// Color thresholds per CONTEXT: green <50%, yellow 50-80%, orange 80-90%, red 90%+
function getBarColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 80) return 'bg-orange-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}
```

### Pattern 5: Collapsible Section (Campaign Settings)
**What:** Toggle section with grid animation (like brands page expandable content)
**When to use:** Campaign settings on detail page (collapsed by default)
**Example:**
```typescript
// Source: Brands page pattern (grid-rows transition)
const [settingsOpen, setSettingsOpen] = useState(false)
// Use grid-rows-[1fr]/grid-rows-[0fr] transition from brands page
```

### Pattern 6: GuildTabs Extension
**What:** Add "Campaigns" entry to the tabs array
**When to use:** One-line change to `guild-tabs.tsx`
**Example:**
```typescript
// Add after 'Brands' entry (Claude's discretion on position)
const tabs = [
  { name: 'Overview', href: '' },
  { name: 'Brands', href: '/brands' },
  { name: 'Campaigns', href: '/campaigns' },  // NEW
  { name: 'Accounts', href: '/accounts' },
  { name: 'Posts', href: '/posts' },
  { name: 'Analytics', href: '/analytics' },
]
```

### Anti-Patterns to Avoid
- **Custom Breadcrumbs for detail page:** The existing `Breadcrumbs` component auto-parses pathname segments. However, it will show "Campaigns" and the raw campaignId as breadcrumb labels. For the campaign name breadcrumb, build a simple custom breadcrumb for the detail page (link to list + campaign name text) rather than trying to make the generic component work.
- **Client-side status filtering:** Unlike Posts/Accounts which do client-side filtering on top of server data, campaign status filtering should be server-side only (the hook already passes `status` param to the API). Do NOT add useMemo client-side filtering.
- **Separate fetch for brand name on list cards:** The `Campaign` type already includes `brandId` but not `brandLabel` in the list response. However, looking at the type, the list response uses `Campaign` which has no brand name. The detail response has `brand: { id, label }`. For list cards, either show brand ID or skip brand name. Check if backend list response actually includes brand info. If not, only show brand name on detail page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status filter dropdown | Custom select/dropdown | Clone `StatusSelect` with `@headlessui/react` Listbox | ARIA compliance, keyboard nav, focus management |
| Infinite scroll | Custom scroll event listener | `react-intersection-observer` `useInView` | Handles edge cases, rootMargin, threshold |
| Currency formatting | Manual division/formatting | `centsToDisplay` from `@/lib/format` | Already handles locale, decimal places |
| Platform icons | Icon imports or emoji | `PlatformIcon` component | Already has all platforms with correct colors |
| Loading skeletons | Custom divs with animation | `Skeleton` component with `animate-pulse` | Consistent shimmer, matches project style |
| Empty/no-results states | Custom empty messages | `EmptyState` / `NoResults` components | Consistent styling, built-in clear-filter button |

**Key insight:** This phase is almost entirely composition of existing components. The only truly new UI elements are the campaign card, status badge pill, budget progress bar, and platform rate cards section.

## Common Pitfalls

### Pitfall 1: Brand Name Missing from List Response
**What goes wrong:** Campaign list cards should show brand name, but `Campaign` type only has `brandId`, not brand label. The `brand: { id, label }` is only on `CampaignDetailResponse`.
**Why it happens:** List endpoint returns lighter `Campaign` objects without joined relations.
**How to avoid:** Check the actual API response. If brand label is absent from list, either: (a) omit brand name from list cards, (b) show brandId as fallback, or (c) fetch brands separately and join client-side. Option (a) is simplest; the user can see brand name on the detail page.
**Warning signs:** Card shows undefined or "[object Object]" for brand name.

### Pitfall 2: NoResults Component Expects Search Query
**What goes wrong:** `NoResults` component takes a `query: string` prop showing "No results for [query]". For status filtering, there is no text query.
**How to avoid:** Either: (a) pass the status label as the query string, or (b) create a lightweight variant that says "No campaigns match the selected status" with clear-filters button. Option (a) works: `<NoResults query={statusLabel} onClear={() => setStatus('')} />`.
**Warning signs:** Empty string in "No results for" message.

### Pitfall 3: Budget Bar Division by Zero
**What goes wrong:** If `budgetCents` is 0, percentage calculation produces Infinity or NaN.
**Why it happens:** Draft campaigns might have 0 budget.
**How to avoid:** Guard: `const pct = budgetCents > 0 ? (totalEarnedCents / budgetCents) * 100 : 0`. Clamp to 0-100 range.
**Warning signs:** Bar overflows container or shows NaN%.

### Pitfall 4: SubmissionsClosed Display Label
**What goes wrong:** Status enum value "SubmissionsClosed" rendered as-is instead of "Submissions Closed".
**Why it happens:** Forgetting to map the enum to display text.
**How to avoid:** The `STATUS_STYLES` mapping must include a `label` field. "SubmissionsClosed" maps to display label "Submissions Closed".
**Warning signs:** Badge shows "SubmissionsClosed" with no space.

### Pitfall 5: Breadcrumbs Auto-Parse Shows Campaign ID
**What goes wrong:** The existing `Breadcrumbs` component splits pathname segments and capitalizes them. For `/guilds/abc123/campaigns/def456`, it would show "Def456" instead of the campaign name.
**How to avoid:** Build a simple custom breadcrumb for the detail page: `Campaigns` (link to list) > `{campaign.name}` (current page text). Do not use the generic `Breadcrumbs` component.
**Warning signs:** Breadcrumb shows UUID-like string instead of campaign name.

### Pitfall 6: Stale List After Navigation Back from Detail
**What goes wrong:** User views detail, navigates back to list, but list shows stale data.
**Why it happens:** React Query cache serves stale data.
**How to avoid:** The 2-minute staleTime in `useCampaignsInfinite` is appropriate. Do NOT set staleTime to 0 or add refetchOnFocus -- the existing behavior is intentional project-wide.
**Warning signs:** None needed -- this is handled by the existing 2min staleTime.

## Code Examples

### Campaign Card Component
```typescript
// Source: RoundCard pattern + CONTEXT decisions
interface CampaignCardProps {
  campaign: Campaign
  guildId: string
}

export function CampaignCard({ campaign, guildId }: CampaignCardProps) {
  return (
    <Link
      href={`/guilds/${guildId}/campaigns/${campaign.id}`}
      className="block bg-surface border border-border rounded-lg p-4 hover:bg-surface-hover/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white truncate">{campaign.name}</h3>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <div className="space-y-1 text-sm text-gray-400">
        <p>Budget: {centsToDisplay(campaign.budgetCents)}</p>
        <div className="flex gap-4">
          <span>{campaign._count.posts} posts</span>
          <span>{campaign._count.participants} participants</span>
        </div>
        <p className="text-xs text-gray-500">{format(new Date(campaign.createdAt), 'MMM d, yyyy')}</p>
      </div>
    </Link>
  )
}
```

### Campaign Status Select (Listbox Clone)
```typescript
// Source: StatusSelect component pattern (src/components/filters/status-select.tsx)
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'

const campaignStatuses = [
  { value: '', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Paused', label: 'Paused' },
  { value: 'SubmissionsClosed', label: 'Submissions Closed' },
  { value: 'Completed', label: 'Completed' },
]
// Rest follows exact StatusSelect pattern with Listbox/ListboxButton/ListboxOptions/ListboxOption
```

### Budget Progress Bar
```typescript
// Custom component -- no existing equivalent in project
interface BudgetProgressBarProps {
  totalEarnedCents: number
  budgetCents: number
}

export function BudgetProgressBar({ totalEarnedCents, budgetCents }: BudgetProgressBarProps) {
  const pct = budgetCents > 0
    ? Math.min((totalEarnedCents / budgetCents) * 100, 100)
    : 0

  const barColor = pct >= 90 ? 'bg-red-500'
    : pct >= 80 ? 'bg-orange-500'
    : pct >= 50 ? 'bg-yellow-500'
    : 'bg-green-500'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">Budget Used</span>
        <span className="text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{centsToDisplay(totalEarnedCents)} spent</span>
        <span>{centsToDisplay(budgetCents)} total</span>
      </div>
    </div>
  )
}
```

### Platform Rate Cards
```typescript
// Uses existing PlatformIcon component
const PLATFORMS = [
  { key: 'instagramRateCents' as const, platform: 'instagram', label: 'Instagram' },
  { key: 'tiktokRateCents' as const, platform: 'tiktok', label: 'TikTok' },
  { key: 'youtubeRateCents' as const, platform: 'youtube', label: 'YouTube' },
] as const

export function PlatformRateCards({ campaign }: { campaign: Campaign }) {
  const activePlatforms = PLATFORMS.filter(p => campaign[p.key] !== null)

  if (activePlatforms.length === 0) {
    return <p className="text-sm text-gray-500">No platform rates configured</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {activePlatforms.map(p => (
        <div key={p.key} className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
          <PlatformIcon platform={p.platform} size="w-6 h-6" />
          <div>
            <p className="text-sm text-gray-400">{p.label}</p>
            <p className="text-white font-medium">{centsToDisplay(campaign[p.key]!)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router params | App Router `params: Promise<>` with `use()` | Next.js 15+ | All page components use `use(params)` pattern |
| `include` for Headless UI | Named imports: `Listbox, ListboxButton, ListboxOptions, ListboxOption` | @headlessui/react v2 | Direct named exports, no dot notation |

**Deprecated/outdated:**
- None relevant -- all project patterns are current.

## Open Questions

1. **Brand name on list cards**
   - What we know: `Campaign` type has `brandId` but no brand label. `CampaignDetailResponse` has `brand: { id, label }`.
   - What's unclear: Whether the backend list endpoint actually includes brand info in the response beyond the type definition.
   - Recommendation: Check backend response at runtime. If brand name is absent, omit from list cards (visible on detail page). If backend serializes the brand relation, add `brand?: { id: string; label: string }` to list `Campaign` type.

## Validation Architecture

> nyquist_validation not explicitly set to false in config.json -- including section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | playwright.config.ts (assumed) |
| Quick run command | `npx playwright test --grep "campaign"` |
| Full suite command | `npm run test:e2e` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMP-01 | Campaign list with infinite scroll | e2e | `npx playwright test tests/campaigns-list.spec.ts -x` | No -- Wave 0 |
| CAMP-02 | Filter by status | e2e | `npx playwright test tests/campaigns-list.spec.ts --grep "filter" -x` | No -- Wave 0 |
| CAMP-03 | Detail with counters | e2e | `npx playwright test tests/campaign-detail.spec.ts -x` | No -- Wave 0 |
| CAMP-04 | Color-coded badges | manual-only | Visual verification | N/A |
| CAMP-08 | Platform rate cards | e2e | `npx playwright test tests/campaign-detail.spec.ts --grep "rate" -x` | No -- Wave 0 |
| CAMP-09 | Budget progress bar | e2e | `npx playwright test tests/campaign-detail.spec.ts --grep "budget" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** Visual verification in browser (localhost:3001)
- **Per wave merge:** `npm run test:e2e` (if e2e tests are added)
- **Phase gate:** TypeScript check `npx tsc --noEmit` + visual verification

### Wave 0 Gaps
- [ ] `tests/campaigns-list.spec.ts` -- covers CAMP-01, CAMP-02
- [ ] `tests/campaign-detail.spec.ts` -- covers CAMP-03, CAMP-08, CAMP-09
- Note: E2E tests require running backend with test data; may be deferred if test infrastructure is not set up for campaign endpoints.

## Sources

### Primary (HIGH confidence)
- Project codebase -- direct inspection of all referenced components, hooks, types, and page patterns
- `src/hooks/use-campaigns.ts` -- Phase 25 hooks (useCampaignsInfinite, useCampaignDetail)
- `src/types/campaign.ts` -- Phase 25 types (Campaign, CampaignStatus, CampaignDetailResponse)
- `src/app/(dashboard)/guilds/[guildId]/posts/page.tsx` -- infinite scroll + filter pattern
- `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` -- infinite scroll + card grid pattern
- `src/components/filters/status-select.tsx` -- Headless UI Listbox pattern
- `src/components/bonus/round-card.tsx` -- Collapsible card pattern
- `src/app/(dashboard)/guilds/[guildId]/brands/page.tsx` -- Grid-rows expand/collapse animation
- `src/components/stat-card.tsx` -- StatCard for detail counters
- `src/components/platform-icon.tsx` -- Platform icons with colors
- `src/components/empty-state.tsx` -- EmptyState and NoResults
- `src/components/guild-tabs.tsx` -- Tab navigation (needs Campaigns entry)
- `src/lib/format.ts` -- centsToDisplay utility

### Secondary (MEDIUM confidence)
- None needed -- all patterns verified directly in codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in project
- Architecture: HIGH - all patterns have direct precedent in existing pages
- Pitfalls: HIGH - identified from direct code inspection and type analysis

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies changing)
