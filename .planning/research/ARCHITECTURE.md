# Architecture Research

**Domain:** Next.js 14 App Router + Express.js proxy dashboard — v1.2 Security Audit & Optimization
**Researched:** 2026-02-22
**Confidence:** HIGH (derived from reading actual source code of both codebases, no speculation)

---

## Standard Architecture

### System Overview

This documents the **existing** architecture and how the v1.2 features integrate with it. The diagram shows state after v1.2 changes.

```
Browser
  │
  ├─ fetchWithRetry (MODIFIED v1.2)
  │     ├─ CSRF: reads csrf_token cookie (name aligned from _csrf_token)
  │     ├─ 401: refreshSession() → /api/auth/refresh
  │     ├─ 403 CSRF: GET /api/auth/session probe → retry
  │     ├─ 429: Retry-After backoff + global cooldown
  │     ├─ 503: user-facing retry toast (mutations non-retried)
  │     └─ Error code: body?.code ?? body?.error?.code (dual envelope)
  │
  ├─ useSSE (MODIFIED v1.2)
  │     ├─ Exponential backoff: 2s → 60s, 3 retries
  │     ├─ visibilitychange: retryCount reset on tab restore
  │     └─ SSE exhausted → connectionState: 'error'
  │
  ├─ useInfiniteQuery hooks (MODIFIED v1.2 when backend Phase 39 ships)
  │     ├─ getNextPageParam: lastPage.next_cursor (was page+1)
  │     └─ initialPageParam: null (was 1)
  │
  └─ QueryClient (MODIFIED v1.2)
        └─ gcTime: 30m (was 10m)
  │
  ▼
Next.js App (Vercel)
  ├─ proxy.ts (middleware) — CSP nonce, CSRF cookie (csrf_token), auth redirect
  ├─ /app/api/** (Route Handlers, 36+)
  │     └─ cookies() → auth_token → backendFetch() → sanitizeError() → NextResponse.json()
  ├─ authenticatedFetch() (NEW v1.2)
  │     └─ SSR: cookies() + backendFetch() for Server Component direct calls
  └─ error-sanitizer.ts (MODIFIED v1.2)
        └─ Handles both flat { code } and nested { error: { code, message } }
  │
  ▼
Express.js API (VPS/PM2)
  ├─ dashboardAuth — JWT + guild access + requireGuildAdmin
  ├─ csrf.ts — double-submit cookie + HMAC signed-request bypass (X-Internal-Secret covers dashboard)
  ├─ rateLimit.ts — per-route limits, Retry-After header
  ├─ sseGuard.ts — 429/503 on connection slot exhaustion
  └─ sendError() — { error: { code, message, requestId } } (v2.6 envelope, already deployed)
  │
  ▼
PostgreSQL (Prisma)
  └─ Cursor pagination on bonus/rounds (deployed); accounts/posts pending backend Phase 39
```

### Component Responsibilities

| Component | Responsibility | v1.2 Change |
|-----------|---------------|-------------|
| `proxy.ts` | CSP nonce, CSRF cookie issue, auth redirect, proactive token refresh | Rename `_csrf_token` → `csrf_token` |
| `fetchWithRetry` | CSRF injection, 401/403/429/503 handling, auth retry | Dual error envelope parsing, 503 UX |
| `backendFetch` | Add X-Internal-Secret + Idempotency-Key to server-side backend calls | None unless HMAC required |
| `authenticatedFetch` | NEW: cookies() + backendFetch() for RSC → backend direct calls | Create new file |
| `error-sanitizer` | Sanitize backend errors, extract codes for FRIENDLY_MESSAGES lookup | Handle nested `error.error.code` |
| `useSSE` | SSE lifecycle, backoff reconnect, visibility tab management | Retry count reset, polling condition fix |
| `useInfiniteQuery` hooks | Paginated list fetching | Cursor adapter when backend Phase 39 ships |
| `providers.tsx` | QueryClient global config | gcTime increase, refetchInterval condition |

---

## Recommended Project Structure

Additions and modifications only. No new directories are needed.

```
src/
├── lib/
│   ├── fetch-with-retry.ts         MODIFIED — dual error envelope, 503 UX
│   └── server/
│       ├── authenticated-fetch.ts  NEW — SSR-safe authenticated backend fetch
│       └── error-sanitizer.ts      MODIFIED — handle nested error envelope
├── types/
│   └── api.ts                      NEW — ApiErrorEnvelope, BackendErrorResponse types
├── hooks/
│   ├── use-sse.ts                  MODIFIED — lifecycle hardening
│   ├── use-guilds.ts               MODIFIED — refetchInterval condition fix
│   └── use-tracking.ts             MODIFIED — cursor pagination adapter
├── app/
│   └── providers.tsx               MODIFIED — gcTime increase
└── proxy.ts                        MODIFIED — CSRF cookie name alignment
```

### Structure Rationale

- **`lib/server/`:** Server-only utilities. Adding `import 'server-only'` to `authenticated-fetch.ts` prevents accidental Client Component import.
- **`types/api.ts`:** Centralizes the error envelope type so TypeScript catches breakage when backend envelope changes again.
- No new route handlers or page files. All v1.2 changes are infrastructure, not product features.

---

## Architectural Patterns

### Pattern 1: Dual Error Envelope Parsing

**What:** During the backend migration to `sendError()` (the `{ error: { code, message, requestId } }` envelope), some routes return the new nested shape and others still return the old flat shape `{ error: string, code?: string }`. The parsing layer must handle both.

**When to use:** In `error-sanitizer.ts` and `fetchWithRetry`, anywhere that reads `body.code` or `body.error`.

**Trade-offs:** Small branching overhead. Cleaner than two separate parsers. Remove the flat-envelope branch once all backend routes are confirmed migrated.

**Example:**
```typescript
function extractErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const b = body as Record<string, unknown>
  // New envelope: { error: { code, message, requestId } }
  if (b.error && typeof b.error === 'object') {
    return (b.error as Record<string, unknown>).code as string | undefined
  }
  // Old flat: { code: string }
  return b.code as string | undefined
}
```

### Pattern 2: Cursor Pagination with `useInfiniteQuery`

**What:** Backend returns `{ items, next_cursor: string | null, has_more: boolean }`. React Query's `useInfiniteQuery` uses `initialPageParam: null` and `getNextPageParam` returning the cursor string.

**When to use:** For accounts and posts when backend Phase 39 ships. The bonus rounds hook already uses this correctly via manual accumulation — standardize to `useInfiniteQuery` for consistency.

**Trade-offs:** Cannot jump to arbitrary pages (no "page 5 of 12"). Correct for infinite scroll / load-more UX. The cursor token is passed as `pageParam` (React Query internal), not in the query key.

**Example:**
```typescript
const query = useInfiniteQuery({
  queryKey: ['guild', guildId, 'accounts', 'infinite', filters],
  queryFn: async ({ pageParam }) => {
    const params = new URLSearchParams({ limit: '50' })
    if (pageParam) params.set('cursor', pageParam as string)
    // ... filters
    const res = await fetchWithRetry(`/api/guilds/${guildId}/accounts?${params}`)
    if (!res.ok) throw new Error('Failed to fetch accounts')
    return res.json() as Promise<CursorPageResponse<Account>>
  },
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
})
```

### Pattern 3: SSR Data Prefetching with `initialData`

**What:** A Server Component fetches data with `authenticatedFetch()` and passes it as `initialData` to `useQuery` in a Client Component. React Query uses the server data for the initial render and refetches in the background based on `staleTime`.

**When to use:** High-traffic pages where first-render latency matters (guild detail, accounts list).

**Trade-offs:** Adds a server-side fetch in the RSC. If the RSC fetch fails, the page falls back to client-side loading state. Avoids double fetch only when `staleTime` is long enough that React Query does not immediately invalidate the server data.

**Example:**
```typescript
// Server Component (page.tsx)
export default async function AccountsPage({ params }) {
  const { guildId } = await params
  const res = await authenticatedFetch(`/api/v1/guilds/${guildId}/accounts?limit=50`)
  const initialData = res.ok ? await res.json() : undefined
  return <AccountsClient initialData={initialData} guildId={guildId} />
}

// Client Component
function AccountsClient({ initialData, guildId }) {
  const query = useInfiniteQuery({
    initialData: initialData
      ? { pages: [initialData], pageParams: [null] }
      : undefined,
    // ...
  })
}
```

---

## Data Flow

### Request Flow: Cursor Paginated Infinite Scroll

```
User scrolls to bottom
    ↓
useInfiniteQuery.fetchNextPage()
    ↓
fetchWithRetry GET /api/guilds/{id}/accounts?cursor={token}&limit=50
    [CSRF token injected from csrf_token cookie]
    ↓
Route Handler: cookies() → auth_token → backendFetch() to Express
    ↓
Express: dashboardAuth → guildAccess → Prisma cursor findMany (take: limit+1)
    ↓
{ accounts: [...], next_cursor: "opaque_id", has_more: true }
    ↓
Route Handler: NextResponse.json(data)
    ↓
React Query: appends page, getNextPageParam returns next_cursor
```

### Request Flow: SSR Page with Cookie Forwarding

```
Browser requests /guilds/123/accounts
    ↓
proxy.ts: CSP nonce, csrf_token cookie, auth redirect check
    ↓
RSC page.tsx renders (server-side)
    ↓
authenticatedFetch('/api/v1/guilds/123/accounts')
    [cookies() reads auth_token from Next.js server-side store]
    ↓
backendFetch() to Express with Authorization: Bearer {token}
    ↓
Express: validates JWT → returns accounts
    ↓
RSC renders HTML with data — no loading spinner
    ↓
Browser: React hydrates, useInfiniteQuery.initialData set, no network request needed
```

### Request Flow: Error Envelope (New Backend Shape)

```
Mutation fails, backend sends:
  { error: { code: "FORBIDDEN", message: "Administrator permission required", requestId: "uuid" } }
    ↓
Route Handler: sanitizeError(403, data, 'update settings')
    ↓
error-sanitizer.extractErrorFields():
  b.error is object → { code: "FORBIDDEN", message: "Administrator permission required" }
    ↓
FRIENDLY_MESSAGES["FORBIDDEN"] = "Access denied" → { error: "Access denied", code: "FORBIDDEN" }
    ↓
fetchWithRetry receives { error: "Access denied", code: "FORBIDDEN" }
    ↓
extractErrorCode(body): b.error is string → b.code = "FORBIDDEN"
    → "FORBIDDEN" !== "unverified_email", "EBADCSRFTOKEN"
    → Normal 403 handling: caller's onError fires
```

### State Management

```
React Query (client cache)
    ↓ (subscribe)
Client Components ←→ useMutation/useQuery → fetchWithRetry → Route Handler → Express
                                                ↑
                                        CSRF cookie injected
                                        401 → refreshSession()
                                        403 → CSRF refresh probe
```

---

## Integration Points

### New vs Modified Components

| Component | Status | Integration Point |
|-----------|--------|-------------------|
| `src/lib/server/authenticated-fetch.ts` | NEW | RSC pages call it to fetch backend data server-side with auth |
| `src/types/api.ts` | NEW | Shared `ApiErrorEnvelope` type used by sanitizer and fetch-with-retry |
| `src/proxy.ts` | MODIFIED | `_csrf_token` → `csrf_token` cookie name; client must update cookie read |
| `src/lib/fetch-with-retry.ts` | MODIFIED | Dual envelope code extraction; cookie name update; 503 toast message |
| `src/lib/server/error-sanitizer.ts` | MODIFIED | Handle nested `{ error: { code, message } }` envelope |
| `src/hooks/use-sse.ts` | MODIFIED | Retry count reset on visibilitychange; polling condition |
| `src/hooks/use-guilds.ts` | MODIFIED | `refetchInterval` only when `connectionState === 'error'` |
| `src/hooks/use-tracking.ts` | MODIFIED | Cursor pagination adapter (conditional on backend Phase 39) |
| `src/types/tracking.ts` | MODIFIED | Replace `Pagination` with cursor types in affected responses |
| `src/app/providers.tsx` | MODIFIED | `gcTime` increase |

### External Service Boundaries

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Express API (VPS) | Server-to-server HTTPS + JWT (via Route Handlers) | `backendFetch` adds X-Internal-Secret; backend's CSRF check bypassed for proxy calls |
| Express API (VPS) | Server-to-server HTTPS + JWT (via authenticatedFetch, NEW) | RSC pages call backend directly without a Route Handler hop |
| Vercel Edge | Next.js middleware (proxy.ts) | CSRF cookie set here; runs at edge before any Route Handler |

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| proxy.ts ↔ Route Handlers | Next.js request headers (cookie injection) | Refreshed auth_token injected into cookie header on proactive refresh |
| Route Handlers ↔ Express | HTTPS + Bearer JWT | server-side only; client never sees API_URL |
| authenticatedFetch ↔ Express | HTTPS + Bearer JWT | Must be `server-only`; do not import in Client Components |
| React Query hooks ↔ Route Handlers | Browser fetch via fetchWithRetry | CSRF header auto-injected; all mutations go through fetchWithRetry |
| useSSE ↔ SSE Route Handler | Browser EventSource | Route Handler proxies Express SSE body stream |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (dashboard v1.1) | 36+ Route Handler proxies, React Query client cache, single SSE path |
| v1.2 | SSR prefetch reduces client-side fetches; cursor pagination supports larger datasets; SSE lifecycle hardening reduces reconnect storms |
| Future scaling pressure | SSE connection limits on Vercel functions; consider per-guild SSE pooling at backend |

### Scaling Priorities

1. **First bottleneck:** Vercel function invocations from polling — partially addressed by SSR prefetch (fewer client fetches) and SSE reliability (fewer reconnects).
2. **Second bottleneck:** Cursor pagination prevents offset-based full-table scans as dataset grows beyond 10k rows.

---

## Anti-Patterns

### Anti-Pattern 1: Reading Error Codes Without Envelope Awareness

**What people do:** `const error = await response.json(); throw new Error(error.message)` or `body?.code === 'unverified_email'` without checking nested shape.

**Why it's wrong:** When the backend sends `{ error: { code, message } }`, `body.message` is `undefined` and `body.code` is `undefined`. The error code check silently fails, breaking the unverified_email redirect and CSRF retry logic.

**Do this instead:** Use the shared `extractErrorCode()` helper that handles both envelope shapes. In `fetchWithRetry` and `error-sanitizer`, always go through the extraction layer.

### Anti-Pattern 2: SSE Reconnect Without Retry Count Reset

**What people do:** Call `connect()` directly in `visibilitychange` handler without resetting `retryCountRef`.

**Why it's wrong:** If retries were exhausted while the tab was hidden, `retryCountRef.current === maxRetries`. When the tab becomes visible, `connect()` enters the backoff path and immediately sets `connectionState: 'error'` without making a real attempt. The SSE connection is permanently dead until a full page reload.

**Do this instead:**
```typescript
// In handleVisibilityChange — tab becomes visible
retryCountRef.current = 0  // Always reset before external reconnect trigger
connect()
```

### Anti-Pattern 3: Polling When SSE Is Merely Connecting

**What people do:** `refetchInterval: isSSEConnected ? false : 60 * 1000` — where `isSSEConnected = connectionState === 'connected'`.

**Why it's wrong:** During the `connecting` and `disconnected` states (transient — SSE is actively trying to reconnect), polling fires and races with the incoming SSE push. The poll result can overwrite a fresher SSE update.

**Do this instead:**
```typescript
// Only poll when SSE has fully given up
refetchInterval: connectionState === 'error' ? 60 * 1000 : false
```

### Anti-Pattern 4: `authenticatedFetch` in Client Components

**What people do:** Import `authenticated-fetch.ts` in a Client Component or a shared utility imported by one.

**Why it's wrong:** `authenticatedFetch` calls `cookies()` from `next/headers`, which is server-only. Importing it client-side throws a runtime error in the browser.

**Do this instead:** Add `import 'server-only'` at the top of `authenticated-fetch.ts`. Keep client-side data fetching in React Query hooks that call Route Handler URLs via `fetchWithRetry`. The boundary is the Route Handler — server data flows down as props or `initialData`, never as shared functions.

### Anti-Pattern 5: Mixing Offset and Cursor Pagination Cache Keys

**What people do:** Leave `queryKey: ['guild', guildId, 'accounts', 'infinite', page, filters]` when `page` is no longer meaningful after cursor migration.

**Why it's wrong:** Stale offset-keyed entries accumulate in the cache. While `invalidateQueries` on `['guild', guildId, 'accounts']` correctly invalidates all of them, the stale entries with numeric page numbers persist in `gcTime` window and can cause confusing debug states.

**Do this instead:** After cursor migration, remove the numeric page param from the query key: `['guild', guildId, 'accounts', 'infinite', filters]`. The cursor is passed as `pageParam` (React Query internal state), not in the key.

---

## Build Order

Dependencies determine sequence. Items can start only after their dependency completes.

### Step 1: Error Envelope Foundation (no dependencies — do first)

**Files:**
- `src/lib/server/error-sanitizer.ts` — dual envelope extraction
- `src/lib/fetch-with-retry.ts` — dual envelope for code-based logic (`unverified_email`, `EBADCSRFTOKEN`)
- `src/types/api.ts` (NEW) — `ApiErrorEnvelope`, `BackendErrorResponse` types

**Rationale:** Every other change surfaces errors through these layers. Fix the parser first so subsequent changes produce readable diagnostics rather than `undefined` error codes.

**Risk:** Low. Changes are additive (new extraction function, existing behavior unchanged for flat envelopes).

---

### Step 2: CSRF Cookie Name Alignment (depends on Step 1 — can combine)

**Files:**
- `src/proxy.ts` — `setCsrfCookie(response, ...)` sets `csrf_token` (remove underscore prefix)
- `src/lib/fetch-with-retry.ts` — `getCsrfToken()` reads `csrf_token` (remove underscore prefix)

**Rationale:** The backend uses `csrf_token`; the dashboard uses `_csrf_token`. This mismatch is harmless for the current proxy architecture (backend CSRF check is bypassed by X-Internal-Secret), but aligning now prevents confusion when tracing CSRF failures and removes the mismatch before any future direct-browser-to-backend path is introduced.

**Risk:** Low. After deploy, existing browser sessions have `_csrf_token`. The next page load generates `csrf_token`. The first mutation after deploy may fail CSRF (both cookie names exist, but middleware validates `csrf_token` header against `csrf_token` cookie — if old `_csrf_token` is in header, it fails). This is a one-request gap, self-healing on next middleware response.

**Mitigation:** Deploy during low-traffic window. Accept the one-request CSRF failure gap, which triggers the existing CSRF retry path in `fetchWithRetry`.

---

### Step 3: SSE Lifecycle Hardening (depends on Steps 1-2)

**Files:**
- `src/hooks/use-sse.ts` — visibility reconnect retry reset, `beforeunload` guard
- `src/hooks/use-guilds.ts` — `refetchInterval: connectionState === 'error' ? 60000 : false`

**Rationale:** Error envelope alignment (Step 1) ensures 503/429 error messages from SSE endpoint read correctly. SSE changes are self-contained but benefit from clean error surfaces.

**Risk:** Low. Behavioral improvement, not functional change. Regression: reduced reconnect storms against backend.

---

### Step 4: React Query Cache Optimization (depends on Step 3)

**Files:**
- `src/app/providers.tsx` — `gcTime: 30 * 60 * 1000` (was 10 minutes)

**Rationale:** Stable SSE lifecycle (Step 3) reduces background refetch pressure. Higher `gcTime` only helps if connections are reliable enough that users stay on pages for 10+ minutes.

**Risk:** Low. Higher `gcTime` increases memory per tab. Acceptable for single-tab dashboard usage pattern.

---

### Step 5: SSR Cookie Forwarding (depends on Steps 1-2, independent of 3-4)

**Files:**
- `src/lib/server/authenticated-fetch.ts` (NEW)
- Select RSC pages — guild detail, accounts list (use `initialData` pattern)

**Rationale:** Most complex change (RSC + React Query hydration + `server-only` boundary). Do after simpler changes are stabilized. SSR prefetch depends on correct error handling (Step 1) and clean cookies (Step 2).

**Risk:** Medium. Must verify that `useInfiniteQuery.initialData` format matches what `useInfiniteQuery` expects for cursor queries. Test: RSC fetch fails → page falls back to client-side loading state (no flash of broken content).

---

### Step 6: Cursor Pagination Migration (depends on backend Phase 39)

**Files:**
- `src/hooks/use-tracking.ts` — `getNextPageParam`, `initialPageParam`
- `src/types/tracking.ts` — replace `Pagination` with `{ next_cursor: string | null, has_more: boolean }`

**Rationale:** Cannot implement until backend migrates accounts/posts endpoints to cursor pagination. When backend Phase 39 deploys, this is a same-day dashboard change. Bonus rounds (`use-bonus.ts`) already handles cursor correctly.

**Risk:** Low on its own. High coordination risk if timing is misaligned with backend deploy — mismatched pagination format causes broken infinite scroll.

**Mitigation:** Deploy dashboard cursor change in the same release window as backend Phase 39. Feature-flag if needed.

---

### Step 7: CSRF HMAC Signing (conditional — wait for backend audit)

**Files:**
- `src/lib/server/backend-fetch.ts` — add HMAC headers if X-Internal-Secret bypass is removed

**Rationale:** The backend's HMAC signed-request bypass exists for bot/worker services. The dashboard proxy uses `X-Internal-Secret` to bypass backend CSRF. If the backend security audit recommends removing `X-Internal-Secret` in favor of HMAC signing for all internal callers, the dashboard Route Handlers must sign their backend requests.

**Risk:** Low probability this is needed. Lowest priority. Wait for audit conclusions before implementing.

---

## Sources

All findings are HIGH confidence — derived from reading actual source code of both codebases:

- `src/proxy.ts` — CSRF cookie name `_csrf_token`, middleware behavior
- `src/lib/fetch-with-retry.ts` — 429/503 handling, CSRF injection, code-based logic
- `src/lib/server/backend-fetch.ts` — X-Internal-Secret, Idempotency-Key
- `src/lib/server/error-sanitizer.ts` — current flat-envelope parsing
- `src/hooks/use-sse.ts` — SSE lifecycle, reconnect logic, visibility handling
- `src/hooks/use-tracking.ts` — offset pagination in `useInfiniteQuery`
- `src/hooks/use-bonus.ts` — cursor pagination via manual accumulation (confirmed working pattern)
- `src/hooks/use-guilds.ts` — `refetchInterval: isSSEConnected ? false : 60000` pattern
- `src/app/providers.tsx` — `gcTime: 10 * 60 * 1000` current config
- `/Tracking Data Bot/api/src/middleware/csrf.ts` — backend CSRF + HMAC signed-request bypass logic
- `/Tracking Data Bot/shared/src/lib/apiResponse.ts` — confirmed `sendError()` shape: `{ error: { code, message, requestId } }` (ApiErrorBody)
- `/Tracking Data Bot/api/src/routes/dashboard/bonus/bonusRoutes.ts` — confirmed cursor pagination response: `{ rounds, next_cursor, has_more }`
- `/Tracking Data Bot/api/src/middleware/dashboardAuth.ts` — confirmed `sendError()` usage + 503 SERVICE_UNAVAILABLE path

---

*Architecture research for: Next.js 14 App Router + Express.js proxy dashboard — v1.2 Security Audit & Optimization*
*Researched: 2026-02-22*
