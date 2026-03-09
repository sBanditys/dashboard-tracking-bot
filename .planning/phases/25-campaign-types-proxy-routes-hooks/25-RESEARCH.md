# Phase 25: Campaign Types, Proxy Routes & Hooks - Research

**Researched:** 2026-03-09
**Domain:** Next.js proxy routes, TypeScript types, React Query hooks for campaign management API
**Confidence:** HIGH

## Summary

Phase 25 builds the complete data layer for campaign UI phases (26-29): TypeScript types for all campaign response shapes, 10 proxy route files covering 12 endpoints, and a single hooks file with 6 read hooks + 6 mutation hooks plus a hierarchical query key factory. No UI components are delivered -- this is pure infrastructure.

The research is HIGH confidence because every pattern already exists in the codebase. Campaign proxy routes follow the exact `backendFetch` + `sanitizeError` + `internalError` pattern used by 20+ existing routes. Campaign hooks follow `use-bonus.ts` (query key factory, mutations with optimistic updates) and `use-tracking.ts` (`useInfiniteQuery` for cursor pagination). Campaign types follow `bonus.ts` and `tracking.ts` conventions (snake_case wire format, response wrappers).

**Primary recommendation:** Build in dependency order -- types first (everything depends on them), then proxy routes (hooks depend on them), then hooks. Use the backend route files as the single source of truth for response shapes, and match field naming exactly (the backend uses camelCase for `nextCursor`, `budgetCents`, etc. -- NOT snake_case like the bonus system).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single `src/hooks/use-campaigns.ts` with all hooks + `campaignKeys` factory (matches use-bonus.ts pattern)
- Hierarchical query key factory: `['guild', guildId, 'campaigns', ...]` prefix, `campaignKeys.all(guildId)` for broad invalidation
- Cursor-based hooks (campaign list, analytics): `useInfiniteQuery` with `getNextPageParam`
- Offset-based hooks (payouts, payout history): `useQuery` with page number as param
- All 12 hooks built in Phase 25 (6 read + 6 mutation)
- `useMarkPaid`: Optimistic updates with snapshot/rollback (follows `useUpdatePayment` pattern)
- `useBulkMarkPaid`: Invalidates payouts cache on success (no optimistic updates)
- `useUpdateCampaign`: Throws typed `ConflictError` on 409 with server data
- `useDeleteCampaign`: No client-side status guard -- backend enforces Draft/Completed only, hook throws on 409
- `useCreateCampaign`: Invalidates campaign list on success
- `useTriggerExport`: Returns exportId, no polling
- Two separate export hooks: `useTriggerExport` (POST mutation) + `useCampaignExportStatus` (GET query with polling)
- Status hook uses `refetchInterval` gated on `enabled: !!exportId`
- Hooks accept userId as optional parameter -- component handles debouncing
- Single `src/types/campaign.ts` with all campaign types
- Field naming: snake_case matching backend JSON wire format (no camelCase transform layer)
- Dashboard-relevant fields only -- skip bot-only fields
- Request types: Zod schemas (`createCampaignSchema`, `updateCampaignSchema`) with `z.infer<>` for runtime validation
- 10 route files for 12 endpoints (multi-method files)
- Nested under `src/app/api/guilds/[guildId]/campaigns/`
- Standard pattern: `backendFetch` + `sanitizeError` + `internalError`

### Claude's Discretion
- Exact field list for Campaign vs CampaignDetail types (detail may include more fields than list item)
- Zod schema constraint values (min/max) -- derive from backend schemas
- Whether to add `placeholderData: keepPreviousData` for offset-paginated hooks
- Toast messages in mutation onSuccess/onError handlers
- ConflictError class location (in campaign.ts types or in use-campaigns.ts)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAMP-01 | Paginated campaign list with cursor-based infinite scroll | `useCampaignsInfinite` hook + list proxy route + `CampaignsResponse` type |
| CAMP-02 | Filter campaigns by status | Status enum in types + status query param forwarded by proxy route |
| CAMP-03 | Campaign detail with summary counters | `useCampaignDetail` hook + detail proxy route + `CampaignDetailResponse` type |
| CAMP-04 | Color-coded status badges | `CampaignStatus` enum type (UI rendering in Phase 26) |
| CAMP-05 | Admin can create campaign | `useCreateCampaign` hook + POST proxy route + `createCampaignSchema` Zod schema |
| CAMP-06 | Admin can edit campaign with 409 conflict handling | `useUpdateCampaign` hook + PATCH proxy route + `updateCampaignSchema` + `ConflictError` class |
| CAMP-07 | Admin can delete campaign (Draft/Completed only) | `useDeleteCampaign` hook + DELETE proxy route |
| CAMP-08 | Platform rate cards with icons | Platform rate fields in `Campaign` type (UI rendering in Phase 26) |
| CAMP-09 | Budget utilization progress bar | `budgetCents` + `totalEarnedCents` fields in types (UI rendering in Phase 26) |
| ANAL-01 | Cursor-paginated participant earnings table | `useCampaignAnalytics` hook + analytics proxy route + `AnalyticsResponse` type |
| ANAL-02 | Search participants by userId | userId param support in analytics/payouts hooks |
| PAY-01 | Offset-paginated payout status list | `useCampaignPayouts` hook + payouts proxy route + `PayoutsResponse` type |
| PAY-02 | Mark single participant as paid | `useMarkPaid` hook + mark-paid proxy route |
| PAY-03 | Bulk mark participants as paid (max 50) | `useBulkMarkPaid` hook + bulk proxy route |
| PAY-04 | Offset-paginated payout history | `usePayoutHistory` hook + history proxy route + `PayoutHistoryResponse` type |
| PAY-05 | Optimistic updates with rollback on payout mutations | Optimistic update pattern in `useMarkPaid` following `useUpdatePayment` from use-bonus.ts |
| EXP-01 | Trigger campaign export (CSV/XLSX) | `useTriggerExport` hook + export POST proxy route |
| EXP-02 | Export progress via SSE with download link | `useCampaignExportStatus` hook + export status GET proxy route (SSE handled at UI layer in Phase 29) |

</phase_requirements>

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.20 | Server state, caching, mutations, infinite scroll | All hooks use useQuery/useInfiniteQuery/useMutation |
| zod | ^4.3.6 | Runtime validation for request types | createCampaignSchema, updateCampaignSchema |
| sonner | ^2.0.7 | Toast notifications in mutation handlers | All mutation onSuccess/onError use toast() |
| next | ^16 | App Router API routes for proxy | All 10 route files use NextRequest/NextResponse |

### Supporting (Already Used)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting for timestamps | createdAt, paidAt display formatting (Phase 26+) |

### Installation

```bash
# No new packages needed
# All campaign features built with existing dependencies
```

## Architecture Patterns

### Recommended File Structure

```
src/
  types/
    campaign.ts          # All campaign types, enums, Zod schemas, ConflictError class
  hooks/
    use-campaigns.ts     # campaignKeys factory + 6 read hooks + 6 mutation hooks
  app/api/guilds/[guildId]/campaigns/
    route.ts                              # GET list + POST create
    [campaignId]/
      route.ts                            # GET detail + PATCH update + DELETE
      analytics/route.ts                  # GET analytics
      payouts/
        route.ts                          # GET payout list
        history/route.ts                  # GET payout history
        mark-paid/route.ts               # POST mark single paid
        bulk/route.ts                     # POST bulk mark paid
      export/
        route.ts                          # POST trigger export
        [exportId]/route.ts              # GET export status
```

### Pattern 1: Proxy Route (Multi-Method)

**What:** Next.js API route that forwards requests to backend, sanitizes errors.
**When to use:** Every campaign endpoint needs a proxy route.

```typescript
// Source: src/app/api/guilds/[guildId]/accounts/route.ts (existing pattern)
import { backendFetch } from '@/lib/server/backend-fetch'
import { sanitizeError, internalError } from '@/lib/server/error-sanitizer'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const queryString = url.search
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/campaigns${queryString}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'load campaigns'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load campaigns'), { status: 500 })
  }
}
```

### Pattern 2: Query Key Factory (Hierarchical)

**What:** Centralized key factory preventing cache key mismatch and enabling narrow invalidation.
**When to use:** Every campaign query and mutation references campaignKeys.

```typescript
// Source: derived from bonusKeys in src/hooks/use-bonus.ts
export const campaignKeys = {
  // Broad invalidation: wipes all campaign data for a guild
  all: (guildId: string) =>
    ['guild', guildId, 'campaigns'] as const,

  // Campaign list (with optional status filter)
  list: (guildId: string, status?: string) =>
    ['guild', guildId, 'campaigns', 'list', status ?? 'all'] as const,

  // Single campaign detail
  detail: (guildId: string, campaignId: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId] as const,

  // Campaign analytics (cursor-paginated)
  analytics: (guildId: string, campaignId: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'analytics'] as const,

  // Campaign payouts (offset-paginated)
  payouts: (guildId: string, campaignId: string, page: number, userId?: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'payouts', page, userId] as const,

  // Payout history (offset-paginated)
  payoutHistory: (guildId: string, campaignId: string, page: number, userId?: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'history', page, userId] as const,

  // Export status
  exportStatus: (guildId: string, campaignId: string, exportId: string) =>
    ['guild', guildId, 'campaigns', 'detail', campaignId, 'export', exportId] as const,
}
```

**Key design:** Detail, analytics, payouts, and history all nest under `['guild', guildId, 'campaigns', 'detail', campaignId, ...]` so invalidating `campaignKeys.detail(guildId, campaignId)` prefix also invalidates all sub-resources for that campaign.

### Pattern 3: Cursor-Based Infinite Query Hook

**What:** `useInfiniteQuery` for campaign list and analytics.
**When to use:** Campaign list, analytics participant table.

```typescript
// Source: src/hooks/use-tracking.ts useAccountsInfinite pattern
export function useCampaignsInfinite(guildId: string, status?: CampaignStatus) {
  return useInfiniteQuery({
    queryKey: campaignKeys.list(guildId, status),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (pageParam) params.set('cursor', pageParam)
      if (status) params.set('status', status)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns?${params}`
      )
      if (!res.ok) throw new Error('Failed to load campaigns')
      return res.json() as Promise<CampaignsResponse>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId,
    retry: 2,
  })
}
```

### Pattern 4: Offset-Based Query Hook

**What:** Standard `useQuery` with page number as query key segment.
**When to use:** Payouts, payout history.

```typescript
// Source: derived from existing offset pagination patterns
export function useCampaignPayouts(
  guildId: string,
  campaignId: string,
  page: number = 0,
  pageSize: number = 20,
  userId?: string
) {
  return useQuery({
    queryKey: campaignKeys.payouts(guildId, campaignId, page, userId),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (userId) params.set('userId', userId)
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts?${params}`
      )
      if (!res.ok) throw new Error('Failed to load payouts')
      return res.json() as Promise<PayoutsResponse>
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId && !!campaignId,
    placeholderData: keepPreviousData, // Prevents flash on page change
  })
}
```

### Pattern 5: Mutation with Optimistic Update (Mark Paid)

**What:** `useMutation` with `onMutate` snapshot, optimistic cache update, `onError` rollback.
**When to use:** `useMarkPaid` for single participant.

```typescript
// Source: src/hooks/use-bonus.ts useUpdatePayment pattern (lines 234-335)
export function useMarkPaid(guildId: string, campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ discordUserId }: { discordUserId: string }) => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/payouts/mark-paid`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discordUserId }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          (data as { error?: string }).error || 'Failed to mark as paid'
        )
      }
      return res.json()
    },
    onMutate: async ({ discordUserId }) => {
      // Cancel in-flight payout queries for this campaign
      await queryClient.cancelQueries({
        queryKey: ['guild', guildId, 'campaigns', 'detail', campaignId, 'payouts'],
      })
      // Snapshot + optimistic update pattern follows useUpdatePayment
    },
    onError: (_err, _vars, context) => {
      // Rollback from snapshot
      toast.error('Failed to mark as paid')
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['guild', guildId, 'campaigns', 'detail', campaignId, 'payouts'],
      })
    },
  })
}
```

### Pattern 6: ConflictError for 409 Handling

**What:** Typed error class that carries server campaign data for conflict resolution.
**When to use:** `useUpdateCampaign` throws on 409, consuming component uses `instanceof ConflictError`.

```typescript
// Recommended location: src/types/campaign.ts (co-located with Campaign type)
export class ConflictError extends Error {
  campaign: Campaign
  constructor(message: string, campaign: Campaign) {
    super(message)
    this.name = 'ConflictError'
    this.campaign = campaign
  }
}
```

### Anti-Patterns to Avoid

- **Broad invalidation after mutations:** Never use `queryClient.invalidateQueries({ queryKey: ['guild', guildId] })` -- this blows away bonus, tracking, analytics caches. Use `campaignKeys.all(guildId)` or narrower.
- **Unified pagination hook for cursor + offset:** Do not abstract -- `useInfiniteQuery` and `useQuery` have fundamentally different return shapes and page param types.
- **camelCase-to-snake_case transform layer:** The CONTEXT.md locks snake_case wire format matching, but the backend campaign endpoints actually return camelCase (`nextCursor`, `budgetCents`, `totalEarnedCents`). The types MUST match what the backend actually sends. Use camelCase in the TypeScript types since that is the wire format for campaigns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error sanitization in routes | Custom error filtering | `sanitizeError()` + `internalError()` from `@/lib/server/error-sanitizer` | Prevents Prisma stack trace leaks; already handles known error codes |
| Auth forwarding in routes | Manual cookie + header injection | `backendFetch()` from `@/lib/server/backend-fetch` | Auto-forwards auth_token, adds idempotency keys for mutations |
| CSRF + retry + rate limiting | Custom fetch wrapper | `fetchWithRetry()` from `@/lib/fetch-with-retry` | Handles CSRF injection, 401 refresh, 429 backoff, 503 retry |
| Currency formatting | `(cents / 100).toFixed(2)` | `centsToDisplay()` from `@/lib/format` | Consistent formatting across bonus and campaign features |
| Infinite scroll state | Manual accumulated state pattern | `useInfiniteQuery` from React Query | Handles page caching, refetching, stale data; newer pattern |

**Key insight:** Every infrastructure piece this phase needs already exists. The work is purely connecting backend endpoints to frontend hooks through proxy routes, with type safety.

## Common Pitfalls

### Pitfall 1: Backend Response Field Naming Mismatch

**What goes wrong:** CONTEXT.md says "snake_case matching backend JSON wire format" but the backend campaign endpoints actually return camelCase fields: `nextCursor`, `budgetCents`, `totalEarnedCents`, `campaignId`, `paymentMethod`, `paidAmountCents`, `discordUserId`, etc. If types use snake_case (`next_cursor`, `budget_cents`), every response will fail to match.
**Why it happens:** The existing `bonus.ts` and `tracking.ts` types use snake_case because those backend endpoints were written with snake_case JSON. Campaign endpoints use camelCase because they return Prisma model fields directly.
**How to avoid:** Derive types from the actual backend response shapes in `guildCampaigns.ts`, `guildCampaignPayouts.ts`, `guildCampaignExport.ts`. Use camelCase for campaign types since that is what the backend sends.
**Warning signs:** `undefined` values when accessing response fields in hooks.

### Pitfall 2: Query Key Collision with Bonus Caches

**What goes wrong:** Campaign mutations using broad invalidation (`['guild', guildId]`) wipe bonus, tracking, and analytics caches.
**How to avoid:** All campaign invalidation uses `campaignKeys.all(guildId)` (which is `['guild', guildId, 'campaigns']`) or narrower. Never use `['guild', guildId]` alone.

### Pitfall 3: DELETE Route Returns 204 No Content

**What goes wrong:** Backend DELETE returns 204 with no body. If the proxy route tries `response.json()`, it throws a parse error. The proxy route must handle 204 specially.
**How to avoid:** Check for 204 status before calling `response.json()`:
```typescript
if (response.status === 204) {
  return new NextResponse(null, { status: 204 })
}
```

### Pitfall 4: Export Route Returns 202 Accepted

**What goes wrong:** Backend export POST returns 202, not 200. If the proxy route only checks `response.ok` (which includes 202), this works. But the hook must propagate the 202 status so consuming components know the export is queued, not complete.
**How to avoid:** Proxy route forwards 202 status: `return NextResponse.json(data, { status: 202 })`.

### Pitfall 5: Payouts Page Param Starts at 0, History Starts at 1

**What goes wrong:** Backend payouts endpoint uses `page: z.coerce.number().int().min(0).default(0)` (0-indexed). Backend history endpoint uses `page: z.coerce.number().int().min(1).default(1)` (1-indexed). If hooks use the same page convention for both, one endpoint returns wrong data.
**How to avoid:** `useCampaignPayouts` uses 0-indexed pages; `usePayoutHistory` uses 1-indexed pages. Document this difference clearly in the types and hook JSDoc.

### Pitfall 6: Race Between markPaid and bulkMarkPaid

**What goes wrong:** User clicks individual "Mark Paid" then immediately clicks "Mark All Paid." Optimistic updates from individual mutation get overwritten by bulk mutation's invalidation.
**How to avoid:** `useMarkPaid` uses full optimistic pattern (cancel queries, snapshot, optimistic set, rollback on error). `useBulkMarkPaid` does NOT use optimistic updates -- just invalidates on success. Both cancel in-flight queries for the same payout key prefix.

## Code Examples

### Proxy Route: GET with Query String Forwarding

```typescript
// Pattern for routes that forward query params (list, analytics, payouts, history)
// Source: src/app/api/guilds/[guildId]/accounts/route.ts
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const queryString = url.search
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/campaigns${queryString}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'load campaigns'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('load campaigns'), { status: 500 })
  }
}
```

### Proxy Route: POST with JSON Body Forwarding

```typescript
// Pattern for mutation routes (create, mark-paid, bulk, export)
// Source: src/app/api/guilds/[guildId]/accounts/route.ts POST handler
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/campaigns`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'create campaign'),
        { status: response.status }
      )
    }
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(internalError('create campaign'), { status: 500 })
  }
}
```

### Proxy Route: DELETE with 204 Handling

```typescript
// Source: DELETE pattern from accounts/[accountId]/route.ts + 204 handling
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { guildId, campaignId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await backendFetch(
      `${BACKEND_API_URL}/api/v1/guilds/${guildId}/campaigns/${campaignId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    // Backend returns 204 No Content on successful delete
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        sanitizeError(response.status, data, 'delete campaign'),
        { status: response.status }
      )
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(internalError('delete campaign'), { status: 500 })
  }
}
```

### Type Definitions: Campaign Entity

```typescript
// Derived from backend guildCampaigns.ts response shapes + Prisma Campaign model
// Only dashboard-relevant fields -- skips bot-only fields per CONTEXT.md

export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'SubmissionsClosed' | 'Completed'

export interface Campaign {
  id: string
  createdAt: string
  updatedAt: string
  name: string
  status: CampaignStatus
  guildId: string
  brandId: string
  budgetCents: number
  perUserCapCents: number
  instagramRateCents: number | null
  tiktokRateCents: number | null
  youtubeRateCents: number | null
  closeThreshold: number
  rules: string | null
  dailySubmissionLimit: number | null
  paymentMethods: string[]
  reviewChannelId: string | null
  alertsChannelId: string | null
  announcementChannelId: string | null
  version: number
  createdBy: string
  _count: {
    posts: number
    participants: number
  }
}

// Detail response includes brand relation and aggregated totals
export interface CampaignDetailResponse {
  campaign: Campaign & {
    brand: { id: string; label: string }
  }
  totals: {
    totalEarnedCents: number
    participantCount: number
  }
}
```

### Export Status Polling Hook

```typescript
// Pattern: refetchInterval gated on enabled flag
export function useCampaignExportStatus(
  guildId: string,
  campaignId: string,
  exportId: string | null
) {
  return useQuery({
    queryKey: campaignKeys.exportStatus(guildId, campaignId, exportId!),
    queryFn: async () => {
      const res = await fetchWithRetry(
        `/api/guilds/${guildId}/campaigns/${campaignId}/export/${exportId}`
      )
      if (!res.ok) throw new Error('Failed to check export status')
      return res.json() as Promise<ExportStatusResponse>
    },
    enabled: !!guildId && !!campaignId && !!exportId,
    refetchInterval: 3000, // Poll every 3 seconds
  })
}
```

## Backend Response Shape Reference

Exact response shapes from backend route files (source of truth for TypeScript types):

### GET /campaigns (list)
```json
{ "campaigns": [Campaign + {_count: {posts, participants}}], "nextCursor": "string|null" }
```
Note: No `has_more` field -- use `nextCursor !== null` to determine if more pages exist.

### GET /campaigns/:id (detail)
```json
{
  "campaign": Campaign + {_count, brand: {id, label}},
  "totals": { "totalEarnedCents": number, "participantCount": number }
}
```

### GET /campaigns/:id/analytics
```json
{ "participants": [CampaignParticipant + {postCount}], "nextCursor": "string|null" }
```

### GET /campaigns/:id/payouts
```json
{
  "participants": [{discordUserId, totalEarnedCents, paymentMethod, paymentHandleEnc: null, isPaid, paidAt, paidAmountCents}],
  "pagination": { "page": number, "pageSize": number, "totalCount": number }
}
```

### GET /campaigns/:id/payouts/history
```json
{
  "entries": [{id, timestamp, actorId, discordUserId, amountCents, paymentMethod}],
  "pagination": { "page": number, "pageSize": number, "totalCount": number }
}
```

### POST /campaigns (create) -- returns 201
```json
{ "campaign": Campaign }
```

### PATCH /campaigns/:id (update)
```json
{ "campaign": Campaign }
```

### DELETE /campaigns/:id -- returns 204 No Content

### POST /campaigns/:id/payouts/mark-paid
```json
{ "success": true, "amountCents": number, "paymentMethod": "string|null" }
```

### POST /campaigns/:id/payouts/bulk
```json
{ "success": true, "paidCount": number, "totalCents": number }
```

### POST /campaigns/:id/export -- returns 202
```json
{ "exportId": "string", "status": "queued" }
```

### GET /campaigns/:id/export/:exportId
```json
{ "exportId": "string", "status": "string", "downloadUrl?": "string", "expiresAt?": "string", "error?": "string" }
```

## Proxy Route Checklist

All 10 route files with their methods and error context strings:

| # | Route File | Methods | Error Context |
|---|-----------|---------|---------------|
| 1 | `campaigns/route.ts` | GET, POST | 'load campaigns', 'create campaign' |
| 2 | `campaigns/[campaignId]/route.ts` | GET, PATCH, DELETE | 'load campaign', 'update campaign', 'delete campaign' |
| 3 | `campaigns/[campaignId]/analytics/route.ts` | GET | 'load campaign analytics' |
| 4 | `campaigns/[campaignId]/payouts/route.ts` | GET | 'load campaign payouts' |
| 5 | `campaigns/[campaignId]/payouts/history/route.ts` | GET | 'load payout history' |
| 6 | `campaigns/[campaignId]/payouts/mark-paid/route.ts` | POST | 'mark payment' |
| 7 | `campaigns/[campaignId]/payouts/bulk/route.ts` | POST | 'process payments' |
| 8 | `campaigns/[campaignId]/export/route.ts` | POST | 'start export' |
| 9 | `campaigns/[campaignId]/export/[exportId]/route.ts` | GET | 'check export status' |

Each route MUST have:
1. `await cookies()` for auth_token extraction
2. 401 return if no token
3. `backendFetch()` call with correct URL + method
4. `sanitizeError()` for non-OK responses
5. `internalError()` in catch block
6. Correct status code forwarding (especially 201, 202, 204)

## Hooks Inventory

| Hook | Type | Pattern | Key Dependencies |
|------|------|---------|-----------------|
| `useCampaignsInfinite` | Read | `useInfiniteQuery` cursor | campaignKeys.list |
| `useCampaignDetail` | Read | `useQuery` | campaignKeys.detail |
| `useCampaignAnalytics` | Read | `useInfiniteQuery` cursor | campaignKeys.analytics |
| `useCampaignPayouts` | Read | `useQuery` offset (page 0-indexed) | campaignKeys.payouts |
| `usePayoutHistory` | Read | `useQuery` offset (page 1-indexed) | campaignKeys.payoutHistory |
| `useCampaignExportStatus` | Read | `useQuery` with refetchInterval | campaignKeys.exportStatus |
| `useCreateCampaign` | Mutation | `useMutation` | Invalidates campaignKeys.all |
| `useUpdateCampaign` | Mutation | `useMutation` + ConflictError on 409 | Invalidates campaignKeys.detail |
| `useDeleteCampaign` | Mutation | `useMutation` | Invalidates campaignKeys.all |
| `useMarkPaid` | Mutation | `useMutation` + optimistic update | Invalidates payouts prefix |
| `useBulkMarkPaid` | Mutation | `useMutation` (no optimistic) | Invalidates payouts prefix |
| `useTriggerExport` | Mutation | `useMutation` | Returns exportId |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Accumulated state pagination (useBonusRounds) | useInfiniteQuery (useAccountsInfinite) | v1.2 cursor migration | Campaign list/analytics use useInfiniteQuery |
| centsToDisplay in use-bonus.ts | centsToDisplay in src/lib/format.ts | Phase 24 | Campaign hooks import from shared location |
| Old error envelope `{ error: "string" }` | New envelope `{ error: { code, message } }` | Phase 24 | sanitizeError handles new envelope format |

## Open Questions

1. **Backend camelCase vs CONTEXT.md snake_case decision**
   - What we know: CONTEXT.md says "snake_case matching backend JSON wire format" but backend campaign endpoints actually return camelCase (Prisma model fields returned directly)
   - What's unclear: Whether to follow the literal CONTEXT.md instruction or match actual wire format
   - Recommendation: Use camelCase since that is what the backend actually sends. The CONTEXT.md instruction was based on the assumption that backend uses snake_case (like bonus endpoints do). Campaign endpoints differ. Using wrong casing would break deserialization. Add a comment in campaign.ts explaining the difference.

2. **Campaign list has no `has_more` field**
   - What we know: Backend list response is `{ campaigns: [...], nextCursor: string|null }` -- no `has_more` boolean unlike bonus/tracking endpoints
   - Recommendation: Use `nextCursor !== null` as the `has_more` equivalent in `getNextPageParam`. This is correct and consistent with how `useInfiniteQuery` works (returning `undefined` from `getNextPageParam` signals no more pages).

3. **Audit log invalidation after campaign mutations**
   - What we know: Backend writes to DashboardAuditLog on campaign mutations. Existing mutations invalidate `['guild', guildId, 'audit-log']`.
   - Recommendation: Add `queryClient.invalidateQueries({ queryKey: ['guild', guildId, 'audit-log'] })` to `onSuccess` of `useCreateCampaign`, `useDeleteCampaign`, `useMarkPaid`, `useBulkMarkPaid`. Skip for `useUpdateCampaign` (update audit logs are less critical to show immediately).

## Sources

### Primary (HIGH confidence)
- Backend route file: `guildCampaigns.ts` -- exact response shapes, Zod schemas, status lifecycle
- Backend route file: `guildCampaignPayouts.ts` -- payout response shapes, mark-paid/bulk logic
- Backend route file: `guildCampaignExport.ts` -- export trigger/status response shapes
- Prisma schema: Campaign model (lines 1417-1517), CampaignParticipant (1576-1601), CampaignPayment (1606-1626), CampaignStatus enum (1405-1412)
- Existing proxy routes: `accounts/route.ts`, `accounts/[accountId]/route.ts`, `bonus/rounds/[roundId]/payments/bulk/route.ts` -- proxy route patterns
- Existing hooks: `use-bonus.ts` (query key factory, optimistic mutations), `use-tracking.ts` (useInfiniteQuery cursor pagination)
- Existing types: `bonus.ts`, `tracking.ts` -- type definition patterns

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` -- stack decisions and backend contract documentation
- `.planning/research/FEATURES.md` -- feature dependency graph and API endpoint mapping
- `.planning/research/PITFALLS.md` -- domain-specific pitfalls (P1-P15)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified in codebase
- Architecture: HIGH -- every pattern directly derived from existing code with file references
- Pitfalls: HIGH -- derived from direct backend code analysis and existing pitfalls research
- Response shapes: HIGH -- copied from actual backend route handler return statements

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies, all internal codebase patterns)
