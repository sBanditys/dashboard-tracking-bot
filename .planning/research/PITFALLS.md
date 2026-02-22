# Pitfalls Research

**Domain:** Next.js 14 Dashboard — v1.2 Security Audit & Optimization
**Researched:** 2026-02-22
**Confidence:** HIGH (codebase inspected, WebSearch verified patterns, OWASP cross-referenced)

---

## Critical Pitfalls

Mistakes that cause security regression, data exposure, or require rewrites.

---

### Pitfall 1: CSRF Breaks During HMAC Alignment Window

**What goes wrong:**
The backend (Phase 37) switches from plain double-submit cookie comparison to HMAC-signed token validation. The dashboard still sends the plain `_csrf_token` value in `X-CSRF-Token`. During the window when the backend accepts HMAC only, every dashboard mutation fails with 403 — but the dashboard interprets this as a bad CSRF token and silently retries (see `fetch-with-retry.ts` line 256), burning the one CSRF retry, then surfaces "Session error, please refresh the page." Mutations are dead until deploy is coordinated.

**Why it happens:**
The dashboard's `getCsrfToken()` reads `document.cookie` for `_csrf_token` and sends it verbatim. The proxy (`proxy.ts` line 203) sets a new `crypto.randomUUID()` on every request — a plain string. When the backend starts computing `HMAC(secret, sessionId + timestamp)` and comparing against that, the plain UUID never matches. There is no versioned handshake; the first post-backend-deploy request fails.

**How to avoid:**
Align in this exact order:
1. Backend Phase 37 deploys with HMAC validation but also accepts the plain token for a 24-48 hour grace period (backward-compatible dual-check).
2. Dashboard updates `proxy.ts` `setCsrfCookie()` to write an HMAC-signed token using the same INTERNAL_API_SECRET already in `process.env`.
3. Dashboard deploys.
4. Backend removes plain-token fallback in a follow-up deploy.

Never flip the backend to HMAC-only before the dashboard ships the matching generator. Use INTERNAL_API_SECRET (already forwarded in `backendFetch`) to compute the HMAC so no new secret is needed.

**Warning signs:**
- All non-auth mutation routes returning 403 after a backend deploy.
- `fetchWithRetry` logs: "CSRF retry" on every POST/PATCH/DELETE.
- No 401s (auth is fine) but mutations broken.

**Phase to address:** CSRF HMAC alignment phase — must be first deployed task with backward-compatibility window. Backend deploys before dashboard with grace period.

---

### Pitfall 2: Cursor Pagination Breaks Existing React Query Cache Keys

**What goes wrong:**
The current `useAccountsInfinite` and `usePostsInfinite` use `page` numbers as `pageParam` and `pageParam` is `1` on first load. After migrating to cursor pagination, the backend returns `{ nextCursor: "opaque_string" }` instead of `{ pagination: { page, total_pages } }`. The existing `getNextPageParam` reads `lastPage.pagination.page >= lastPage.pagination.total_pages` — which will be `undefined >= undefined = false`, meaning infinite scroll never stops. New pages are fetched indefinitely until the backend returns empty items.

Additionally, React Query's existing cache under keys like `['guild', guildId, 'accounts', 'infinite', ...]` now holds mixed data: old offset-pagination shaped pages merged with new cursor-shaped pages after partial migration. Stale cache entries can surface to users until `gcTime` expires (5 minutes by default).

**Why it happens:**
The `Pagination` type in `src/types/tracking.ts` has `page`, `limit`, `total`, `total_pages` — none of which exist in a cursor response. The switch is a shape change, not an additive change, so TypeScript will not warn if the type is updated but `getNextPageParam` is not.

**How to avoid:**
1. Create a new type `CursorPagination { nextCursor: string | null; hasNextPage: boolean }` alongside the old `Pagination` type.
2. Update `getNextPageParam` to: `(lastPage) => lastPage.pagination.nextCursor ?? undefined`.
3. On deploy, call `queryClient.removeQueries({ queryKey: ['guild', guildId, 'accounts', 'infinite'] })` to evict stale offset-shaped cache entries. Do this in a version-bump effect or by bumping the cache key to include a `v2` sentinel: `['guild', guildId, 'accounts', 'infinite', 'v2', ...]`.
4. The backend must maintain the old offset response shape for the `/accounts` and `/posts` endpoints for at least one deploy cycle (behind a feature flag or API version header), or deploy dashboard and backend simultaneously in a coordinated window.

**Warning signs:**
- Infinite scroll fetches but never stops loading (spinner stays visible).
- React Query DevTools shows `hasNextPage: true` even on last page.
- Console errors: `Cannot read properties of undefined (reading 'page')`.

**Phase to address:** Cursor pagination migration phase. Backend must deploy first with both shapes supported, then dashboard updates types and hooks.

---

### Pitfall 3: SSR Cookie Forwarding Sends Wrong Cookie Name to Backend

**What goes wrong:**
The dashboard uses `auth_token` and `refresh_token` as cookie names client-side (set by proxy.ts), but the backend's `requireDashboardAuth` middleware may read `dashboard_at` or `dashboard_rt` (configurable via env vars, as shown in proxy.ts lines 10-11). When SSR routes are added that call the backend server-side, they forward `cookie: auth_token=...` but the backend only finds `dashboard_at` or `dashboard_rt`, causing 401 on SSR-rendered pages even for authenticated users.

**Why it happens:**
The dashboard uses its own cookie namespace (`auth_token`) in the Next.js cookie store, and converts to the backend's namespace (`dashboard_at`) only in the `backendFetch` Authorization header. If SSR starts forwarding raw cookies to the backend instead of extracting and re-sending as Bearer tokens, the name mismatch causes auth failure. The `dashboard-session-cookies.ts` parsing logic handles the backend's `Set-Cookie` response shape, but does not map the dashboard's cookie names back to the backend's expected names.

**How to avoid:**
SSR-to-backend calls must always use `Authorization: Bearer {token}` — never raw cookie forwarding. The `backendFetch` wrapper already does this correctly for API routes. Do not bypass `backendFetch` in Server Components or use `cookie: request.headers.get('cookie')` forwarding patterns. If SSR cookie forwarding is added per QUAL-05/F-14, write a dedicated `ssrBackendFetch(cookies)` helper that extracts `auth_token` from the cookie store and sends it as a Bearer header, not as a forwarded cookie string.

**Warning signs:**
- SSR-rendered pages show 401 for authenticated users.
- Backend logs show requests without Authorization header from dashboard IP.
- Works on client-side navigation but breaks on full page refresh.

**Phase to address:** SSR cookie forwarding phase — must write `ssrBackendFetch` helper with explicit Bearer header injection, not raw cookie forwarding.

---

### Pitfall 4: Error Envelope Migration Creates Silent Data Corruption in Error Sanitizer

**What goes wrong:**
The backend Phase 35 changes error responses from `{ error: "string", code: "string" }` to `{ error: { code: "string", message: "string" } }`. The `error-sanitizer.ts` currently parses `parsed.message || parsed.error || ''` where `parsed.error` is expected to be a string. After the backend change, `parsed.error` is an object `{ code, message }`. The `isMessageSafe()` check receives `[object Object]` as the message — which is 15 characters, passes the length check, has no unsafe patterns, and gets forwarded to the client as the error text. Users see "[object Object]" in toast messages instead of a real error.

Additionally, the `FRIENDLY_MESSAGES` lookup uses `parsed.code`, but after the envelope change, `code` is nested inside `parsed.error.code` — the lookup always misses, so known error codes (`GUILD_NOT_FOUND`, `unverified_email`) fall through to generic contextual messages. The `unverified_email` redirect in `fetchWithRetry` (line 293) stops working because `body?.code` is no longer at the top level.

**Why it happens:**
The `sanitizeError()` function has implicit assumptions about the backend's error shape. There is no runtime shape validation (no Zod schema) on the incoming backend error body. A shape change is entirely opaque until runtime.

**How to avoid:**
1. Add a Zod schema for the backend error envelope that accepts both shapes during migration:
   ```typescript
   const BackendErrorSchema = z.union([
     z.object({ error: z.string(), code: z.string().optional() }),          // legacy
     z.object({ error: z.object({ code: z.string(), message: z.string() }) }) // v2
   ])
   ```
2. Normalize to a common shape in `sanitizeError()` before any message extraction.
3. The `unverified_email` code lookup in `fetchWithRetry` must handle both `body?.code` and `body?.error?.code`.
4. Deploy backend with backward-compatible responses (send both shapes for one cycle) before migrating the sanitizer.

**Warning signs:**
- Users see "[object Object]" in error toasts.
- `unverified_email` redirect stops firing — users with unverified email see generic 403 instead of redirect.
- Known error codes stop triggering friendly messages.

**Phase to address:** Error envelope migration phase — sanitizer must be updated before or simultaneously with backend deploy, with dual-shape handling.

---

### Pitfall 5: Rate Limit Global Cooldown Blocks SSR-Initiated Requests Across Tabs

**What goes wrong:**
`fetchWithRetry` maintains `globalRateLimitUntil` as a module-level variable. When the backend returns 429 on one request, all subsequent requests in the same browser tab session are blocked until the cooldown expires. This is by design for client-side tabs — but it has an unintended consequence: if a 429 is triggered by a background React Query refetch (e.g., bot status polling), the cooldown blocks the user from performing any foreground mutation (adding an account, saving settings) for up to 15 minutes. The user sees generic "Too many requests" on unrelated actions.

When the backend migrates its rate limiter to Valkey, new rate limit windows, bucket sizes, and Retry-After values may change. If Valkey's rate limiter returns a different `Retry-After` format (e.g., milliseconds instead of seconds), `parseRetryAfter()` may misinterpret the value and set a 1000x longer cooldown.

**Why it happens:**
The global cooldown is intentional to prevent thundering herd, but it does not discriminate between endpoint types. A 429 on a read endpoint (bot status stream) poisons the write path for all mutations. The `skipGlobalCooldown` option exists but is not used on read-only queries.

**How to avoid:**
1. Audit all `useQuery` hooks that use `fetchWithRetry` for read-only polling (bot status, export progress) — add `config: { skipGlobalCooldown: true }` so their 429s don't block mutations.
2. Add a test for the `parseRetryAfter()` function with the specific format the Valkey-backed rate limiter will emit. Verify this before the backend rate limiter migration deploys.
3. Handle 503 (backend rate limiter unavailable) separately from 429 (rate limited) — 503 should trigger the existing server error retry logic, not a rate limit cooldown.

**Warning signs:**
- User reports: "I can't save anything after refreshing a lot."
- All mutations failing with RateLimitError even on fresh session.
- `globalRateLimitUntil` in module scope persists far longer than expected.

**Phase to address:** Rate limit 503/429 resilience phase — audit `skipGlobalCooldown` usage across all read hooks, validate Retry-After format against Valkey output before migration.

---

### Pitfall 6: SSE Proxy Route Loses Client Disconnect Signal on Vercel

**What goes wrong:**
The SSE proxy in `status/stream/route.ts` passes `signal: request.signal` to `backendFetch`. When the client disconnects (tab close, navigation), the AbortError propagates from the backend fetch, the route catches it, and returns 499. However, on Vercel's Node.js runtime, `request.signal` may not fire reliably when the client closes the connection mid-stream if the route is inside a Streaming Response pipeline. The backend SSE connection can remain open orphaned for the full Vercel function timeout (up to 60s on Pro, 10s on Hobby), keeping the backend connection alive and counting against the backend's connection pool.

Additionally, the `useSSE` hook does `es.close()` on visibility change (tab hidden), but if the tab-hidden event fires while a reconnect timeout is scheduled, the scheduled timeout will call `connect()` after close. The `retryTimeoutRef` is cleared when the tab hides, but if the tab is shown again within `reconnectCooldown` (5000ms), a second `connect()` call can race with the cooldown-deferred connect, creating two simultaneous EventSource instances pointing to the same URL.

**Why it happens:**
`EventSource` does not provide a close confirmation — there is no way to know from the client that the server received the close. The visibility change handler resets state but does not guard against pending timers that were set just before the hide event. Two EventSource instances on the same URL creates two streams, each receiving the same messages and calling `onMessage` twice.

**How to avoid:**
1. In `useSSE`, add a `isClosedRef` guard: set it to `true` in the visibility-hidden handler, check it at the top of `connect()` before creating a new EventSource.
2. Add a generation counter (`connectGenerationRef`) — increment on each `connect()` call, and in `es.onerror` / `es.onmessage`, check that the current generation matches before processing.
3. On the server route, ensure the backend fetch signal is forwarded correctly. If `request.signal` is unreliable in streaming mode, add a server-side keepalive heartbeat timeout (e.g., 45s) that closes the backend stream if no heartbeat is received.

**Warning signs:**
- Backend logs show SSE connections staying open after client disconnects.
- React console: SSE message handlers called twice per event.
- Vercel function duration logs showing long-lived connections that should have closed.

**Phase to address:** SSE lifecycle hardening phase. The dual-instance race is the immediate risk; server-side orphan connections are a cost and stability risk.

---

### Pitfall 7: React Query Infinite Query Partial Cache After Cursor Migration

**What goes wrong:**
After the cursor pagination migration, `useInfiniteQuery` stores all fetched pages in memory. If a user loads 10 pages of accounts (500 items at 50/page) and then a mutation invalidates `['guild', guildId, 'accounts', 'infinite']`, React Query refetches all 10 pages sequentially via its built-in `refetchPage` mechanism. With 36+ proxy routes each adding latency, this triggers 10 sequential backend fetches, each with its own JWT validation round-trip. The UI shows a loading spinner for potentially 10-20 seconds while refetching.

Additionally, `staleTime: 2 * 60 * 1000` on infinite queries means that adding a new account (which calls `queryClient.invalidateQueries` on `['guild', guildId, 'accounts']`) does not invalidate the infinite variant (`['guild', guildId, 'accounts', 'infinite', ...]`) because the key prefix only partially matches and `invalidateQueries` default is `exact: false` — but the infinite key's first 3 segments match the non-infinite key, so invalidation actually does cascade. Verify this is intentional.

**Why it happens:**
React Query's `useInfiniteQuery` refetch behavior fetches all currently-loaded pages on invalidation, not just the first page. This is by design but surprises developers who assume it will only refresh the visible viewport.

**How to avoid:**
1. On mutations that affect paginated lists, use `queryClient.resetQueries` instead of `invalidateQueries` for the infinite query key. `resetQueries` resets to page 1 only, avoiding N-page sequential refetch.
2. Alternatively, use `refetchPage: (page, index) => index === 0` to only refetch the first page on invalidation.
3. Set a higher `staleTime` (5 minutes) for infinite account/post lists — these don't change frequently. Use shorter `staleTime` only for queries that change in real time.

**Warning signs:**
- After deleting an account, the accounts list shows a long spinner.
- Network tab shows N sequential requests to `/api/guilds/{id}/accounts` after a mutation.
- React Query DevTools shows `isFetching: true` on multiple pages of the same query.

**Phase to address:** React Query optimization phase. Default invalidation behavior is surprising and expensive at scale.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Forwarding full query string from client to backend without validation | Simple proxy — no parsing needed | Any query param injection passes through; backend must validate all params | Only acceptable with server-side param allowlist |
| `crypto.randomUUID()` as plain CSRF token | Stateless, no server storage needed | Broken by HMAC migration — UUID token passes a string check but not an HMAC check | Never after HMAC migration |
| `globalRateLimitUntil` module-level variable | Prevents thundering herd across all requests | Blocks unrelated mutations when read queries are rate limited | Never — refactor to per-endpoint cooldowns or add `skipGlobalCooldown` to all reads |
| `parseRetryAfter()` parsing both seconds and HTTP date | Handles both backend formats | Breaks silently if backend emits milliseconds instead of seconds | Never — add explicit format documentation and test |
| Error sanitizer fallback to contextual generic message | Good UX for unexpected errors | Masks new error codes the backend adds; code review doesn't catch new codes | Only with a backend-error-code registry/test |

---

## Integration Gotchas

Common mistakes when connecting dashboard to backend.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| CSRF HMAC alignment | Deploy backend HMAC-only, then dashboard | Deploy backend with dual-check (HMAC + plain), then dashboard HMAC, then remove plain |
| Cursor pagination | Update `getNextPageParam` only in one hook | Update `Pagination` type, ALL hooks, AND cache key eviction atomically |
| Error envelope v2 | Update `sanitizeError` for new shape only | Handle both shapes; update `fetchWithRetry`'s `body?.code` lookup too |
| SSE stream proxy | Trust `request.signal` to abort backend | Add server-side heartbeat timeout as a secondary abort mechanism |
| Rate limiter Valkey migration | Assume `Retry-After` format is unchanged | Write unit test with actual Valkey response headers before migration |
| Backend cookie names vs dashboard cookie names | Forward raw cookie string to backend | Always extract `auth_token` and send as `Authorization: Bearer` header |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Infinite query refetching all pages on mutation | 10-20s spinner after any write operation | Use `resetQueries` or `refetchPage: index === 0` on mutation invalidation | After ~5 pages loaded (250+ items) |
| No `staleTime` differentiation by data volatility | Real-time data is stale, static data refetches unnecessarily | Set `staleTime: 0` for SSE-backed data, `staleTime: 5m` for slowly-changing lists | At 10+ concurrent users with frequent mutations |
| SSE reconnecting on every visibility change without cooldown | Rapid tab switch creates connection storm to backend | Cooldown exists in `useSSE` but verify `lastConnectTimeRef` is not reset on close | After ~10 rapid tab switches |
| Full `queryClient.invalidateQueries` with broad key (e.g., `['guild', guildId]`) | Every query for a guild refetches simultaneously after any mutation | Use scoped keys — invalidate only the specific resource that changed | When guild has 10+ active queries loaded |
| Proxy routes parsing full response body for all error paths | High memory usage on large backend error responses | Parse only on non-2xx; stream 2xx responses directly | When backend returns large error bodies (unlikely but possible) |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| CSRF token matching logic without timing-safe compare | Timing attack to guess token byte-by-byte | Use `crypto.timingSafeEqual()` for HMAC comparison; plain UUID is fine with `===` since UUID length is fixed |
| Forwarding raw cookies to backend without extracting Bearer token | Cookie name mismatch causes auth bypass edge cases; forwards all dashboard cookies including CSRF | Always convert `auth_token` cookie → `Authorization: Bearer` before backend call |
| Nonce freshness: same nonce reused across middleware re-renders | Breaks CSP strict-dynamic for subsequent navigation | Each request generates its own nonce in `proxy.ts` — verify this holds under Vercel edge caching |
| Forwarding `X-Forwarded-For` from client to backend unchanged | Client can spoof IP, bypassing IP-based rate limits | The proxy already extracts only the first XFF entry (client IP), not the full chain — verify this on Valkey migration |
| Error sanitizer allowing safe-looking messages that leak context | Backend error message passes `isMessageSafe()` but contains business logic details | Review `LONG_RATE_LIMIT_THRESHOLD_MS` and similar internal constant values — they must not appear in messages |
| SSE endpoint not validating `auth_token` on reconnect | After token expiry, stale EventSource continues receiving events | The SSE proxy validates `auth_token` on connect only; if token expires mid-stream, backend should close the stream and client should treat 401 on reconnect as session expiry |

---

## UX Pitfalls

Common user experience mistakes during this migration.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Too many requests" toast when background query triggers rate limit | User thinks their action failed when it was a background poll | Use `skipGlobalCooldown: true` on all background polling; only block user-initiated actions |
| Cursor pagination removes total count display ("Page 2 of 47") | Users lose orientation in large lists | Replace with "Load more" UX or "Showing N items" counter using the backend's `total` field if still provided alongside cursor |
| Error envelope migration surfaces "[object Object]" during transition | Users see confusing error text on all failures | Ship sanitizer dual-shape support before backend deploys; zero user impact window |
| Rate limit toast fires on page load (from cached rate limit state) | User sees "Too many requests" on fresh session | `globalRateLimitUntil` is module-level and persists across navigations but not page refreshes — acceptable; do not persist to sessionStorage |
| SSE reconnecting shows "Disconnected" flash on tab refocus | Perceived reliability degradation | During the reconnect cooldown, show "Reconnecting..." not "Disconnected" — only show "Disconnected" after retry exhaustion |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **CSRF HMAC alignment:** Proxy generates HMAC token — but verify the HMAC key is the same secret the backend uses to validate. If keys differ, 100% of mutations fail silently.
- [ ] **Cursor pagination:** `getNextPageParam` updated — but verify `Pagination` type is updated, old cache entries are evicted, and infinite scroll stop condition is correct (`nextCursor === null` not `page >= total_pages`).
- [ ] **Error envelope migration:** `sanitizeError()` handles new shape — but verify `fetchWithRetry`'s `unverified_email` redirect uses `body?.error?.code` not just `body?.code`.
- [ ] **Rate limit resilience:** 429 handling reviewed — but verify 503 (rate limiter backend down) takes a different code path than 429 (rate limited), and that 503 triggers retry logic, not rate-limit cooldown.
- [ ] **SSE hardening:** Cleanup on unmount exists — but verify no two EventSource instances for the same URL can exist simultaneously after rapid hide/show tab cycles.
- [ ] **SSR cookie forwarding:** Server Component calls backend — but verify it uses `Authorization: Bearer` not raw cookie forwarding, and that the cookie name mapping is explicit.
- [ ] **React Query optimization:** Stale times reviewed — but verify `resetQueries` (not `invalidateQueries`) is used for infinite queries after mutations.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CSRF broken after HMAC deploy | HIGH — all mutations blocked | Revert backend to dual-check mode; hotfix dashboard HMAC generator; redeploy in order |
| Cursor pagination cache corruption | LOW — client-side only | Add `v2` sentinel to cache key in hotfix; `queryClient.clear()` is nuclear option |
| Error envelope breaks unverified_email redirect | MEDIUM — security UX regression | Hotfix `fetchWithRetry` to check both `body?.code` and `body?.error?.code`; no backend change needed |
| Global rate limit cooldown blocks user | LOW — resolves on page refresh | Page refresh resets module state; immediate fix is to narrow `skipGlobalCooldown` to reads |
| SSE dual-instance messages | LOW — UX glitch only | Add generation counter to `useSSE`; deploy as non-breaking patch |
| SSR forwards wrong cookies, 401 on page load | HIGH — auth broken for SSR pages | Revert SSR change to client-side fetch; fix `ssrBackendFetch` helper before retry |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CSRF HMAC alignment break (Pitfall 1) | CSRF HMAC alignment phase — first deploy | E2E test: all mutations succeed after backend Phase 37 deploys with dual-check active |
| Cursor pagination cache corruption (Pitfall 2) | Cursor pagination migration phase | React Query DevTools: infinite scroll stops on `nextCursor === null`; no "[object Object]" in pagination |
| SSR cookie name mismatch (Pitfall 3) | SSR cookie forwarding phase | Integration test: full page refresh on authenticated route returns 200, not 401 |
| Error envelope shape mismatch (Pitfall 4) | Error envelope migration phase | Unit test `sanitizeError()` with both `{ error: "string" }` and `{ error: { code, message } }` shapes |
| Rate limit global cooldown interference (Pitfall 5) | Rate limit 503/429 resilience phase | Test: trigger 429 on bot-status poll, verify account mutation succeeds immediately after |
| SSE dual-instance race (Pitfall 6) | SSE lifecycle hardening phase | Manual test: rapidly switch tab visibility 10x, verify single EventSource in DevTools Network |
| Infinite query N-page refetch (Pitfall 7) | React Query cache optimization phase | Network tab: after delete mutation, only 1 accounts request fires (not N for loaded pages) |

---

## Sources

- OWASP CSRF Prevention Cheat Sheet (Signed Double-Submit Cookie): https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- csrf-csrf library (HMAC double-submit implementation): https://github.com/Psifi-Solutions/csrf-csrf
- TanStack Query Infinite Queries docs: https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries
- React Query staleTime vs gcTime: https://www.codemzy.com/blog/react-query-cachetime-staletime
- Next.js CSP and nonce discussion (GitHub #54907): https://github.com/vercel/next.js/discussions/54907
- Next.js SSR cookie handling: https://nextjs.org/docs/app/api-reference/functions/cookies
- SSE memory leak in Express: https://github.com/expressjs/express/issues/2248
- rate-limit-redis (Valkey support): https://github.com/express-rate-limit/rate-limit-redis
- API backward compatibility (Google AIP-180): https://google.aip.dev/180
- Cursor vs offset pagination: https://developer.zendesk.com/documentation/api-basics/pagination/comparing-cursor-pagination-and-offset-pagination/
- Codebase inspection: src/lib/fetch-with-retry.ts, src/hooks/use-sse.ts, src/lib/server/error-sanitizer.ts, src/proxy.ts, src/hooks/use-tracking.ts

---
*Pitfalls research for: Next.js 14 Dashboard — v1.2 Security Audit & Optimization (adding cursor pagination, SSR cookie forwarding, CSRF HMAC, rate limit resilience, error envelope migration, SSE hardening, React Query optimization)*
*Researched: 2026-02-22*
