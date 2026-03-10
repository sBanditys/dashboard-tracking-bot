# Phase 28: Analytics & Payouts - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view campaign performance data (participant earnings and post counts) and admins can manage participant payments (mark paid, bulk mark paid, payout history audit trail). All content lives within the existing campaign detail page via tabs. No campaign CRUD — that's Phase 27. No export — that's Phase 29.

Requirements: ANAL-01, ANAL-02, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05

</domain>

<decisions>
## Implementation Decisions

### Section placement
- Tab bar inserted between budget progress bar and platform rates section on campaign detail page
- Three tabs: Analytics | Payouts | History
- Analytics is the default active tab when opening the detail page
- Platform rates and campaign settings remain below the tab content area
- Shared search input above the tab bar — typing a userId filters all three tabs (analytics, payouts, history)

### Participant table (Analytics tab)
- Table layout with columns: UserId, Posts, Earned
- No column sorting — backend returns data in fixed order, cursor pagination makes client-side sort impractical
- Infinite scroll using cursor-based `useCampaignAnalytics` hook (matches accounts/posts pattern)
- Empty state: "No participants yet" with simple message, using existing EmptyState component

### Payout list (Payouts tab)
- Table layout with columns: Checkbox (admin only), UserId, Earned, Status (Paid/Unpaid badge)
- Status filter dropdown: All / Unpaid / Paid — defaults to "Unpaid" since admins primarily come here to mark payments
- Offset pagination with Prev/Next buttons (matches Phase 25 `useCampaignPayouts` hook)
- Select-all checkbox in table header selects/deselects all unpaid participants on current page (up to 50 cap)
- Once 50 items are selected, remaining unchecked boxes become disabled
- Single mark-paid: confirmation dialog showing userId and amount, then optimistic update with rollback on error (PAY-02, PAY-05)
- Bulk mark-paid: confirmation dialog showing count and total amount ("Mark 12 participants as paid? Total: $1,450.00"), success toast with paid count and total (PAY-03, PAY-04)
- Checkboxes and bulk/mark-paid actions hidden for non-admin users (admin visibility guard)

### Payout history (History tab)
- Table layout with columns: Date, Admin, Participant, Amount, Action (paid/unpaid)
- Absolute timestamps in "Mar 10, 2:30 PM" format — precise for audit/accounting
- Most recent first (chronological descending)
- Offset pagination with Prev/Next buttons (matches `usePayoutHistory` hook)
- Shared search bar filters history entries by userId too

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

</decisions>

<specifics>
## Specific Ideas

- Tab bar sits between budget bar and platform rates — analytics/payouts are the "action area" while rates/settings are reference info below
- Default to "Unpaid" filter on Payouts tab — this is the actionable workflow, paid participants are already handled
- Select-all respects the 50-cap — disables remaining checkboxes once limit reached, preventing confusion about partial bulk operations
- Both single and bulk mark-paid require confirmation dialogs — financial actions deserve explicit confirmation
- Shared search across all three tabs means one input, consistent filtering — type a userId and see their analytics, payment status, and history in each tab

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useCampaignAnalytics` (`src/hooks/use-campaigns.ts`): Cursor-paginated infinite query for participant earnings
- `useCampaignPayouts` (`src/hooks/use-campaigns.ts`): Offset-paginated query for payout status list
- `usePayoutHistory` (`src/hooks/use-campaigns.ts`): Offset-paginated query for audit trail
- `useMarkPaid` (`src/hooks/use-campaigns.ts`): Single mark-paid mutation with optimistic updates
- `useBulkMarkPaid` (`src/hooks/use-campaigns.ts`): Bulk mark-paid mutation with cache invalidation
- `StatCard` (`src/components/stat-card.tsx`): Already used in campaign detail for summary counters
- `EmptyState` / `NoResults` (`src/components/empty-state.tsx`): Empty list and no-filter-results states
- `ConfirmationModal` (`src/components/ui/confirmation-modal.tsx`): Confirmation dialog for mark-paid actions
- `centsToDisplay` (`src/lib/format.ts`): Currency formatting for earned amounts
- `Skeleton` (`src/components/ui/skeleton.tsx`): Base shimmer for loading states

### Established Patterns
- Tables: No existing table component — this phase introduces the table pattern (bg-surface, border-border, divide-y)
- Infinite scroll: Intersection observer with `useInfiniteQuery` and `getNextPageParam` (accounts/posts)
- Offset pagination: Component manages page state, passes to hook (payouts/history hooks ready)
- Admin guards: `isAdmin` boolean from guild permissions, conditional rendering with `{isAdmin && ...}`
- Optimistic updates: `onMutate` with snapshot, `onError` with rollback, `onSettled` with invalidation (see `useMarkPaid`)

### Integration Points
- Campaign detail page (`src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx`): Insert tab bar and tab content between budget bar and platform rates
- Campaign components directory (`src/components/campaigns/`): New tab components (AnalyticsTab, PayoutsTab, HistoryTab)
- Campaign hooks (`src/hooks/use-campaigns.ts`): All 5 hooks ready to consume

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-analytics-payouts*
*Context gathered: 2026-03-10*
