# Phase 28: Analytics & Payouts - Research

**Researched:** 2026-03-10
**Domain:** Campaign analytics tables, payout management, tab-based UI
**Confidence:** HIGH

## Summary

Phase 28 adds three tabs (Analytics, Payouts, History) to the existing campaign detail page. All backend endpoints and proxy routes are already built. All 5 React Query hooks (`useCampaignAnalytics`, `useCampaignPayouts`, `usePayoutHistory`, `useMarkPaid`, `useBulkMarkPaid`) are already implemented in `src/hooks/use-campaigns.ts`. The UI work is pure frontend: tab bar, three table views, search input, checkbox selection, confirmation dialogs, and pagination controls.

A `DataTable` component already exists at `src/components/ui/data-table.tsx` with column definitions, skeleton loading, empty states, and sort support. However, it does not support checkbox columns, so the Payouts tab will need either an extended version or custom table markup for the checkbox+bulk-action pattern.

**Primary recommendation:** Build three tab components (AnalyticsTab, PayoutsTab, HistoryTab) as separate files in `src/components/campaigns/`, wire them into the campaign detail page with a state-based tab switcher following the bonus page pattern. The Payouts tab requires the most complexity (checkbox selection, 50-cap enforcement, dual confirmation modals, client-side status filtering).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tab bar inserted between budget progress bar and platform rates section on campaign detail page
- Three tabs: Analytics | Payouts | History
- Analytics is the default active tab when opening the detail page
- Platform rates and campaign settings remain below the tab content area
- Shared search input above the tab bar -- typing a userId filters all three tabs (analytics, payouts, history)
- Analytics tab: Table with columns UserId, Posts, Earned. No sorting. Infinite scroll with cursor pagination
- Payouts tab: Table with columns Checkbox (admin only), UserId, Earned, Status badge. Status filter dropdown (All/Unpaid/Paid) defaulting to Unpaid. Offset pagination with Prev/Next buttons. Select-all checkbox in header selects all unpaid on current page (up to 50 cap). Single mark-paid: confirmation dialog with optimistic update + rollback. Bulk mark-paid: confirmation dialog showing count+total, success toast with paid count and total
- History tab: Table with columns Date, Admin, Participant, Amount, Action. Absolute timestamps ("Mar 10, 2:30 PM"). Most recent first. Offset pagination with Prev/Next
- Checkboxes and mark-paid actions hidden for non-admin users

### Claude's Discretion
- Tab bar styling (underline vs pill tabs)
- Table header styling and row hover states
- Skeleton loading states for each tab
- Debounce timing for search input
- Paid/unpaid badge colors and styles
- Confirmation dialog exact wording
- Success/error toast messages
- Empty states for payouts and history tabs
- Mobile responsive adaptations for tables (horizontal scroll vs stacked)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-01 | User can view cursor-paginated participant earnings table with post counts | `useCampaignAnalytics` hook ready, `AnalyticsResponse` type defined, infinite scroll pattern from campaigns list page |
| ANAL-02 | User can search participants by userId in analytics/payouts view | Shared search input above tab bar, hooks accept `userId` param, need to fix analytics query key to include userId |
| PAY-01 | User can view offset-paginated payout status list (paid/unpaid per participant) | `useCampaignPayouts` hook ready with `keepPreviousData`, `PayoutsResponse` type defined |
| PAY-02 | Admin can mark a single participant as paid with confirmation dialog | `useMarkPaid` hook with full optimistic update pattern ready, `ConfirmationModal` available (needs custom description) |
| PAY-03 | Admin can bulk mark participants as paid (max 50, checkbox selection) | `useBulkMarkPaid` hook ready, BUT sends `discordUserIds` while backend expects `userIds` -- fix needed |
| PAY-04 | User can view offset-paginated payout history audit trail | `usePayoutHistory` hook ready, `PayoutHistoryResponse` type defined |
| PAY-05 | Payout mutations use optimistic updates with rollback on error | `useMarkPaid` has full onMutate/onError/onSettled optimistic pattern; bulk uses cache invalidation only (per user decision) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.20 | Data fetching, caching, mutations | Already used for all hooks |
| react-intersection-observer | ^10.0.2 | Infinite scroll trigger | Already used in campaigns list, accounts, posts pages |
| @headlessui/react | ^2.2.9 | Accessible Dialog for confirmation modals | Already used for all modals |
| sonner | ^2.0.7 | Toast notifications | Already used for all mutation feedback |
| lucide-react | ^0.564.0 | Icons | Already used across all pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | (project standard) | Styling | All component styling |
| zod | (already in types) | N/A -- not needed for this phase | Only used for form validation |

### Alternatives Considered
None -- all libraries already in use. No new dependencies needed.

## Architecture Patterns

### Recommended Component Structure
```
src/components/campaigns/
  analytics-tab.tsx        # Analytics tab content (infinite scroll table)
  payouts-tab.tsx          # Payouts tab content (checkbox table + actions)
  history-tab.tsx          # History tab content (audit trail table)
```

### Pattern 1: State-Based Tab Switcher (from bonus page)
**What:** Simple `useState` tab switching with conditional rendering (no Headless UI Tab component)
**When to use:** When tabs don't need URL persistence and content is within the same page
**Example:**
```typescript
type CampaignTab = 'analytics' | 'payouts' | 'history'

const [activeTab, setActiveTab] = useState<CampaignTab>('analytics')

// Tab buttons use pill/underline style with accent-purple active state
// Conditional rendering: {activeTab === 'analytics' && <AnalyticsTab ... />}
```

### Pattern 2: Infinite Scroll with useInView (from campaigns list)
**What:** Intersection observer triggers `fetchNextPage` when sentinel enters viewport
**When to use:** Analytics tab with cursor-based pagination
**Example:**
```typescript
const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' })

useEffect(() => {
  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

// Flatten pages: data?.pages.flatMap(page => page.participants) ?? []
// Place sentinel div at end: <div ref={ref} />
```

### Pattern 3: Offset Pagination Controls (new for this project)
**What:** Prev/Next buttons with page state managed by component, passed to hook
**When to use:** Payouts tab and History tab
**Example:**
```typescript
const [page, setPage] = useState(0) // 0-indexed for payouts
const { data, isLoading } = useCampaignPayouts(guildId, campaignId, page, 20, debouncedUserId)

const totalPages = data ? Math.ceil(data.pagination.totalCount / data.pagination.pageSize) : 0

// Prev: disabled={page === 0}, onClick={() => setPage(p => p - 1)}
// Next: disabled={page >= totalPages - 1}, onClick={() => setPage(p => p + 1)}
```

### Pattern 4: Client-Side Status Filtering for Payouts
**What:** Backend returns all participants (paid and unpaid); filter client-side
**When to use:** Payouts tab status dropdown (All/Unpaid/Paid)
**Why:** Backend payouts endpoint has no `status` query parameter. Returns `isPaid` boolean per participant, so client-side filtering is straightforward.
**Important caveat:** Client-side filtering means pagination counts will be for the full unfiltered dataset. This is acceptable because the filter is a convenience view, and participants per page is small (20).

### Pattern 5: Checkbox Selection with 50-Cap
**What:** Manage selected IDs in a `Set<string>`, enforce 50-item cap
**When to use:** Payouts tab bulk mark-paid
**Example:**
```typescript
const [selected, setSelected] = useState<Set<string>>(new Set())
const MAX_SELECTION = 50

// Toggle single: add/remove from set
// Select-all: select all unpaid on current page (up to cap)
// Disable unchecked boxes when selected.size >= MAX_SELECTION
// Clear selection after successful bulk operation
```

### Pattern 6: Admin Visibility Guard
**What:** Conditional rendering based on `isAdmin` boolean
**When to use:** Checkbox column, mark-paid buttons, bulk action bar
**Example:**
```typescript
const isAdmin = guild !== undefined && (Number(guild.permissions) & 0x8) !== 0
// Pass isAdmin as prop to tab components
// {isAdmin && <CheckboxColumn />}
```

### Anti-Patterns to Avoid
- **Do NOT use Headless UI Tab components:** Project uses state-based tabs (see bonus page). Headless UI tabs would be inconsistent.
- **Do NOT add `status` parameter to backend:** The payouts endpoint works fine without it. Client-side filtering on 20 items per page is trivial.
- **Do NOT build optimistic updates for bulk:** User decision from Phase 25 -- bulk uses cache invalidation only.
- **Do NOT sort analytics data:** CONTEXT explicitly says no column sorting; backend returns fixed order, cursor pagination makes client sort impractical.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table rendering | Custom `<table>` markup from scratch | `DataTable` from `src/components/ui/data-table.tsx` | Already has skeleton loading, empty state, column definitions, sort arrows, hover states |
| Infinite scroll | Manual IntersectionObserver | `useInView` from `react-intersection-observer` | Already used in 4+ pages |
| Modal dialogs | Custom overlay/portal | `ConfirmationModal` from `src/components/ui/confirmation-modal.tsx` | Already built and styled. For mark-paid with custom description, use Headless UI Dialog directly or extend ConfirmationModal |
| Toast notifications | Custom notification system | `toast` from `sonner` | Already wired into all mutation hooks |
| Currency formatting | `(cents / 100).toFixed(2)` | `centsToDisplay` from `src/lib/format.ts` | Handles locale, comma separators, dollar sign |
| Empty states | Custom empty divs | `EmptyState` / `NoResults` from `src/components/empty-state.tsx` | Consistent styling across app |

## Common Pitfalls

### Pitfall 1: Bulk Endpoint Field Name Mismatch
**What goes wrong:** `useBulkMarkPaid` hook sends `{ discordUserIds }` but backend expects `{ userIds }`
**Why it happens:** Hook was written during Phase 25 planning before backend endpoint was finalized
**How to avoid:** Fix the hook to send `{ userIds: discordUserIds }` or rename the mutation variable. Verify with backend schema: `bulkMarkPaidBodySchema` expects `userIds` array.
**Warning signs:** 400 "Invalid request body" error on bulk mark-paid

### Pitfall 2: Analytics Query Key Missing userId
**What goes wrong:** `useCampaignAnalytics` query key at `campaignKeys.analytics()` does not include `userId`, but the `queryFn` passes `userId` as a query parameter. When user searches, stale cached data from previous search may display.
**Why it happens:** Key factory was defined before search was planned
**How to avoid:** Update `campaignKeys.analytics` to include `userId` parameter, or create separate search-enabled version of the hook
**Warning signs:** Search results not updating, showing wrong participant data

### Pitfall 3: Payouts Page is 0-Indexed, History is 1-Indexed
**What goes wrong:** Mixing up page indexing between the two tabs
**Why it happens:** Backend `payoutsQuerySchema` uses `min(0)` default `0`; `historyQuerySchema` uses `min(1)` default `1`
**How to avoid:** Initial page state: `useState(0)` for payouts, `useState(1)` for history. Pay attention to the "Page X of Y" display math.
**Warning signs:** Empty first page, off-by-one pagination

### Pitfall 4: ConfirmationModal Hardcoded for Delete
**What goes wrong:** Trying to use `ConfirmationModal` for mark-paid gets a "Are you sure you want to delete..." message
**Why it happens:** `ConfirmationModal` has hardcoded "delete" text in its `Description`
**How to avoid:** Either extend `ConfirmationModal` with a `description` prop, or build a custom Dialog using Headless UI for mark-paid confirmations. The existing modal's `confirmLabel` prop helps with button text, but the body text is hardcoded.
**Warning signs:** Delete-themed confirmation text for payment actions

### Pitfall 5: Search Debounce Must Reset Pagination
**What goes wrong:** User types a search query while on page 3, but results show page 3 of the filtered (smaller) dataset -- which may be empty
**Why it happens:** Page state not reset when search changes
**How to avoid:** When debounced search value changes, reset page to 0 (payouts) or 1 (history). For analytics (infinite scroll), the hook refetches from cursor=null automatically.
**Warning signs:** Empty pages after searching, pagination showing "Page 3 of 1"

### Pitfall 6: Checkbox State Persisting Across Page Changes
**What goes wrong:** User selects participants on page 1, navigates to page 2, selections from page 1 are invisible but still counted toward the 50 cap
**Why it happens:** Selection state not cleared on page change
**How to avoid:** Clear selected set when page changes or when status filter changes. Selection scope is current page only.
**Warning signs:** "0 selected" but cannot check more boxes, confused cap enforcement

### Pitfall 7: Optimistic Update Rollback Scope
**What goes wrong:** Mark-paid optimistic update only patches `isPaid` and `paidAt` on the cached data, but if the payouts tab has a status filter set to "Unpaid", the optimistically-updated item should visually disappear from the list
**Why it happens:** Optimistic update modifies in-place but doesn't re-filter
**How to avoid:** After optimistic update, the client-side status filter will naturally hide the item on re-render since `isPaid` becomes `true` and filter is "Unpaid". Just ensure the filter logic runs on the optimistically-updated data.
**Warning signs:** Paid participant still visible in "Unpaid" filter until refetch

## Code Examples

### Existing DataTable Usage Pattern
```typescript
// Source: src/components/ui/data-table.tsx (existing component)
<DataTable
  columns={[
    { key: 'discordUserId', header: 'User ID' },
    { key: 'postCount', header: 'Posts', render: (p) => p.postCount.toLocaleString() },
    { key: 'totalEarnedCents', header: 'Earned', render: (p) => centsToDisplay(p.totalEarnedCents) },
  ]}
  data={participants}
  isLoading={isLoading}
  emptyMessage="No participants yet"
  keyExtractor={(p) => p.discordUserId}
/>
```

### Tab Switcher Pattern (from bonus page)
```typescript
// Source: src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx
type CampaignTab = 'analytics' | 'payouts' | 'history'

const TABS: { id: CampaignTab; label: string }[] = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'history', label: 'History' },
]

// Render with pill-style buttons:
{TABS.map((tab) => (
  <button
    key={tab.id}
    onClick={() => setActiveTab(tab.id)}
    className={cn(
      'relative px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
      activeTab === tab.id
        ? 'bg-accent-purple text-white shadow-sm'
        : 'text-gray-400 hover:text-gray-200'
    )}
  >
    {tab.label}
  </button>
))}
```

### Optimistic Mark-Paid (existing hook)
```typescript
// Source: src/hooks/use-campaigns.ts - useMarkPaid
// Full optimistic update with rollback pattern:
// 1. onMutate: cancel queries, snapshot, optimistically set isPaid=true
// 2. onError: rollback from snapshot
// 3. onSettled: invalidate payouts + audit-log queries
```

### Debounced Search Pattern
```typescript
// Standard React pattern for this codebase
const [search, setSearch] = useState('')
const [debouncedSearch, setDebouncedSearch] = useState('')

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300)
  return () => clearTimeout(timer)
}, [search])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No table component | `DataTable` exists in `src/components/ui/data-table.tsx` | Before Phase 28 | CONTEXT said "No existing table component" but one exists -- use it |
| Manual checkbox in raw table | DataTable doesn't support checkboxes | Current | Payouts tab needs custom table or DataTable extension for checkbox column |

**Note:** CONTEXT code_context section stated "No existing table component -- this phase introduces the table pattern." This is incorrect. `DataTable` already exists and is fully featured with skeleton loading, empty states, and sort support. The payouts tab checkbox requirement is the only gap.

## Open Questions

1. **ConfirmationModal extensibility for non-delete actions**
   - What we know: Current `ConfirmationModal` has hardcoded "Are you sure you want to delete {itemName}?" description
   - What's unclear: Whether to add a `description` prop or create a separate `PaymentConfirmationModal`
   - Recommendation: Add optional `description?: React.ReactNode` prop to `ConfirmationModal` -- quick change, backward compatible. When provided, render it instead of the hardcoded delete text.

2. **Status filter with offset pagination interaction**
   - What we know: Backend doesn't support `status` filter, so filtering is client-side
   - What's unclear: Should we show "Showing X of Y" counts for the filtered view vs total?
   - Recommendation: Show filtered count when filter active, e.g., "3 unpaid of 20 on this page". Keep pagination based on full dataset (backend totalCount).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no test configuration in project) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-01 | Cursor-paginated analytics table renders participants | manual-only | Visual verification | N/A |
| ANAL-02 | Search filters participants by userId | manual-only | Visual verification | N/A |
| PAY-01 | Offset-paginated payout list with paid/unpaid badges | manual-only | Visual verification | N/A |
| PAY-02 | Single mark-paid with confirmation and optimistic update | manual-only | Visual verification | N/A |
| PAY-03 | Bulk mark-paid with checkbox selection (50 cap) | manual-only | Visual verification | N/A |
| PAY-04 | Payout history audit trail with pagination | manual-only | Visual verification | N/A |
| PAY-05 | Optimistic updates with rollback on error | manual-only | Visual verification | N/A |

### Sampling Rate
- **Per task commit:** TypeScript check `npx tsc --noEmit`
- **Per wave merge:** Full TypeScript check + visual verification
- **Phase gate:** All tabs render, search works, mark-paid flows complete

### Wave 0 Gaps
None -- no test infrastructure exists in this project. All verification is TypeScript compilation + manual visual testing.

## Sources

### Primary (HIGH confidence)
- `src/hooks/use-campaigns.ts` - All 5 hooks verified: useCampaignAnalytics, useCampaignPayouts, usePayoutHistory, useMarkPaid, useBulkMarkPaid
- `src/types/campaign.ts` - All response types verified: AnalyticsResponse, PayoutsResponse, PayoutHistoryResponse, MarkPaidResponse, BulkMarkPaidResponse
- `src/components/ui/data-table.tsx` - Existing table component with skeleton, empty state, sort
- `src/components/ui/confirmation-modal.tsx` - Existing modal (hardcoded delete text)
- `src/app/(dashboard)/guilds/[guildId]/bonus/page.tsx` - Tab pattern reference
- `src/app/(dashboard)/guilds/[guildId]/campaigns/page.tsx` - Infinite scroll pattern reference
- Backend: `api/src/routes/dashboard/guilds/guildCampaignPayouts.ts` - Endpoint schemas verified, field name mismatch confirmed

### Secondary (MEDIUM confidence)
- None needed -- all findings verified from codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and in use
- Architecture: HIGH - patterns verified from existing codebase (bonus tabs, campaigns list infinite scroll, DataTable)
- Pitfalls: HIGH - all issues found via direct code inspection (bulk field mismatch, analytics key missing userId, ConfirmationModal hardcoded text)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable -- all infrastructure exists, no moving parts)
