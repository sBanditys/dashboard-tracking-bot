# Phase 26: Campaign List & Detail - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Read-only campaign UI: browsable list with infinite scroll, status filtering, and a detail view with summary counters, platform rate cards, and budget utilization bar. No mutations — create/edit/delete are Phase 27.

Requirements: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-08, CAMP-09

</domain>

<decisions>
## Implementation Decisions

### List layout
- Card-based layout (single column, like bonus RoundCard pattern)
- Each card shows: campaign name, status badge (pill), brand name, budget (formatted via centsToDisplay), post count, participant count, created date
- Clicking a card navigates to separate detail page at `/guilds/[guildId]/campaigns/[campaignId]`
- No expand-inline — detail page has more room for counters, rates, budget bar

### Status filter
- Top bar with StatusSelect-style dropdown above the card list
- Campaign-specific status select component with 5 statuses + "All" option
- Filter updates list immediately (re-fetches with status param)

### Status badges
- Pill-shaped (rounded-full) badges with semantic colors:
  - Draft → gray-500 bg + gray-800 text
  - Active → green-500 bg + green-900 text
  - Paused → yellow-500 bg + yellow-900 text
  - SubmissionsClosed → orange-500 bg + orange-900 text (displayed as "Submissions Closed")
  - Completed → blue-500 bg + blue-900 text
- Used on both list cards and detail page header

### Detail view structure
- Header section: campaign name, status badge, brand name
- Row of 4 StatCards: Total Earned, Participants, Posts, Budget Remaining
- Budget utilization progress bar: colored by threshold (green <50%, yellow 50-80%, orange 80-90%, red 90%+)
- Platform rate cards section: PlatformIcon + rate per platform, only show platforms with non-null rates (hide null)
- Collapsible "Campaign Settings" section (collapsed by default): rules, dailySubmissionLimit, paymentMethods, channel IDs
- Breadcrumbs navigation: Campaigns > [Campaign Name]

### Navigation & routing
- New "Campaigns" tab added to GuildTabs (Claude decides position — likely after Brands)
- List route: `/guilds/[guildId]/campaigns/page.tsx`
- Detail route: `/guilds/[guildId]/campaigns/[campaignId]/page.tsx`
- Breadcrumbs component for back navigation on detail page
- Page header: "Campaigns" title + filter dropdown row on list page
- No total count displayed (cursor pagination doesn't return totals)

### Loading states
- List: 3-4 skeleton cards matching campaign card layout (campaign-card-skeleton component)
- Detail: full page skeleton — header shimmer + 4 stat card skeletons + budget bar placeholder + rate card placeholders

### Error handling
- Failed list load: inline error message in place of cards with "Try again" button + ConnectionIssuesBanner at top
- Invalid/deleted campaign ID on detail: "Campaign not found" centered message with link back to campaigns list
- Failed detail load: inline error with retry, same pattern as list

### Mobile responsiveness
- List: full-width single-column cards, same info density (no fields hidden)
- Detail: stat cards in 2x2 grid on mobile, rate cards and settings section stack vertically
- Budget bar full-width on all screen sizes

### Empty state
- "No campaigns yet — create one to get started." with description text (no action button — create is Phase 27)
- When status filter has no results: NoResults component with "Clear filters" button

### Claude's Discretion
- Campaigns tab position in GuildTabs order
- Skeleton component exact shimmer patterns
- Exact spacing, padding, and typography within cards
- Detail page section spacing
- Collapsible section animation/transition
- Loading spinner for infinite scroll "load more" at bottom of list

</decisions>

<specifics>
## Specific Ideas

- Budget progress bar colors tie to the campaign's `closeThreshold` field — visual warning system as budget depletes
- Rate cards use existing `PlatformIcon` component with platform-specific colors (pink for IG, gray for TikTok, red for YouTube)
- Card layout mirrors bonus RoundCard feel — bg-surface, border-border, rounded-lg, hover state for clickability
- "Submissions Closed" is the display label for `SubmissionsClosed` enum value — space-separated for readability

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` (`src/components/stat-card.tsx`): Summary counters with label, value, optional icon and trend — use for detail page's 4 metric cards
- `EmptyState` / `NoResults` (`src/components/empty-state.tsx`): Empty list and no-filter-results states
- `PlatformIcon` (`src/components/platform-icon.tsx`): Instagram, TikTok, YouTube, X icons with platform colors
- `StatusSelect` (`src/components/filters/status-select.tsx`): Headless UI Listbox pattern — clone and adapt for campaign statuses
- `Skeleton` (`src/components/ui/skeleton.tsx`): Base shimmer component for loading states
- `Breadcrumbs` (`src/components/layout/breadcrumbs.tsx`): Navigation breadcrumbs for detail page
- `GuildTabs` (`src/components/guild-tabs.tsx`): Tab navigation — add Campaigns tab
- `centsToDisplay` (`src/lib/format.ts`): Currency formatting for budget and rate display
- `ScrollToTop` (`src/components/scroll-to-top.tsx`): Scroll helper for long lists
- `account-card-skeleton` / `post-card-skeleton`: Skeleton card patterns to reference

### Established Patterns
- Cards: `bg-surface border border-border rounded-lg` with hover states
- Infinite scroll: `useInfiniteQuery` with `getNextPageParam` + intersection observer
- Page layout: GuildTabs → page title → filter bar → content area
- Dark theme: gray-300/400 for text, surface/border tokens, accent-purple for interactive elements
- Collapsible sections: `useState` toggle with `ChevronDown`/`ChevronUp` icons (see RoundCard)

### Integration Points
- `useCampaignsInfinite` hook (`src/hooks/use-campaigns.ts`): Ready-made cursor-paginated hook for list
- `useCampaignDetail` hook (`src/hooks/use-campaigns.ts`): Ready-made detail fetch hook
- `Campaign` / `CampaignDetailResponse` types (`src/types/campaign.ts`): Full type definitions available
- `CampaignStatus` type: Union of 5 status strings for type-safe badge rendering
- Route directory: `src/app/(dashboard)/guilds/[guildId]/campaigns/` (new pages)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-campaign-list-detail*
*Context gathered: 2026-03-09*
