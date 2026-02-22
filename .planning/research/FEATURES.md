# Feature Research

**Domain:** Next.js 14 Dashboard — Security Audit, Backend Alignment & Performance (v1.2 milestone)
**Researched:** 2026-02-22
**Confidence:** HIGH (researched against live backend code, official docs, verified patterns)

---

## Context: What Is Already Built

v1.0 and v1.1 shipped full product. v1.2 is a hardening and alignment milestone — not a feature addition milestone. Every item in this file is an infrastructure or protocol change to an existing working system.

**Already shipped (do not duplicate effort):**
- CSRF double-submit cookie middleware with `EBADCSRFTOKEN` retry in `fetchWithRetry`
- SSE connection lifecycle with visibility-based close/reconnect in `useSSE`
- Error sanitization with `sanitizeError` and `internalError` helpers across 36+ proxy routes
- Rate limit handling (429 + Retry-After + exponential backoff) in `fetchWithRetry`
- Offset-based pagination with `useInfiniteQuery` for accounts and posts
- Cursor pagination already live on bonus rounds endpoint (`next_cursor`, `has_more`)
- CSP headers, HSTS, X-Request-ID on all routes

**What is changing in v1.2:**
- Backend Phase 37: CSRF moved from simple double-submit to HMAC-signed requests for SSR proxy calls (server-to-server). Dashboard proxy layer must produce correctly signed headers.
- Backend Phase 39: Accounts and posts endpoints migrated to cursor pagination. Dashboard must switch `pageParam` from `page: number` to `cursor: string | null`.
- Backend Phase 35: Error responses changed from `{ error: string, message: string }` to `{ error: { code: string, message: string } }`. Dashboard proxy and hooks must parse new shape.
- QUAL-05/F-14: SSR page routes must forward the `auth_token` cookie as `Authorization: Bearer` when calling backend, rather than passing cookies raw. This closes an authentication gap on server-rendered pages.
- Rate limit resilience: 503 responses from backend are not consistently retried; need uniform treatment matching 502/504.
- SSE: Missing heartbeat detection — connection can silently stall without `onerror` firing.
- React Query: `staleTime` inconsistencies; some queries have `staleTime: 0` which causes waterfall refetches on navigation.
- Security audit report: No structured audit output exists yet.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must work correctly after v1.2. Missing or broken = milestone incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cursor pagination on accounts + posts | Backend no longer accepts `page=N`; offset queries will 400 | MEDIUM | Change `initialPageParam: 1` to `initialPageParam: null`, update `getNextPageParam` to read `next_cursor` not `total_pages`. Must preserve URL state if any. |
| Error envelope migration in all proxy routes | Backend now returns `{ error: { code, message } }` not `{ error: string, message: string }` | MEDIUM | 36+ proxy routes call `sanitizeError()`. Update parser to handle new shape. Also update client-side hooks that read `error.message` directly. |
| SSR cookie forwarding on page routes | Server Components calling backend APIs fail auth when `auth_token` not forwarded as Bearer | MEDIUM | `backendFetch` already has header injection; need to read `auth_token` cookie in route handlers using `cookies()` from `next/headers` and attach as `Authorization: Bearer`. |
| CSRF HMAC alignment (SSR proxy path) | Backend Phase 37 validates HMAC signature for server-to-server requests; unauthenticated mutations from SSR will be rejected | HIGH | SSR proxy must sign requests with `HMAC-SHA256(${timestamp}:${nonce}:${guildId}:${body})` using shared `API_SECRET`. Browser path (client JS) continues to use double-submit cookie. |
| 503 resilience parity with 502/504 | `fetchWithRetry` retries 502, 503, 504 but only on `GET/HEAD/OPTIONS`. `RETRYABLE_SERVER_STATUSES` already includes 503 — verify coverage is complete and that proxy routes don't swallow 503 before client sees it | LOW | Check that proxy routes propagate 503 status rather than converting to 500. |
| Security audit report | Stakeholders and operators need evidence of security posture | MEDIUM | Structured markdown report covering: CSP, CSRF, auth, SQL injection, error leakage, rate limits, SSE, session management |

### Differentiators (Competitive Advantage)

Features that improve reliability and developer confidence beyond the baseline.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| SSE heartbeat timeout detection | Silent SSE stalls (no `onerror`, no data) leak connections; detection closes and reconnects proactively | MEDIUM | Backend must send `event: heartbeat\ndata: ping\n\n` every 30s. Client tracks `lastHeartbeatAt`; if >45s without heartbeat, close and reconnect. |
| React Query `staleTime` normalization | Prevents waterfall refetches when switching guilds; reduces redundant backend requests | LOW | Audit all `useQuery` calls. Set: static lists (brands, channels) to 5min; analytics to 2min; real-time data to 0. Consolidate query key factories. |
| Rate limit UI feedback (global cooldown) | When `globalRateLimitUntil` is set, subsequent requests throw `RateLimitError` before even hitting the network — user sees no feedback | LOW | Show a dismissible banner with countdown when global cooldown is active. Already have `RateLimitError.retryAfterMs`. |
| Bundle size analysis and dynamic imports | Cold starts on Vercel scale with bundle size; heavy chart libraries (Recharts) loaded on every route | MEDIUM | Run `@next/bundle-analyzer`; dynamically import Recharts components and heavy modals using `next/dynamic`. Target: reduce main chunk by 30%. |
| Query key factory consolidation | Scattered string literals for query keys cause cache misses after mutations; invalidation is brittle | LOW | Extract query key factories into a single `queryKeys.ts` file. Already using `['guild', guildId, 'accounts']` pattern — formalize it. |
| Proxy route timeout propagation | When backend takes >10s, Vercel function may timeout and return 504 but proxy returns 500 | LOW | Add `AbortSignal.timeout(9000)` to `backendFetch` calls in all proxy routes. Return 504 with correct error message. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Rotate CSRF secret per request on client | "More secure" — every request has a unique token | Double-submit cookie already prevents CSRF. Per-request rotation would require server round-trip before every mutation, increasing latency 200-400ms. Existing `fetchWithRetry` CSRF retry already handles stale tokens. | Keep single-token cookie with silent refresh on `EBADCSRFTOKEN`. Already implemented. |
| WebSocket upgrade for SSE | "WebSocket is bidirectional and more modern" | SSE is unidirectional from server — exactly what bot status and export progress need. WebSocket adds handshake complexity, requires sticky sessions on load balancer, breaks on Vercel Edge without additional infrastructure. | Keep native `EventSource`. Harden with heartbeat detection instead. |
| Full error response passthrough from backend | "Show users the exact backend error" | Backend errors contain stack traces, Prisma details, and internal table names. `sanitizeError` was built specifically to prevent this. Passthrough would undo v1.1 security hardening. | Update `sanitizeError` to handle new `{ error: { code, message } }` envelope shape. |
| Client-side HMAC signing of mutations | "Align with backend Phase 37 HMAC pattern everywhere" | Phase 37 HMAC is for server-to-server (SSR proxy → backend) where no user session cookie exists. Browser mutations already have double-submit cookie CSRF which is appropriate for cookie-authenticated requests. HMAC in browser JS would expose `API_SECRET` in client bundle. | HMAC only in SSR proxy layer (`backendFetch`). Browser path stays on double-submit cookie. |
| Aggressive staleTime: 0 on all queries | "Always show fresh data" | Causes full refetch waterfall on every guild navigation. React Query's stale-while-revalidate exists for this reason — show cached data instantly, refetch in background. Already causes N background requests per guild switch. | Per-domain staleTime policy (see Differentiators row above). |
| Custom audit log UI in dashboard | "Users should see their own security audit trail" | `DashboardAuditLog` is already surfaced via the audit log tab. A security audit *report* is a generated document for operators, not real-time user UI. | Generate markdown/PDF report during audit phase, store in `.planning/research/`. |

---

## Feature Dependencies

```
CSRF HMAC alignment (SSR proxy)
    └──requires──> shared API_SECRET env var in dashboard
    └──requires──> understanding of backend Phase 37 HMAC payload format
                       └──blocks──> SSR mutations that bypass cookie auth

Cursor pagination migration
    └──requires──> backend Phase 39 deployed (next_cursor field present in responses)
    └──requires──> update to useInfiniteQuery initialPageParam + getNextPageParam
    └──requires──> update proxy routes to pass cursor param not page param
                       └──enables──> stable infinite scroll without page drift

Error envelope migration
    └──requires──> backend Phase 35 deployed ({ error: { code, message } } shape)
    └──requires──> update sanitizeError() parser
    └──requires──> update all hook error path reads
    └──enhances──> rate limit UI feedback (error.code === 'RATE_LIMIT_EXCEEDED')

SSR cookie forwarding
    └──requires──> cookies() from next/headers in route handlers
    └──requires──> backendFetch() receives auth token from caller, not env
    └──enables──> authenticated SSR page rendering without client-side waterfall

SSE heartbeat detection
    └──requires──> backend heartbeat frame support (event: heartbeat every 30s)
    └──enhances──> useSSE hook (add lastHeartbeat ref + interval check)
    └──requires──> useSSE change (independent, can ship without backend if backend already sends heartbeats)

React Query staleTime normalization
    └──independent──> no backend dependency
    └──enhances──> bundle optimization (fewer refetch waterfalls = less JS execution)

Security audit report
    └──requires──> all above features completed (audit the hardened codebase)
    └──requires──> review of both dashboard and backend codebase
    └──produces──> .planning/research/SECURITY_AUDIT.md
```

### Dependency Notes

- **CSRF HMAC requires backend Phase 37:** The backend HMAC payload format (`timestamp:nonce:guildId:body`) is defined in `/middleware/csrf.ts`. Dashboard must reproduce this exactly. Mismatched payload = 403 on all SSR mutations.
- **Cursor pagination requires backend Phase 39:** If backend still returns `total_pages`, the cursor migration is premature. Verify backend deployment before migrating `useInfiniteQuery`.
- **Error envelope migration requires backend Phase 35:** Two envelope shapes cannot coexist in one `sanitizeError` call. Add backward-compatible parsing: check `typeof error === 'string'` vs `typeof error === 'object'` to handle both during transition.
- **SSE heartbeat is partially independent:** If backend already sends heartbeat frames, dashboard can detect them immediately. If backend does not, the detection code is inert and safe to ship.
- **Security audit report depends on all changes landing first:** Auditing a half-migrated codebase produces stale findings.

---

## MVP Definition

This is a hardening milestone, not an MVP. Reframing: what is the minimum set required for v1.2 to ship?

### Must Ship (v1.2 blockers)

- [ ] Cursor pagination migration — backend will 400 on old `page=N` params after Phase 39
- [ ] Error envelope migration — `sanitizeError` will produce wrong output after Phase 35
- [ ] SSR cookie forwarding — authenticated SSR page data will fail to load
- [ ] CSRF HMAC alignment — SSR proxy mutations will be rejected post-Phase 37
- [ ] Security audit report — milestone deliverable, not a code change

### Should Ship (v1.2 improvements)

- [ ] 503 resilience verification — ensures rate-limit handling is complete
- [ ] SSE heartbeat detection — prevents silent connection leaks in production
- [ ] React Query staleTime normalization — reduces unnecessary backend load
- [ ] Rate limit UI feedback — eliminates silent failure when global cooldown is active

### Defer to v1.3

- [ ] Bundle size analysis + dynamic imports — valuable but no user-facing breakage if deferred
- [ ] Query key factory consolidation — refactor, not a bug fix
- [ ] Proxy route timeout propagation — edge case, low frequency

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Cursor pagination migration | HIGH (prevents 400 errors) | MEDIUM | P1 |
| Error envelope migration | HIGH (prevents wrong error messages) | MEDIUM | P1 |
| SSR cookie forwarding | HIGH (SSR pages fail auth without it) | MEDIUM | P1 |
| CSRF HMAC alignment | HIGH (SSR mutations rejected) | HIGH | P1 |
| Security audit report | HIGH (milestone deliverable) | MEDIUM | P1 |
| 503 resilience verification | MEDIUM (existing retry mostly works) | LOW | P2 |
| SSE heartbeat detection | MEDIUM (reduces silent leaks) | MEDIUM | P2 |
| React Query staleTime normalization | MEDIUM (reduces backend load) | LOW | P2 |
| Rate limit UI feedback | LOW (RateLimitError exists, no banner) | LOW | P2 |
| Bundle dynamic imports | LOW (no breakage, just perf) | MEDIUM | P3 |
| Query key factory consolidation | LOW (refactor, no user impact) | LOW | P3 |
| Proxy timeout propagation | LOW (rare edge case) | LOW | P3 |

**Priority key:**
- P1: Must have for v1.2 to ship
- P2: Should have, ship in v1.2 if time allows
- P3: Nice to have, defer to v1.3

---

## Implementation Detail: Each Feature

### Cursor Pagination Migration

**Current state:** `useAccountsInfinite` and `usePostsInfinite` use `initialPageParam: 1` and `getNextPageParam` reads `lastPage.pagination.page >= lastPage.pagination.total_pages`. Proxy routes pass `page=N` and `limit=N` to backend.

**Target state:** Proxy routes pass `cursor=<string>` and `limit=N`. `useInfiniteQuery` uses `initialPageParam: null` and `getNextPageParam` returns `lastPage.next_cursor ?? undefined` (returning `undefined` signals no more pages to TanStack Query v5).

**Change scope:**
1. Update `src/hooks/use-tracking.ts`: change `pageParam` type from `number` to `string | null`, update `buildAccountQuery` and `buildPostQueryExtended` to use `cursor` param
2. Update `src/app/api/guilds/[guildId]/accounts/route.ts` proxy: pass `cursor` not `page`
3. Update `src/app/api/guilds/[guildId]/posts/route.ts` proxy: pass `cursor` not `page`
4. Update response type: `AccountsResponse.pagination` shape changes to `{ next_cursor: string | null, has_more: boolean }`
5. Verify bonus rounds hooks already use cursor pagination (they do — `useInfiniteQuery` in bonus hook)

**Confidence:** HIGH — backend cursor format is confirmed in `/bonus/bonusRoutes.ts`: `{ next_cursor: string | null, has_more: boolean }`. Accounts/posts will follow same shape after Phase 39.

### Error Envelope Migration

**Current state:** Backend returns `{ error: string, message: string }`. `sanitizeError()` reads `parsed.message || parsed.error`. Client hooks read `error.message`.

**Target state:** Backend returns `{ error: { code: string, message: string } }`. Need backward-compatible parser during transition.

**Change scope:**
1. Update `sanitizeError()` in `src/lib/server/error-sanitizer.ts`: detect if `parsed.error` is a string (old shape) or object (new shape), extract `code` and `message` accordingly
2. Update `BackendError` interface to include `error?: string | { code: string; message: string }`
3. Audit all 36+ proxy routes that call `sanitizeError` — no change needed there since `sanitizeError` interface is unchanged
4. Update client hooks that do `await response.json()` and read `.message` directly (non-sanitized paths)
5. Update `FRIENDLY_MESSAGES` map — new `code` values from backend Phase 35 may include new codes

**Confidence:** HIGH — backend error format confirmed in `guildRead.ts`. New envelope shape visible in `bonusRoutes.ts` validation errors which already use `details`.

### SSR Cookie Forwarding

**Current state:** `backendFetch` injects `X-Internal-Secret` but does not forward the user's `auth_token` cookie. SSR route handlers call `backendFetch` without auth. Backend `requireDashboardAuth` middleware expects either `Authorization: Bearer <token>` or dashboard session cookies.

**Target state:** Route handlers read `auth_token` cookie using `cookies()` from `next/headers` and pass it to `backendFetch` as `Authorization: Bearer <token>`.

**Change scope:**
1. Update `backendFetch` signature to accept optional `authToken?: string` parameter
2. In each proxy route handler (36+ routes), import `cookies` from `next/headers`, read `auth_token`, pass to `backendFetch`
3. Alternative (less repetitive): Create a `backendFetchAuthenticated()` wrapper that reads the cookie internally via `cookies()` — this is cleaner but requires that `cookies()` is available in the call context (it is, since route handlers run on server)
4. Middleware already injects refreshed token into request cookies (`cookie` header) — route handlers will see the latest token

**Confidence:** HIGH — `cookies()` from `next/headers` is the documented Next.js App Router pattern for reading cookies in route handlers. Official Next.js auth guide confirms this pattern.

### CSRF HMAC Alignment

**Current state:** Dashboard middleware (`proxy.ts`) does double-submit cookie CSRF for browser requests. SSR proxy (`backendFetch`) has no CSRF mechanism — relying on `X-Internal-Secret` header only.

**Target state:** Backend Phase 37 adds HMAC validation for requests that have `x-signature` + `x-timestamp` headers. SSR proxy should produce these headers so backend can validate via HMAC rather than trusting `X-Internal-Secret` alone.

**HMAC payload format (from backend `/middleware/csrf.ts`):**
```
`${timestamp}:${nonce}:${guildId}:${body}`
HMAC-SHA256 signed with API_SECRET
```

**Change scope:**
1. Create `src/lib/server/hmac-sign.ts`: `signRequest({ timestamp, nonce, guildId, body }): string`
2. Update `backendFetch` to generate `x-timestamp`, `x-nonce`, `x-guild-id`, and `x-signature` headers on mutation requests (POST/PUT/PATCH/DELETE)
3. `API_SECRET` env var must be set in Vercel dashboard — already used by backend, dashboard must consume same value
4. Nonce must match pattern `/^[A-Za-z0-9_-]{16,128}$/` — use `randomBytes(16).toString('base64url').slice(0,24)`
5. Timestamp window is 5 minutes — clocks must be in sync (Vercel and backend server should be NTP-synchronized)
6. Browser path (client JS calling `/api/*` routes) is unchanged — continues to use double-submit cookie

**Confidence:** MEDIUM — payload format confirmed in backend code. Risk is clock skew between Vercel edge and backend VPS. Add 30-second buffer to timestamp validation check in dashboard.

### SSE Heartbeat Detection

**Current state:** `useSSE` hook closes connection on `onerror` and reconnects. No mechanism to detect silent stalls where backend stops sending but connection stays open.

**Target state:** Track `lastHeartbeatAt`; if no message received in 45 seconds, close and trigger reconnect.

**Change scope:**
1. In `useSSE`, add `lastHeartbeatRef = useRef(Date.now())`
2. On each `onmessage` event, update `lastHeartbeatRef.current = Date.now()`
3. Add `setInterval` (poll every 15s) that checks if `Date.now() - lastHeartbeatRef.current > 45000`, and if so calls `reconnect()`
4. Clear interval on cleanup
5. Backend must send `event: heartbeat\ndata: {}\n\n` every 30 seconds on SSE endpoints (bot status, export progress) — if backend already does this, dashboard change alone is sufficient

**Confidence:** MEDIUM — pattern confirmed by industry sources (auth0 SSE guide, OneUptime blog). Risk: if backend does not send heartbeats, the 45-second threshold causes unnecessary reconnects. Verify backend heartbeat support before enabling.

### React Query staleTime Normalization

**Current state:** Mixed `staleTime` values: brands=2min, accounts=2min, posts=1min, analytics=unknown. Some hooks use default `staleTime: 0`.

**Target state:**
- Static lists (brands, channels, guild settings): `staleTime: 5 * 60 * 1000` (5 min)
- Paginated data (accounts, posts): `staleTime: 2 * 60 * 1000` (2 min) — current, keep
- Real-time / rapidly-changing data (audit log, analytics): `staleTime: 60 * 1000` (1 min)
- Session data: `staleTime: 0` — intentionally fresh

**Change scope:** Audit all `useQuery` and `useInfiniteQuery` in `src/hooks/`. Set explicit `staleTime` values. Create a `STALE_TIME` constants object in `src/lib/query-config.ts`.

**Confidence:** HIGH — React Query staleTime semantics are stable and well-documented.

### Security Audit Report

**Format:** Structured markdown at `.planning/research/SECURITY_AUDIT.md` covering:
- Authentication flow (OAuth → JWT → cookie → SSR forwarding)
- CSRF protection (double-submit + HMAC layer)
- CSP headers (nonce-based strict-dynamic)
- Error sanitization (36+ proxy routes, pattern coverage)
- Rate limiting (429 + 503 handling, global cooldown)
- Session management (httpOnly cookies, revocation, refresh rotation)
- SQL injection (parameterized queries via Prisma)
- Multi-tenancy isolation (clientId scoping in all queries)
- Known gaps and recommendations

**Audience:** Operators deploying the system, not end users. Technical depth required.

---

## Existing Features That Are NOT Changing

These are confirmed working and must not regress during v1.2:

- Discord OAuth login and refresh token rotation
- Guild permission enforcement (ADMINISTRATOR bit 0x8 check)
- All 36+ proxy routes (only error parsing updates, not route logic)
- Export/import SSE progress (only heartbeat detection addition)
- Bonus system (cursor pagination already correct)
- Alert thresholds, session management, analytics, leaderboard
- CSP nonce generation, HSTS, X-Request-ID propagation
- Playwright E2E tests (must pass after each change)
- `fetchWithRetry` CSRF retry flow (`EBADCSRFTOKEN` → GET session → retry)

---

## Sources

- Backend `/middleware/csrf.ts` — HMAC payload format and bypass conditions (HIGH confidence, live code)
- Backend `/routes/dashboard/bonus/bonusRoutes.ts` — cursor pagination response shape `{ next_cursor, has_more }` (HIGH confidence, live code)
- Backend `/routes/dashboard/guilds/guildRead.ts` — current error envelope shape `{ error: string, message: string }` (HIGH confidence, live code)
- `src/lib/fetch-with-retry.ts` — existing CSRF, rate limit, 401 refresh handling (HIGH confidence, live code)
- `src/proxy.ts` — CSRF double-submit validation, proactive token refresh (HIGH confidence, live code)
- `src/hooks/use-sse.ts` — current SSE lifecycle, visibility handling, exponential backoff (HIGH confidence, live code)
- `src/hooks/use-tracking.ts` — current offset pagination implementation (HIGH confidence, live code)
- [Next.js Security: Server Components and Actions](https://nextjs.org/blog/security-nextjs-server-components-actions) — SSR audit guidance, route handler security (HIGH confidence, official)
- [TanStack Query v5 Infinite Queries](https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries) — `initialPageParam`, `getNextPageParam` cursor pattern (HIGH confidence, official)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — Signed Double Submit Cookie pattern (HIGH confidence, official)
- [SSE Practical Guide](https://tigerabrodi.blog/server-sent-events-a-practical-guide-for-the-real-world) — heartbeat and stall detection patterns (MEDIUM confidence, community)
- [Next.js Bundle Analyzer](https://nextjs.org/docs/14/pages/building-your-application/optimizing/bundle-analyzer) — bundle analysis tooling (HIGH confidence, official)
- [React Query cache invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation) — staleTime and invalidation patterns (HIGH confidence, official)

---

*Feature research for: v1.2 Security Audit & Optimization milestone*
*Researched: 2026-02-22*
