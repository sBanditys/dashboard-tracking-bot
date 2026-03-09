# Domain Pitfalls

**Domain:** Campaign management UI, payout workflows, analytics, and data export added to existing SaaS dashboard
**Researched:** 2026-03-06
**Confidence:** HIGH (based on direct codebase analysis of 27,231 LOC existing patterns)

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or major UX regressions.

---

### Pitfall 1: Query Key Collision Between Campaign and Bonus Caches

**What goes wrong:** Campaign payouts and bonus payments share conceptual similarity (mark-paid, bulk mark-paid, payment status). If campaign query keys overlap with bonus query keys, mutations in one system invalidate or corrupt the other system's cache. For example, a broad `invalidateQueries({ queryKey: ['guild', guildId] })` after a campaign payout would also blow away all bonus round detail, leaderboard, and results caches.

**Why it happens:** The existing bonus system uses a `bonusKeys` factory with `['guild', guildId, 'bonus', ...]` prefix. The existing `useAddAccount` hook uses `queryClient.invalidateQueries({ queryKey: ['guild', guildId] })` in its `onSuccess` -- a broad pattern that sweeps across all guild queries. If campaign mutations copy this broad pattern, every campaign mutation will invalidate bonus, analytics, tracking, and export caches. Conversely, if bonus mutations sweep broadly, they will reset campaign state.

**Consequences:** Users see stale data in bonus tabs after campaign mutations. Infinite scroll lists reset unexpectedly. Optimistic updates in bonus payments get reverted by campaign invalidation sweeps.

**Prevention:**
- Create a `campaignKeys` factory mirroring the `bonusKeys` pattern (see `use-bonus.ts` lines 22-31)
- All campaign mutations must use narrow invalidation: `['guild', guildId, 'campaigns', ...]` not `['guild', guildId]`
- Exception: only use `['guild', guildId]` (broad) when a mutation changes guild-level counters (e.g., active campaign count displayed on overview page)
- Audit all existing mutation `onSettled`/`onSuccess` handlers to ensure they do not accidentally sweep campaign caches when campaigns are added

**Detection:** After implementing campaign mutations, test: create a campaign payout, then immediately check if bonus round detail is still cached (not refetching). If the bonus tab re-fetches, query key collision exists.

**Phase to address:** Campaign hooks implementation (the very first campaign hook file)

---

### Pitfall 2: Status Lifecycle Not Modeled as a State Machine

**What goes wrong:** The campaign status lifecycle (Draft -> Active -> Paused -> SubmissionsClosed -> Completed) has valid transitions enforced by the backend. If the frontend renders all status action buttons regardless of current state, users see confusing 400/422 errors when clicking "Complete" on a Draft campaign. Worse, if optimistic updates assume the transition succeeds, the UI shows a completed campaign that is actually still a draft until server correction.

**Why it happens:** The bonus system has a simpler lifecycle (unevaluated -> evaluated) with a single action button. Developers copy this "one action" pattern without modeling the 5-state machine. Frontend-only validation gets out of sync with backend rules when new transitions are added.

**Consequences:** 400 errors on invalid transitions confuse users. Optimistic updates on invalid transitions show wrong status until server correction. Users lose trust in the UI.

**Prevention:**
- Define a `VALID_TRANSITIONS` map in the campaign types file:
  ```typescript
  const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
    Draft: ['Active'],
    Active: ['Paused', 'SubmissionsClosed'],
    Paused: ['Active', 'SubmissionsClosed'],
    SubmissionsClosed: ['Completed'],
    Completed: [],
  }
  ```
- UI buttons are derived from `VALID_TRANSITIONS[campaign.status]` -- only valid next states render as actions
- Do NOT use optimistic updates for status transitions -- wait for server confirmation, then invalidate
- Show a loading indicator on the status badge during transition

**Detection:** Enumerate all 5x5 = 25 state pairs. The frontend should make exactly 6 valid transitions possible and 19 impossible (plus 5 self-transitions that are no-ops).

**Phase to address:** Campaign types definition + campaign detail UI

---

### Pitfall 3: Campaign Export Not Updating Shared Export Quota Cache

**What goes wrong:** The existing export system (`use-exports.ts`) has a quota mechanism. `useCreateExport` returns `{ record, quota }` and immediately updates quota in all cached export history queries via `queryClient.setQueriesData` (lines 84-89). Campaign exports share the same guild-level quota on the backend. If campaign exports use a separate code path that does not update the shared quota cache, the UI shows stale quota counts -- the user thinks they have 3 exports remaining when they actually have 1.

**Why it happens:** Developers build campaign export as a standalone feature without realizing the quota is guild-wide. A new `useCreateCampaignExport` that does not call `setQueriesData` on the same `['guild', guildId, 'exports']` key will leave quota out of sync.

**Consequences:** Users exceed their export quota and get unexpected 429 errors. The quota display in the export history tab shows incorrect remaining count. Failed exports do not refresh the quota display.

**Prevention:**
- If the backend campaign export endpoint returns the same `{ export, quota }` shape, reuse the existing `useCreateExport` hook by parameterizing the endpoint URL
- If the campaign export is a separate backend endpoint, ensure its mutation's `onSuccess` updates the same `['guild', guildId, 'exports']` cache with fresh quota data
- Reuse the `useExportProgress` SSE pattern directly for campaign export progress -- do not create a separate SSE hook
- The proxy route for campaign export must be created and must call `sanitizeError()` with contextual message like "export campaign data"

**Detection:** After implementing campaign export: create a regular export, then a campaign export. Does the quota counter in the export history tab decrement for both?

**Phase to address:** Campaign export implementation

---

### Pitfall 4: Race Condition Between Individual and Bulk Payout Mutations

**What goes wrong:** The bonus system solved this exact problem for individual vs. bulk payment updates (see `useUpdatePayment` with optimistic updates at lines 273-308 and `useBulkUpdatePayments` at lines 352-395). If campaign payouts copy only one pattern without the other, concurrent individual and bulk payout mutations will overwrite each other's cache state.

**Why it happens:** Developer implements individual payout with optimistic update (flipping paid status in cache), then implements bulk payout as a simple mutation. User clicks "Mark Paid" on one participant, then immediately clicks "Mark All Paid." The individual optimistic update gets overwritten by the bulk mutation's `onSettled` invalidation, or vice versa.

**Consequences:** Payment status flickers. Optimistic UI shows paid, then unpaid, then paid again. User marks same payment twice because UI is inconsistent.

**Prevention:**
- Individual campaign payout mutations must use the full optimistic update pattern from `useUpdatePayment`: `onMutate` (cancel queries, snapshot, optimistic set), `onError` (rollback), `onSettled` (invalidate)
- Bulk payout mutations must NOT use optimistic updates (outcome is too complex to predict) -- use `onSuccess` invalidation only, matching `useBulkUpdatePayments` pattern
- Both must cancel in-flight queries for the same campaign detail key before mutating
- Both must share the same query key for the campaign detail so `onSettled` invalidation from either mutation forces server truth

**Detection:** Rapidly click individual "Mark Paid" then "Mark All Paid" within 500ms. The UI should never show inconsistent state after both mutations settle.

**Phase to address:** Campaign payout hooks

---

### Pitfall 5: Missing Error Sanitization on Campaign Proxy Routes

**What goes wrong:** Every backend endpoint accessed by the dashboard goes through a Next.js API route that acts as a proxy. Each proxy route calls `sanitizeError()` on non-OK responses and `internalError()` in catch blocks (see `bonus/rounds/route.ts` for the pattern). There are 10 campaign backend endpoints. If any campaign proxy route skips error sanitization, raw backend errors -- including Prisma stack traces, database column names, internal error codes -- leak to the client.

**Why it happens:** Creating 10 proxy routes is tedious. Developer copies the `backendFetch` call but forgets `sanitizeError()` in one route, or uses the wrong context string, or misses the catch block. Or developer creates a single catch-all proxy and loses per-route error context.

**Consequences:** Security violation -- internal error details exposed to client (violates the v1.2 security audit). Error messages are unhelpful ("PrismaClientKnownRequestError" instead of "Failed to load campaigns").

**Prevention:**
- Create a checklist of all 10 campaign proxy routes before implementation. Each must have:
  1. `sanitizeError(response.status, data, '[context]')` for non-OK backend responses
  2. `internalError('[context]')` in the catch block
  3. `Cache-Control: no-store` header on GET responses
  4. Correct HTTP method handlers (GET, POST, PATCH, DELETE as needed)
- Context strings must be descriptive: "load campaigns", "create campaign", "update campaign status", "mark campaign payout paid", "export campaign data", etc.
- Add new backend error codes to `FRIENDLY_MESSAGES` in `error-sanitizer.ts` if the campaign backend introduces any (e.g., `CAMPAIGN_NOT_FOUND`, `INVALID_STATUS_TRANSITION`)

**Detection:** Hit each campaign proxy route with an invalid guildId. The response should contain a sanitized error like "Campaign not found", never a raw Prisma error or stack trace.

**Phase to address:** Proxy routes (must be implemented before campaign hooks)

---

## Moderate Pitfalls

---

### Pitfall 6: GuildTabs Overflow When Adding Campaigns Tab

**What goes wrong:** The `GuildTabs` component renders 5 horizontal tabs: Overview, Brands, Accounts, Posts, Analytics. Adding a "Campaigns" tab makes 6. On mobile viewports (< 640px), 6 tabs overflow horizontally. The component uses `flex gap-4 -mb-px` with no `overflow-x-auto`, so the rightmost tab(s) get clipped or wrap to a second line, breaking the visual design.

**Prevention:**
- Add `overflow-x-auto` to the nav container in `guild-tabs.tsx` when adding the campaigns tab
- Optionally add `scrollbar-hide` (Tailwind plugin) for cleaner mobile appearance
- Test at 375px viewport width (iPhone SE) with all 6 tabs visible
- Consider the tab order: Campaigns is a top-level feature, so place it after Analytics or before Posts based on usage frequency

**Phase to address:** Campaign list UI (when the tab is first added to guild-tabs.tsx)

---

### Pitfall 7: Using Wrong Pagination Pattern for Campaign List

**What goes wrong:** The codebase has two cursor pagination patterns:
1. **Accumulated state** (`useBonusRounds`): manual `useState` for accumulated items, `setCursor`, `loadMore` -- older pattern from v1.1
2. **useInfiniteQuery** (`useAccountsInfinite`/`usePostsInfinite`): React Query's built-in infinite query with `getNextPageParam` -- newer pattern from v1.2 cursor migration

If campaigns use pattern 1 but the component expects pattern 2's `data.pages` structure (or vice versa), rendering breaks silently.

**Prevention:**
- Use `useInfiniteQuery` (pattern 2) for campaigns. It is the newer, preferred pattern. The accumulated state pattern in `useBonusRounds` was an earlier implementation before cursor migration
- Match the backend response shape: `{ campaigns: [...], next_cursor: string | null, has_more: boolean }`
- Include `retry: 2` and handle 400/422 cursor-invalid errors the same way `useAccountsInfinite` does (lines 67-69)
- Include `maxPages: 10` to prevent memory bloat (matching `useAnalyticsActivity`)
- Data persists across tab switches because React Query cache preserves loaded pages (unlike the accumulated state pattern which resets on unmount)

**Phase to address:** Campaign hooks implementation

---

### Pitfall 8: Wrong staleTime for Active vs. Completed Campaign Analytics

**What goes wrong:** The existing `useAnalytics` hook uses 5-minute `staleTime` because "analytics don't change rapidly." Campaign analytics (participant earnings, post counts) change more frequently during an active campaign. Using the same 5-minute staleTime means users do not see updated participant counts for 5 minutes after a new submission.

**Prevention:**
- Campaign analytics for active campaigns should use 2-minute staleTime (matching the normalized 2min standard from v1.2 performance work)
- Campaign analytics for completed campaigns can use 5-minute staleTime (data is frozen)
- Implement conditional staleTime based on campaign status:
  ```typescript
  staleTime: campaign.status === 'Completed' ? 5 * 60 * 1000 : 2 * 60 * 1000
  ```
- Do NOT add `refetchInterval` polling for campaign analytics -- SSE is only for exports, campaigns do not have a dedicated SSE stream

**Phase to address:** Campaign analytics hooks

---

### Pitfall 9: centsToDisplay Duplicated Instead of Extracted to Shared Utility

**What goes wrong:** The bonus system exports `centsToDisplay()` from `use-bonus.ts` (line 40-42). Campaign payouts also deal with cents. Developers either duplicate this function in `use-campaigns.ts` (code duplication) or import it from `use-bonus.ts` (cross-domain dependency). Either way, one system's currency formatting can diverge from the other.

**Prevention:**
- Move `centsToDisplay()` to a shared utility file (e.g., `src/lib/format.ts`) before building campaign payouts
- Both bonus and campaign hooks import from the shared location
- This is a small pre-requisite refactor that prevents the campaign module from depending on the bonus module

**Phase to address:** Pre-requisite refactor before campaign payout work

---

### Pitfall 10: Mutation Buttons Rendered for Non-Admin Users

**What goes wrong:** The bonus system uses `requireGuildAdmin` middleware on the backend for mutations (create round, update payments). Campaign mutations (create, edit, status change, mark payout) also require admin permission. If the frontend renders mutation buttons to non-admin users, they get 403 errors on every action.

**Prevention:**
- The dashboard JWT contains guild permissions. Gate all campaign mutation UI (create, edit, status change, mark paid, bulk mark paid) behind admin permission check on the frontend
- Read-only views (campaign list, campaign detail, analytics) should be accessible to all guild members
- Check how the existing bonus "Create Round" button is conditionally rendered based on admin status and follow the same pattern
- The 403 error from the backend should still show a friendly message via `sanitizeError` as a safety net, but the button should not render for non-admins

**Phase to address:** Campaign UI components (all phases that render mutation buttons)

---

### Pitfall 11: Platform Rate Configuration Form Underestimated

**What goes wrong:** Campaign create/edit forms include "platform rate configuration" -- per-platform payment rates (e.g., Instagram: $50/post, TikTok: $30/post). This is significantly more complex than the bonus round creation form (which only has `bonus_amount_cents` and a targets array). Developers underestimate the form state complexity: dynamic platform fields, currency input parsing, validation, and the create vs. edit form state divergence.

**Prevention:**
- Do NOT use uncontrolled inputs for currency fields -- cents conversion on blur is error-prone and creates jarring UX
- Store all amounts in cents internally, display in dollars with `centsToDisplay()` (extracted to shared utility per Pitfall 9)
- Use a controlled form pattern with explicit state for each platform rate
- Validate before submit: all rates must be positive integers (cents), at least one platform rate must be set
- Wire the `use-unsaved-changes.ts` hook for the edit form (already exists in the codebase)
- Test edge cases: $0.01 (1 cent minimum), $999,999.99 (large amounts), negative values, non-numeric input, empty strings

**Phase to address:** Campaign create/edit form

---

## Minor Pitfalls

---

### Pitfall 12: Campaign Export SSE Using Wrong SSE Pattern

**What goes wrong:** The codebase has two SSE patterns:
1. **`useExportProgress`** (`use-exports.ts` lines 164-199): Simple `EventSource` with `onmessage` parsing, closes on error. Short-lived stream for export progress.
2. **`useSSE`** (`use-sse.ts`): Complex hook with heartbeat timeout, generation counter, visibility-change reconnection. Long-lived stream for bot status.

Campaign export progress should use pattern 1 (simple EventSource) since export SSE streams are short-lived. Using pattern 2 adds unnecessary complexity and reconnection logic that fights with the naturally short-lived export stream.

**Prevention:** Copy the `useExportProgress` pattern for campaign export progress. Do not introduce `useSSE` complexity for export progress.

**Phase to address:** Campaign export UI

---

### Pitfall 13: Heavy Campaign Components Not Dynamically Imported

**What goes wrong:** The codebase uses `next/dynamic` for `CreateRoundModal`, `LeaderboardTab`, and `EmailConfigSection` to reduce initial bundle size (per v1.2 performance optimization). Campaign create/edit forms with platform rate configuration and campaign analytics charts will be similarly heavy. Not lazy-loading them increases the initial bundle for the campaigns page.

**Prevention:** Use `next/dynamic` for campaign create/edit modals and campaign analytics chart components. The campaign list view itself should NOT be dynamically imported (it is the primary content of the campaigns tab).

**Phase to address:** Campaign UI component assembly

---

### Pitfall 14: Missing Audit Log Invalidation After Campaign Mutations

**What goes wrong:** The existing system writes all state changes to `DashboardAuditLog` via backend middleware. Campaign mutations (create, status change, payout) also generate audit log entries on the backend. If campaign mutation hooks do not invalidate the audit log query, the audit log tab shows stale data -- users do not see their recent campaign actions until they manually refresh.

**Prevention:**
- After campaign mutations that the user would expect to see in audit trail (create, status change, mark paid), add `queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'audit-log'] })` to `onSuccess`
- This matches the pattern used by other mutation hooks that trigger audit log writes
- Do NOT create a separate audit mechanism for campaigns -- reuse the existing `use-audit-log.ts` hook and query keys

**Phase to address:** Campaign hooks (add audit log invalidation to mutation onSuccess handlers)

---

### Pitfall 15: Campaign Detail Page Not Handling 404 for Deleted/Inaccessible Campaigns

**What goes wrong:** A campaign can be in any state including Completed. If a user bookmarks a campaign URL and the campaign is later deleted (or the user loses guild access), the detail page shows a generic error boundary instead of a helpful "Campaign not found" message with a link back to the campaigns list.

**Prevention:**
- Campaign detail query should handle 404 explicitly: show a dedicated "Campaign not found" empty state with a "Back to Campaigns" link
- Follow the pattern of how the guild detail page handles 404 (guild not found / no access)
- Do not let 404 bubble to the error boundary -- it is not an "error," it is expected state

**Phase to address:** Campaign detail UI

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Proxy routes | Missing sanitizeError on some routes (P5) | Checklist of all 10 endpoints; template from bonus/rounds/route.ts |
| Campaign types | Status lifecycle not modeled as state machine (P2) | Define VALID_TRANSITIONS map in types file |
| Pre-requisite refactor | centsToDisplay duplication (P9) | Extract to src/lib/format.ts before campaign work begins |
| Campaign hooks | Query key collision with bonus (P1) | campaignKeys factory with narrow invalidation |
| Campaign hooks | Wrong pagination pattern (P7) | Use useInfiniteQuery, not accumulated state |
| Campaign hooks | Missing audit log invalidation (P14) | Add audit-log invalidation to mutation onSuccess |
| Campaign list UI | Tab overflow on mobile (P6) | Add overflow-x-auto to GuildTabs |
| Campaign detail UI | 404 handling (P15) | Dedicated empty state, not error boundary |
| Campaign detail UI | Race condition in payouts (P4) | Copy full optimistic update pattern from useUpdatePayment |
| Campaign create/edit | Currency input complexity (P11) | Cents-based state, controlled inputs, thorough validation |
| Campaign analytics | Wrong staleTime for active campaigns (P8) | Conditional staleTime based on campaign status |
| Campaign export | Quota cache not updated (P3) | Reuse or mirror useCreateExport quota update pattern |
| Campaign export | Wrong SSE pattern (P12) | Use useExportProgress pattern, not useSSE |
| All mutation UIs | Non-admin sees mutation buttons (P10) | Gate behind admin permission check from JWT |
| Bundle optimization | Heavy components not lazy-loaded (P13) | next/dynamic for create/edit modals and analytics charts |
| Tech debt phase | Old envelope support removal | Verify no campaign routes depend on old extractErrorCode path in fetch-with-retry.ts |

---

## Sources

- Direct codebase analysis of existing patterns:
  - `src/hooks/use-bonus.ts` -- payment lifecycle, optimistic updates, query key factory, centsToDisplay
  - `src/hooks/use-exports.ts` -- export quota management, SSE progress pattern
  - `src/hooks/use-tracking.ts` -- cursor pagination with useInfiniteQuery, optimistic deletes
  - `src/hooks/use-analytics.ts` -- analytics staleTime patterns (5min for stable data)
  - `src/lib/fetch-with-retry.ts` -- CSRF injection, rate limit handling, retry logic
  - `src/lib/server/error-sanitizer.ts` -- error sanitization for proxy routes, FRIENDLY_MESSAGES map
  - `src/lib/api-error.ts` -- client-side error parsing
  - `src/components/guild-tabs.tsx` -- tab navigation (5 tabs, no overflow handling)
  - `src/proxy.ts` -- middleware CSRF validation, auth flow
  - `src/app/api/guilds/[guildId]/bonus/rounds/route.ts` -- proxy route template
  - `src/types/bonus.ts` -- type definitions for payment/payout domain
- Project context from `.planning/PROJECT.md` -- v1.3 scope, 10 backend endpoints, status lifecycle

---
*Pitfalls research for: v1.3 Campaign System & Tech Debt -- campaign management UI, payout workflows, analytics, data export*
*Researched: 2026-03-06*
