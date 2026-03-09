# Technology Stack

**Project:** Dashboard v1.3 — Campaign System & Tech Debt
**Researched:** 2026-03-06
**Confidence:** HIGH

---

## Verdict: No New Dependencies Required

The existing stack covers every capability needed for campaign management UI, analytics, payout workflows, and campaign export. This milestone is a feature build on established patterns, not a technology expansion.

---

## Current Stack (Validated, DO NOT Change)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^16 (App Router) | Framework, SSR, API proxy routes |
| React | ^19 | UI rendering |
| @tanstack/react-query | ^5.90.20 | Server state, caching, mutations, infinite scroll |
| Tailwind CSS | ^3.4.1 | Styling (custom components, no library) |
| Recharts | ^3.7.0 | Charts (BarChart, AreaChart already used for analytics) |
| @headlessui/react | ^2.2.9 | Accessible modals, selects, transitions |
| react-day-picker | ^9.13.0 | Date selection (already used in WeekPicker, DateRangePicker) |
| date-fns | ^4.1.0 | Date formatting and manipulation |
| lucide-react | ^0.564.0 | Icons |
| sonner | ^2.0.7 | Toast notifications |
| zod | ^4.3.6 | Client-side form validation |
| react-intersection-observer | ^10.0.2 | Infinite scroll trigger |
| clsx | ^2.1.1 | Conditional classnames |

---

## What Each Campaign Feature Reuses

### Campaign List (cursor pagination + status filtering)

**Reuses:** Accumulated state pattern from `use-bonus.ts` (not `useInfiniteQuery`), cursor pagination from v1.2, status filter from `RoundFilter` pattern, `react-intersection-observer` for Load More.

**Why not useInfiniteQuery:** The codebase deliberately uses manual accumulated state with cursor tracking (see `useBonusRounds`). This pattern gives finer control over filter resets and cache invalidation after mutations. Campaign list follows the same pattern for consistency.

**Backend contract:**
```
GET /guilds/:guildId/campaigns?cursor=X&limit=20&status=Active
Response: { campaigns: [...], nextCursor: string | null }
```

### Campaign Detail + Analytics

**Reuses:** `useQuery` with `enabled` flag pattern (see `useBonusRoundDetail`), `Recharts` BarChart for participant earnings visualization, `centsToDisplay` helper for currency formatting, cursor pagination for participant list.

**Charts needed:** Horizontal BarChart for top earners by participant (pattern exists in `analytics-chart.tsx`). No new chart types required.

**Backend contract:**
```
GET /guilds/:guildId/campaigns/:campaignId
Response: { campaign: {..., _count: {posts, participants}}, totals: {totalEarnedCents, participantCount} }

GET /guilds/:guildId/campaigns/:campaignId/analytics?cursor=X&limit=20
Response: { participants: [{...participant, postCount}], nextCursor }
```

### Campaign Create/Edit Forms

**Reuses:** `useMutation` with `onSuccess` invalidation pattern, `zod` for client-side validation (mirrors backend `createCampaignSchema`/`updateCampaignSchema`), `@headlessui/react` Dialog for modal forms, `sonner` toast for success/error feedback.

**Form validation approach:** Use Zod schemas matching backend schemas. The codebase does NOT use a form library (no react-hook-form, no formik) -- it uses controlled components with local state and Zod `.safeParse()` on submit. Follow this pattern.

**Backend contract:**
```
POST /guilds/:guildId/campaigns
Body: { name, budgetCents, perUserCapCents, instagramRateCents?, tiktokRateCents?, youtubeRateCents? }
Response: { campaign }  (201)

PATCH /guilds/:guildId/campaigns/:campaignId
Body: { name?, budgetCents?, perUserCapCents?, rules?, instagramRateCents?, ... }
Response: { campaign }
```

### Campaign Status Lifecycle

**Reuses:** Status badge component pattern (similar to export status badges), confirmation dialogs via Headless UI Dialog, mutation hooks with status-guard error handling (409 Conflict for invalid transitions).

**Status transitions the UI must enforce:**
- Draft -> Active (activate)
- Active -> Paused (pause)
- Paused -> Active (resume)
- Active/Paused -> SubmissionsClosed (close submissions)
- SubmissionsClosed -> Completed (complete)
- Draft/Completed -> DELETE (soft delete, 409 for others)

**IMPORTANT:** The backend `updateCampaignSchema` does NOT currently include `status` as a valid field. Status transitions may need a dedicated backend endpoint or the schema needs extending. This is a **blocker** that must be resolved before building the status lifecycle UI.

### Payout Management

**Reuses:** Optimistic update pattern from `useUpdatePayment` in `use-bonus.ts`, bulk mutation pattern from `useBulkUpdatePayments`, `use-selection.ts` hook for checkbox multi-select, offset-based pagination (payouts endpoint uses page/pageSize, not cursors).

**Key difference from bonus payouts:** Campaign payouts use offset pagination (page/pageSize) unlike cursor-based pattern used elsewhere. The `useExportHistory` hook already demonstrates this pattern.

**Backend contract:**
```
GET  /guilds/:guildId/campaigns/:campaignId/payouts?page=0&pageSize=20&userId=X
Response: { participants: [{discordUserId, totalEarnedCents, isPaid, paidAt, paidAmountCents, paymentMethod}], pagination: {page, pageSize, totalCount} }

POST /guilds/:guildId/campaigns/:campaignId/payouts/mark-paid
Body: { discordUserId }
Response: { success, amountCents, paymentMethod }

POST /guilds/:guildId/campaigns/:campaignId/payouts/bulk
Body: { userIds: string[] }  (max 50)
Response: { success, paidCount, totalCents }

GET  /guilds/:guildId/campaigns/:campaignId/payouts/history?page=1&pageSize=20&userId=X
Response: { entries: [{id, timestamp, actorId, discordUserId, amountCents, paymentMethod}], pagination }
```

### Campaign Export

**Reuses:** `useCreateExport` pattern for triggering async exports, `useExportProgress` SSE pattern for real-time progress, `useExportStatus` polling pattern as fallback.

The backend campaign export uses the same `DataExport` table as general exports (via `createExport` with `exportType: 'campaign'`), so the existing SSE progress endpoint works without changes.

**Backend contract:**
```
POST /guilds/:guildId/campaigns/:campaignId/export
Body: { format: 'csv' | 'xlsx', scope: 'payment' | 'full' }
Response: { exportId, status: 'queued' }  (202)

GET  /guilds/:guildId/campaigns/:campaignId/export/:exportId
Response: { exportId, status, downloadUrl?, expiresAt?, error? }
```

---

## Libraries Explicitly NOT Needed

| Library | Why NOT |
|---------|---------|
| react-hook-form | Codebase uses controlled components + Zod. Adding a form library for 2 forms (create/edit campaign) adds bundle size and breaks consistency with all other forms in the app. |
| @tanstack/react-table | Campaign analytics is a simple list with 4-5 columns. Existing table patterns (bonus payments, audit log) use plain `<table>` with Tailwind. No sorting/resizing/virtualization needed. |
| chart.js / visx / nivo | Recharts ^3.7.0 already handles all needed chart types. Campaign analytics needs BarChart (earnings by participant) which already exists. |
| react-select | Headless UI Listbox already handles status filter dropdowns. Used throughout the app. |
| xlsx / exceljs | Export is server-side (backend worker). Dashboard only triggers and tracks progress. |
| dayjs / moment | date-fns ^4.1.0 already installed and used everywhere. |
| @dnd-kit | No drag-and-drop needed for campaign management. |
| framer-motion | Headless UI Transition handles all animation needs. Bundle cost not justified. |

---

## New Patterns to Establish

### 1. Status Transition Mutations

The campaign status lifecycle (5 states, directional transitions) is new to the codebase. Establish a pattern:

```typescript
// Pattern: status-aware mutation with guard
export function useTransitionCampaign(guildId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: CampaignStatus }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }) }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to update campaign status')
      }
      return res.json()
    },
    onSuccess: (_data, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'campaign', campaignId] })
    },
  })
}
```

**Blocker:** Backend `updateCampaignSchema` does not include `status`. Needs backend change or dedicated endpoint.

### 2. Offset Pagination Hook

Campaign payouts use offset pagination (page/pageSize) unlike the cursor-based pattern used elsewhere. The `useExportHistory` hook already handles this:

```typescript
// Existing pattern in use-exports.ts — reuse for campaign payouts
useQuery<PayoutsResponse>({
  queryKey: ['guild', guildId, 'campaign', campaignId, 'payouts', page, pageSize],
  queryFn: async () => {
    const response = await fetchWithRetry(
      `/api/guilds/${guildId}/campaigns/${campaignId}/payouts?page=${page}&pageSize=${pageSize}`
    )
    if (!response.ok) throw new Error('Failed to fetch payouts')
    return response.json()
  },
  staleTime: 2 * 60 * 1000,
  enabled: !!guildId && !!campaignId,
})
```

### 3. Currency Input Component

Campaign forms require cents-based currency inputs (budgetCents, perUserCapCents, platform rates). The `centsToDisplay` helper exists in `use-bonus.ts` for display. For input, establish a dollars-to-cents conversion pattern:

```typescript
// Pattern: user enters dollars, store cents
const [budgetDollars, setBudgetDollars] = useState('')
const budgetCents = Math.round(parseFloat(budgetDollars || '0') * 100)
```

No library needed -- this is a simple controlled input with formatting.

---

## Dashboard Proxy Routes to Create

12 new Next.js API proxy routes mapping to backend endpoints:

| Dashboard Route | Backend Endpoint | Method |
|----------------|------------------|--------|
| `/api/guilds/[guildId]/campaigns` | `GET /guilds/:guildId/campaigns` | GET |
| `/api/guilds/[guildId]/campaigns` | `POST /guilds/:guildId/campaigns` | POST |
| `/api/guilds/[guildId]/campaigns/[campaignId]` | `GET /guilds/:guildId/campaigns/:campaignId` | GET |
| `/api/guilds/[guildId]/campaigns/[campaignId]` | `PATCH /guilds/:guildId/campaigns/:campaignId` | PATCH |
| `/api/guilds/[guildId]/campaigns/[campaignId]` | `DELETE /guilds/:guildId/campaigns/:campaignId` | DELETE |
| `/api/guilds/[guildId]/campaigns/[campaignId]/analytics` | `GET /guilds/:guildId/campaigns/:campaignId/analytics` | GET |
| `/api/guilds/[guildId]/campaigns/[campaignId]/payouts` | `GET /guilds/:guildId/campaigns/:campaignId/payouts` | GET |
| `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history` | `GET /guilds/:guildId/campaigns/:campaignId/payouts/history` | GET |
| `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid` | `POST /guilds/:guildId/campaigns/:campaignId/payouts/mark-paid` | POST |
| `/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk` | `POST /guilds/:guildId/campaigns/:campaignId/payouts/bulk` | POST |
| `/api/guilds/[guildId]/campaigns/[campaignId]/export` | `POST /guilds/:guildId/campaigns/:campaignId/export` | POST |
| `/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]` | `GET /guilds/:guildId/campaigns/:campaignId/export/:exportId` | GET |

---

## New Files to Create

### Types
- `src/types/campaign.ts` -- Campaign, CampaignStatus, CampaignParticipant, CampaignPayout, CampaignExport types derived from backend response shapes

### Hooks
- `src/hooks/use-campaigns.ts` -- Query key factory, list/detail/analytics queries, CRUD mutations, status transitions, payout queries/mutations, export trigger

### Pages
- `src/app/(dashboard)/guilds/[guildId]/campaigns/page.tsx` -- Campaign list with status filter tabs
- `src/app/(dashboard)/guilds/[guildId]/campaigns/[campaignId]/page.tsx` -- Campaign detail with tabbed sub-views (Overview, Analytics, Payouts, Export)

### Components
- `src/components/campaigns/campaign-card.tsx` -- List item card with status badge, budget bar, participant count
- `src/components/campaigns/campaign-status-badge.tsx` -- Color-coded status badge (Draft=gray, Active=green, Paused=yellow, SubmissionsClosed=orange, Completed=blue)
- `src/components/campaigns/campaign-form.tsx` -- Create/edit form with Zod validation (shared between create modal and edit view)
- `src/components/campaigns/campaign-analytics.tsx` -- Participant earnings table + BarChart
- `src/components/campaigns/campaign-payouts.tsx` -- Payout management table with mark-paid actions
- `src/components/campaigns/payout-history.tsx` -- Payout audit trail timeline
- `src/components/campaigns/campaign-export.tsx` -- Export trigger with format/scope selection + SSE progress

### Proxy Routes (9 route files)
- `src/app/api/guilds/[guildId]/campaigns/route.ts` -- GET list, POST create
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/route.ts` -- GET detail, PATCH update, DELETE
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/analytics/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/route.ts`
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]/route.ts`

---

## Installation

```bash
# No new packages needed
# All campaign features are built with existing dependencies
```

---

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| No new dependencies | HIGH | Verified every feature against existing deps -- all capabilities present |
| Recharts for analytics charts | HIGH | Already used in analytics page, BarChart pattern exists |
| Controlled forms (no react-hook-form) | HIGH | Consistent with all existing forms in codebase |
| Accumulated state pagination | HIGH | Established pattern in use-bonus.ts, proven across v1.1-v1.2 |
| Offset pagination for payouts | HIGH | Backend returns page/pageSize, useExportHistory already handles this |
| Zod for client validation | HIGH | Already in deps at ^4.3.6, backend uses zod for same schemas |
| SSE for export progress | HIGH | Backend uses DataExport table, existing SSE progress infrastructure confirmed |

---

## Open Questions

1. **Campaign status transitions (BLOCKER):** Backend `updateCampaignSchema` does NOT include `status` as a valid field. The frontend cannot trigger status changes (Draft -> Active, etc.) without either: (a) adding `status` to the PATCH schema with transition validation, or (b) creating a dedicated `POST /:campaignId/transition` endpoint. Must be resolved before building status lifecycle UI.

2. **Navigation integration:** Where do campaigns appear in the guild sidebar? Recommended: new nav item between existing sections, with campaign count badge.

3. **Campaign SSE progress:** The existing SSE progress endpoint at `/api/guilds/:guildId/exports/:exportId/progress` should work for campaign exports since they share the `DataExport` table. Needs verification during implementation.

4. **Payout confirmation UX:** Should mark-paid require a confirmation dialog (like delete operations) or use optimistic update with undo toast (like bonus payments)? Recommend confirmation dialog since payments are financial and harder to reverse.

---

## Sources

- Backend route files: `guildCampaigns.ts`, `guildCampaignPayouts.ts`, `guildCampaignExport.ts` (direct codebase read)
- Prisma schema: `Campaign`, `CampaignPost`, `CampaignParticipant`, `CampaignPayment` models (direct read)
- Dashboard hooks: `use-bonus.ts`, `use-exports.ts` patterns (direct read)
- Dashboard types: `bonus.ts`, `export.ts` type shapes (direct read)
- Package.json: Current dependency versions (direct read)
- Established codebase patterns across 27,231 LOC (direct read)

---

*Stack research for: v1.3 Campaign System & Tech Debt*
*Researched: 2026-03-06*
