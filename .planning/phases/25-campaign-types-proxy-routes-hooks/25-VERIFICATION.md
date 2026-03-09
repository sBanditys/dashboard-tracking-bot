---
phase: 25-campaign-types-proxy-routes-hooks
verified: 2026-03-09T18:00:00Z
status: passed
score: 10/10 must-haves verified
---

# Phase 25: Campaign Types, Proxy Routes & Hooks Verification Report

**Phase Goal:** Complete data layer so campaign UI phases can consume ready-made hooks without touching API plumbing
**Verified:** 2026-03-09T18:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All campaign backend response shapes have matching TypeScript types | VERIFIED | `src/types/campaign.ts` (212 lines) exports 16 interfaces/types covering list, detail, analytics, payouts, payout history, export trigger, export status, mark-paid, bulk mark-paid |
| 2 | All 12 campaign endpoints are reachable through proxy routes | VERIFIED | 9 route files exist under `src/app/api/guilds/[guildId]/campaigns/` exporting GET/POST/PATCH/DELETE handlers totaling 12 HTTP methods |
| 3 | Proxy routes sanitize errors (no Prisma stack traces leak) | VERIFIED | All 9 route files import and use `sanitizeError` + `internalError` (21 total usages across files) |
| 4 | Zod schemas exist for create and update campaign request validation | VERIFIED | `createCampaignSchema` and `updateCampaignSchema` exported with proper field validation; `UpdateCampaignInput` includes required `version` field for optimistic locking |
| 5 | Campaign list hook returns paginated data with cursor-based infinite scroll | VERIFIED | `useCampaignsInfinite` uses `useInfiniteQuery` with `getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined` |
| 6 | Campaign detail hook returns campaign + totals for a single campaign | VERIFIED | `useCampaignDetail` returns typed `CampaignDetailResponse` |
| 7 | Payout hooks support offset-based pagination with correct page indexing | VERIFIED | `useCampaignPayouts` defaults page=0 (0-indexed), `usePayoutHistory` defaults page=1 (1-indexed), both use `keepPreviousData` |
| 8 | Mark paid mutation optimistically updates the cache and rolls back on error | VERIFIED | `useMarkPaid` implements full pattern: `onMutate` cancels queries + snapshots + sets optimistic data, `onError` rolls back, `onSettled` invalidates |
| 9 | Update campaign mutation throws ConflictError on 409 with server data | VERIFIED | `useUpdateCampaign` checks `res.status === 409`, throws `new ConflictError('Campaign was modified by someone else', parsed.campaign!)`, and `onError` skips toast for `ConflictError` instances |
| 10 | Query key factory enables narrow invalidation without cross-contaminating bonus/tracking caches | VERIFIED | `campaignKeys` nests all keys under `['guild', guildId, 'campaigns', ...]`; no references to `bonusKeys` or `trackingKeys` in the file |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/campaign.ts` | Campaign types, enums, response types, Zod schemas, ConflictError class | VERIFIED | 212 lines, exports CampaignStatus, Campaign, 10 response interfaces, 2 Zod schemas, 2 inferred types, ConflictError class |
| `src/app/api/guilds/[guildId]/campaigns/route.ts` | Campaign list GET + create POST proxy | VERIFIED | 69 lines, exports GET + POST, forwards query string and JSON body |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/route.ts` | Campaign detail GET + update PATCH + DELETE proxy | VERIFIED | 99 lines, exports GET + PATCH + DELETE, handles 204 No Content on DELETE without calling response.json() |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/analytics/route.ts` | Analytics GET proxy | VERIFIED | 38 lines, exports GET, forwards query string |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/route.ts` | Payouts list GET proxy | VERIFIED | 38 lines, exports GET, forwards query string |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history/route.ts` | Payout history GET proxy | VERIFIED | 38 lines, exports GET, forwards query string |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid/route.ts` | Mark paid POST proxy | VERIFIED | 40 lines, exports POST, forwards JSON body |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk/route.ts` | Bulk mark paid POST proxy | VERIFIED | 40 lines, exports POST, forwards JSON body |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/route.ts` | Trigger export POST proxy | VERIFIED | 40 lines, exports POST, forwards response.status (202) |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]/route.ts` | Export status GET proxy | VERIFIED | 36 lines, exports GET with exportId param |
| `src/hooks/use-campaigns.ts` | campaignKeys factory + 6 read hooks + 6 mutation hooks | VERIFIED | 495 lines, exports campaignKeys + 12 hooks (6 read, 6 mutation) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/guilds/[guildId]/campaigns/route.ts` | `backendFetch` | import from `@/lib/server/backend-fetch` | WIRED | Import on line 1, used in GET and POST handlers with `${API_URL}/api/v1/guilds/${guildId}/campaigns` |
| `src/app/api/guilds/[guildId]/campaigns/[campaignId]/route.ts` | `sanitizeError` | import from `@/lib/server/error-sanitizer` | WIRED | 4 sanitizeError calls across GET, PATCH, DELETE handlers |
| `src/hooks/use-campaigns.ts` | `src/types/campaign.ts` | import types | WIRED | Lines 12-26 import 10 types + ConflictError class |
| `src/hooks/use-campaigns.ts` | `/api/guilds/[guildId]/campaigns` | fetchWithRetry calls | WIRED | 12 fetchWithRetry calls covering all endpoints |
| `src/hooks/use-campaigns.ts` | `campaignKeys` | mutation onSettled invalidation | WIRED | 9 invalidateQueries calls using campaignKeys scopes + audit-log keys |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAMP-01 | 25-01, 25-02 | Paginated campaign list with cursor-based infinite scroll | SATISFIED | Types: `CampaignsResponse` with `nextCursor`; Route: campaigns/route.ts GET; Hook: `useCampaignsInfinite` |
| CAMP-02 | 25-01, 25-02 | Filter campaigns by status | SATISFIED | Type: `CampaignStatus` union; Hook passes optional `status` param to query |
| CAMP-03 | 25-01, 25-02 | View campaign detail with totals | SATISFIED | Type: `CampaignDetailResponse` with totals; Route: [campaignId]/route.ts GET; Hook: `useCampaignDetail` |
| CAMP-04 | 25-01 | Color-coded status badges | SATISFIED (infra) | `CampaignStatus` type provides status values; UI rendering is phase 26 |
| CAMP-05 | 25-01, 25-02 | Create campaign | SATISFIED | Schema: `createCampaignSchema`; Route: campaigns/route.ts POST; Hook: `useCreateCampaign` |
| CAMP-06 | 25-01, 25-02 | Edit campaign with 409 conflict handling | SATISFIED | Schema: `updateCampaignSchema` with version; Route: [campaignId]/route.ts PATCH; Hook: `useUpdateCampaign` with ConflictError |
| CAMP-07 | 25-01, 25-02 | Delete campaign | SATISFIED | Route: [campaignId]/route.ts DELETE with 204 handling; Hook: `useDeleteCampaign` |
| CAMP-08 | 25-01 | Platform rate cards | SATISFIED (infra) | Campaign interface includes instagramRateCents, tiktokRateCents, youtubeRateCents (nullable) |
| CAMP-09 | 25-01 | Budget utilization | SATISFIED (infra) | Campaign interface includes budgetCents; CampaignDetailResponse includes totals.totalEarnedCents |
| ANAL-01 | 25-01, 25-02 | Cursor-paginated participant earnings | SATISFIED | Type: `AnalyticsResponse`; Route: analytics/route.ts GET; Hook: `useCampaignAnalytics` (infinite query) |
| ANAL-02 | 25-01, 25-02 | Search participants by userId | SATISFIED | Analytics route forwards query string; Hook passes userId param |
| PAY-01 | 25-01, 25-02 | Offset-paginated payout status list | SATISFIED | Type: `PayoutsResponse`; Route: payouts/route.ts GET; Hook: `useCampaignPayouts` (0-indexed) |
| PAY-02 | 25-01, 25-02 | Mark single participant as paid | SATISFIED | Route: mark-paid/route.ts POST; Hook: `useMarkPaid` with optimistic update |
| PAY-03 | 25-01, 25-02 | Bulk mark participants as paid | SATISFIED | Route: bulk/route.ts POST; Hook: `useBulkMarkPaid` |
| PAY-04 | 25-01, 25-02 | Payout history audit trail | SATISFIED | Type: `PayoutHistoryResponse`; Route: history/route.ts GET; Hook: `usePayoutHistory` (1-indexed) |
| PAY-05 | 25-02 | Optimistic updates with rollback | SATISFIED | `useMarkPaid` has full onMutate/onError/onSettled pattern with snapshot and rollback |
| EXP-01 | 25-01, 25-02 | Trigger campaign export | SATISFIED | Type: `ExportTriggerResponse`; Route: export/route.ts POST (forwards 202); Hook: `useTriggerExport` |
| EXP-02 | 25-01, 25-02 | Export progress with download link | SATISFIED (infra) | Type: `ExportStatusResponse` with downloadUrl; Route: export/[exportId]/route.ts GET; Hook: `useCampaignExportStatus` with 3s polling |

All 18 requirement IDs from plan frontmatter are accounted for. Requirements are mapped to UI phases (26-29) for full completion; phase 25 provides the infrastructure layer (types, routes, hooks) that satisfies the data plumbing portion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | - |

No TODO/FIXME/PLACEHOLDER markers, no empty implementations, no stub returns found across all 11 files.

### Human Verification Required

### 1. Proxy Routes Error Sanitization

**Test:** Call any campaign proxy route with an invalid guildId (e.g., `GET /api/guilds/invalid-id/campaigns`)
**Expected:** Response contains sanitized error object `{ error: { code, message } }` without Prisma stack traces
**Why human:** Cannot verify actual backend error response format without a running backend

### 2. Hook Data Flow End-to-End

**Test:** Mount `useCampaignsInfinite` in a component with a valid guildId, scroll to trigger next page
**Expected:** Data loads, `fetchNextPage` triggers cursor-based pagination, new data appends
**Why human:** Requires running application with real backend data

### Gaps Summary

No gaps found. All 10 observable truths verified. All 11 artifacts exist, are substantive (no stubs), and are properly wired. All 18 requirement IDs are covered at the infrastructure level. TypeScript compiles without errors. No anti-patterns detected.

---

_Verified: 2026-03-09T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
