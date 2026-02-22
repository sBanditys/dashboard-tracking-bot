# Stack Research

**Domain:** Next.js 16 dashboard — v1.2 Security Audit & Optimization additions
**Researched:** 2026-02-22
**Confidence:** HIGH

---

## Context: What Already Exists

The dashboard already ships:

| Already Installed | Version | Purpose |
|-------------------|---------|---------|
| next | 16.1.6 | App Router framework |
| @tanstack/react-query | 5.90.20 | Server state (useInfiniteQuery already in use) |
| zod | 4.3.6 | Runtime validation (already at v4 — breaking from v3) |
| @next/bundle-analyzer | 16.1.6 | Webpack bundle analysis (already wired in next.config) |
| react-intersection-observer | 10.0.2 | Infinite scroll sentinel |
| tailwindcss | 3.4.1 | Styling |
| playwright | 1.58.2 | E2E tests |
| sonner | 2.0.7 | Toast notifications |
| lucide-react | 0.564.0 | Icons |
| recharts | 3.7.0 | Charts |

**jose is NOT installed.** The project currently uses raw `atob()` to decode JWT payloads in proxy.ts and has no HMAC signing capability.

**eventsource-parser is NOT installed.** SSE uses native EventSource API.

The five v1.2 feature areas requiring new or changed stack decisions:
1. CSRF HMAC alignment (backend Phase 37)
2. Cursor pagination migration (backend Phase 39)
3. SSR cookie forwarding / async APIs (QUAL-05/F-14)
4. Rate limit + 503 resilience (already implemented in fetchWithRetry — verify 503 coverage)
5. Bundle/performance optimization (cold starts, React Query cache tuning)

---

## Recommended Stack Additions

### 1. CSRF HMAC Token Signing

**Decision: Use native `crypto.subtle` (Web Crypto API) — no new library.**

The existing double-submit CSRF uses `crypto.randomUUID()` generating an unkeyed random string compared cookie-to-header. Backend Phase 37 aligns to HMAC-signed tokens: the token encodes `timestamp.signature` where the signature is `HMAC-SHA256(secret, timestamp)`.

`crypto.subtle` is available in Next.js 16 Edge Runtime (proxy.ts runs there) without any import. The pattern:

```typescript
// In proxy.ts — no new imports needed
async function signCsrfToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(timestamp)
  );
  const sigHex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}.${sigHex}`;
}

async function verifyCsrfToken(token: string, secret: string): Promise<boolean> {
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;
  // Replay protection: reject tokens older than 24h
  if (Date.now() - Number(timestamp) > 86_400_000) return false;
  const expected = await signCsrfToken(secret); // re-derive for comparison
  // Use constant-time comparison via crypto.subtle.verify
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify(
    'HMAC',
    key,
    hexToUint8Array(sig),
    new TextEncoder().encode(timestamp)
  );
}
```

**Why not `jose`:** jose v6 (current: 6.1.3) is a JWT library. CSRF HMAC signing does not need a JWT format. `crypto.subtle` is already in scope, zero bundle cost, and constant-time `verify()` is built in.

**Why not `csrf-csrf` or similar packages:** These Express-oriented libraries do not work in Next.js Edge Runtime without shimming. The pattern is simple enough to implement inline with Web Crypto API.

**Confidence:** HIGH — `crypto.subtle` availability in Next.js Edge Runtime confirmed via official Next.js Edge Runtime API reference and multiple production examples (Vercel Slack signature verification guide).

---

### 2. Cursor Pagination — useInfiniteQuery Migration

**Decision: No new library. Migrate existing `useAccounts` and `usePosts` from `useQuery` (offset-based) to `useInfiniteQuery` with cursor.**

React Query v5 `useInfiniteQuery` (already installed at 5.90.20) supports cursor pagination natively. The v5 API requires `initialPageParam` (required, replaces `getNextPageParam` default), and `getNextPageParam` returns the cursor from the last page.

```typescript
// Migration: use-tracking.ts — useAccounts with cursor
export function useAccountsCursor(guildId: string, limit: number = 25) {
  return useInfiniteQuery({
    queryKey: ['guild', guildId, 'accounts', 'cursor', limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (pageParam) params.set('cursor', pageParam as string);
      const response = await fetchWithRetry(
        `/api/guilds/${guildId}/accounts?${params}`
      );
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json() as Promise<AccountsCursorResponse>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    staleTime: 2 * 60 * 1000,
    enabled: !!guildId,
  });
}
```

**Proxy route changes:** The `/api/guilds/[guildId]/accounts/route.ts` proxy must forward `?cursor=...` instead of `?page=...&limit=...` to the backend. No library change — just query parameter forwarding.

**TypeScript type additions needed:**

```typescript
// types/tracking.ts — new cursor response shapes
interface AccountsCursorResponse {
  data: Account[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface PostsCursorResponse {
  data: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

**Confidence:** HIGH — `useInfiniteQuery` v5 API verified via TanStack Query v5 official docs. `initialPageParam` is required in v5 (removed the v4 implicit default).

---

### 3. SSR Cookie Forwarding — Async `cookies()` / `headers()`

**Decision: No new library. Update Server Components and Route Handlers to use the async `cookies()` / `headers()` pattern required by Next.js 16.**

In Next.js 16, `cookies()` and `headers()` are async functions. Synchronous access throws at runtime. The existing `backendFetch.ts` and `api-client.ts` already forward cookies via explicit `Authorization` headers from the proxy layer, so most routes are unaffected.

The SSR cookie forwarding pattern for Route Handlers that need to read auth tokens server-side:

```typescript
// Pattern for SSR-aware route handlers (Next.js 16)
import { cookies, headers } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();          // await required in Next.js 16
  const authToken = cookieStore.get('auth_token')?.value;
  const requestHeaders = await headers();       // await required in Next.js 16

  // Forward to backend with auth
  const response = await backendFetch(BACKEND_URL + '/endpoint', {
    headers: {
      Authorization: `Bearer ${authToken}`,
      Cookie: `auth_token=${authToken}`,
    },
  });
  // ...
}
```

**Key constraint:** `cookies()` cannot be called in Server Components to SET cookies — only read. Setting cookies requires Route Handlers or Server Actions. This is already handled correctly in the existing architecture (proxy.ts sets cookies, route handlers only read them).

**What specifically needs updating for QUAL-05/F-14:** The `backendFetch.ts` wrapper does not automatically forward the caller's auth cookie. For SSR route handlers that need to pass through the browser's session cookie to the backend (rather than relying on the Authorization header approach), a new `backendFetchWithCookies(request: Request)` helper that reads `await cookies()` and appends the session cookies is the right pattern.

**Confidence:** HIGH — Next.js 16 async `cookies()` confirmed via official Next.js upgrade guide and Next.js 16 function reference docs.

---

### 4. Error Envelope Migration

**Decision: No new library. Update `error-sanitizer.ts` to parse backend v2.6 `{ error: { code, message } }` envelope.**

Backend Phase 35 changed the error response shape from `{ message, code }` to `{ error: { code, message } }`. The existing `sanitizeError()` function in `src/lib/server/error-sanitizer.ts` reads `parsed.message || parsed.error` — it currently treats `error` as a string, not an object.

The update is purely to the parsing logic in the existing `BackendError` interface:

```typescript
// error-sanitizer.ts — updated BackendError interface
interface BackendError {
  message?: string;
  code?: string;
  stack?: string;
  error?: string | { code?: string; message?: string }; // v2.6 shape
  details?: unknown;
  statusCode?: number;
}

// Updated extraction in sanitizeError():
const errorObj = typeof parsed.error === 'object' ? parsed.error : null;
const code = errorObj?.code ?? parsed.code;
const backendMsg = errorObj?.message ?? parsed.message ??
                   (typeof parsed.error === 'string' ? parsed.error : '');
```

**No library needed.** This is a TypeScript shape update to an existing utility.

**Confidence:** HIGH — confirmed by codebase inspection of `error-sanitizer.ts` + project context describing backend Phase 35 `{ error: { code, message } }` envelope.

---

### 5. Rate Limit + 503 Resilience

**Decision: No new library. Verify and extend existing `fetchWithRetry.ts`.**

The existing `fetchWithRetry.ts` already handles:
- 429 with `Retry-After` header parsing (seconds and HTTP date formats)
- Global cooldown via `globalRateLimitUntil`
- Exponential backoff for 500, 502, 503, 504 via `RETRYABLE_SERVER_STATUSES`
- CSRF retry on 403 `EBADCSRFTOKEN`
- Auth refresh on 401

What v1.2 needs to verify/extend:
- 503 is already in `RETRYABLE_SERVER_STATUSES` — confirm the backoff applies correctly
- The `skipGlobalCooldown` option lets callers opt out — confirm mutation methods also benefit from 503 retry (currently only `RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])` retry on server errors)
- Consider whether POST/PUT/DELETE should retry on 503 (depends on idempotency key — `backendFetch.ts` adds `Idempotency-Key` headers, so retrying mutations is safe)

**Recommendation:** Extend `RETRYABLE_METHODS` guard to also allow retry of idempotent mutations (those with `Idempotency-Key` header) on 503, OR expose a `retryMutations` config flag.

**Confidence:** HIGH — codebase inspection confirms existing coverage. The gap is mutation retry on 503.

---

### 6. SSE Lifecycle Hardening

**Decision: No new library. Extend existing `use-sse.ts`.**

The existing `useSSE` hook already handles:
- Exponential backoff reconnection (2s, 4s, 8s... up to 60s)
- Visibility change detection (close on hidden, reconnect on visible)
- 50% jitter
- Reconnect cooldown (5s default)
- Cleanup on unmount

Known gaps for v1.2 hardening:
1. **Heartbeat timeout detection:** If the backend sends no message for N seconds, the connection may be silently stalled (TCP keepalive is not enough for SSE through proxies). Solution: add a heartbeat timer that triggers reconnect if no message received within `heartbeatTimeout` ms.
2. **Duplicate EventSource instances:** The `connect()` function can be called before the previous EventSource is closed. Add a guard to close before creating new instance.
3. **AbortController integration:** Next.js route handlers can use `request.signal` for abort, but the client-side EventSource does not support AbortController natively. The correct client pattern is `EventSource.close()` already in use.

```typescript
// use-sse.ts addition: heartbeat timeout
const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function resetHeartbeat() {
  if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
  heartbeatTimerRef.current = setTimeout(() => {
    // No message received within timeout — force reconnect
    eventSourceRef.current?.close();
    connect();
  }, heartbeatTimeout); // configurable, default 45_000
}
```

**Confidence:** HIGH — confirmed via codebase inspection of `use-sse.ts` + known SSE stall patterns from Next.js GitHub issues.

---

### 7. Bundle + Performance Optimization

**Decision: No new library. Configure `optimizePackageImports` in `next.config` and add `next experimental-analyze` for Turbopack-integrated analysis.**

**A. `optimizePackageImports` config (highest impact)**

`lucide-react` and `recharts` are both heavy barrel exports. Next.js 16 `optimizePackageImports` reduces cold starts by only loading actually-used modules.

```typescript
// next.config.ts — add to existing config
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  // ... existing config
};
```

Measured improvement from Next.js/Vercel benchmarks: `lucide-react` drops from 1583 modules to 333 (2.8s build savings). On Vercel serverless, this translates to cold start reduction.

**B. `next experimental-analyze` (Next.js 16.1 built-in)**

Next.js 16.1 ships an integrated Turbopack-aware bundle analyzer that shows import chains and why modules are included. Use this instead of running `ANALYZE=true next build` for server bundle inspection.

```bash
npx next experimental-analyze
```

`@next/bundle-analyzer` remains useful for client-side webpack treemap visualization (already configured in `next.config`).

**C. React Query cache tuning**

The current QueryClient uses default `staleTime: 60_000` globally. For v1.2, apply per-query tuning:

| Query | Recommended staleTime | Rationale |
|-------|----------------------|-----------|
| SSE-backed guild status | `Infinity` | SSE handles updates; never auto-refetch |
| Guild list | `5 * 60_000` | Changes rarely |
| Accounts/Posts (cursor) | `2 * 60_000` | Already set correctly |
| Analytics | `10 * 60_000` | Expensive query, slow-changing |
| Audit log | `30_000` | Changes frequently |

The key pattern for SSE-backed queries:
```typescript
// Prevent React Query from background-refetching data managed by SSE
useQuery({
  queryKey: ['guild', guildId, 'status'],
  queryFn: () => fetchCurrentStatus(guildId),
  staleTime: Infinity,          // SSE invalidates manually
  refetchOnWindowFocus: false,  // SSE handles real-time
  refetchInterval: false,
})
```

**D. Dynamic imports for heavy page components**

```typescript
// Lazy-load Recharts components — they are only needed on analytics page
import dynamic from 'next/dynamic';
const AnalyticsChart = dynamic(() => import('@/components/analytics/chart'), {
  ssr: false,  // Charts are client-only
  loading: () => <ChartSkeleton />,
});
```

**Confidence:** HIGH — `optimizePackageImports` and benchmarks confirmed via Vercel official blog and Next.js docs. `next experimental-analyze` confirmed via Next.js 16.1 release notes.

---

## Zod v4 Compatibility Note

The project already runs `zod@4.3.6`. The existing code was written for v3 API. Key v4 changes that affect this codebase:

| v3 Pattern | v4 Equivalent | Status |
|-----------|--------------|--------|
| `z.string().email()` | `z.email()` | May need audit |
| `z.string().uuid()` | `z.uuid()` (RFC-strict) or `z.guid()` (v3-compat) | May need audit |
| `error.errors` | `error.issues` | May need audit |
| `invalid_type_error` param | use `error` param | May need audit |

**Action:** Run a codebase audit for Zod v3 patterns that silently broke on v4. The `zod-v3-to-v4` codemod can assist.

**Confidence:** HIGH — Zod v4 breaking changes confirmed via official Zod migration guide and changelog.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jose` for CSRF | CSRF does not need JWT format. Adds 40kb+ to Edge bundle. | `crypto.subtle` (built-in, zero bundle cost) |
| `csrf-csrf` / `csrf-crypto` | Express-oriented, not Edge Runtime compatible without shimming. | `crypto.subtle` inline implementation |
| `eventsource-parser` | Native EventSource handles JSON messages already. Only needed if backend sends named SSE event types that require parsing non-default events. | Native `EventSource.onmessage` — already in `use-sse.ts` |
| `socket.io` or WebSocket library | SSE already in production; no bidirectional need. | Existing EventSource + `use-sse.ts` |
| `axios` | Not Edge Runtime compatible; larger bundle than fetch. | Existing `fetchWithRetry` + `backendFetch` |
| `swr` | React Query already in use; two caching layers conflict. | `@tanstack/react-query@5.90.20` (existing) |
| `next-auth` / `auth.js` | API owns auth. Dashboard is a proxy consumer. | Existing custom JWT pattern |
| `react-hook-form` | Forms are simple; Server Actions + Zod already used. | Existing pattern |

---

## Installation

No new `npm install` required for the core v1.2 features. All changes are:
- Code changes to existing files (`proxy.ts`, `error-sanitizer.ts`, `use-sse.ts`, `use-tracking.ts`)
- Configuration changes to `next.config.ts` (optimizePackageImports)
- New helper functions using built-in Web Crypto API

If the team decides `jose` is needed for JWT verification in middleware (not currently used — proxy.ts uses `atob()` for expiry check only), it is the correct choice:

```bash
# Only add if middleware needs full JWT verification (not just expiry peek)
npm install jose@^6.1.3
```

---

## Version Compatibility

| Package | Current | Compatible | Notes |
|---------|---------|-----------|-------|
| next | 16.1.6 | crypto.subtle (built-in) | Available in Edge Runtime since Next.js 12+ |
| next | 16.1.6 | `experimental-analyze` | Available since Next.js 16.1 |
| next | 16.1.6 | `await cookies()` / `await headers()` | Required in v16; sync throws |
| @tanstack/react-query | 5.90.20 | `initialPageParam` (required) | v5 removed default; must be explicit |
| zod | 4.3.6 | Breaking from v3 | `z.string().email()` → `z.email()`, `error.errors` → `error.issues` |
| lucide-react | 0.564.0 | `optimizePackageImports` | Drops from 1583 to 333 modules in Next.js 16 |
| recharts | 3.7.0 | `optimizePackageImports` | Drops from 1485 to 1317 modules |

---

## Sources

- [Next.js 16 `cookies()` / `headers()` function reference](https://nextjs.org/docs/app/api-reference/functions/cookies) — async pattern confirmed
- [Next.js `optimizePackageImports` docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) — config and default packages
- [Vercel: How we optimized package imports](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) — cold start benchmark numbers
- [Next.js 16.1 release notes](https://nextjs.org/blog/next-16-1) — `next experimental-analyze` confirmed
- [TanStack Query v5 useInfiniteQuery docs](https://tanstack.com/query/v5/docs/framework/react/reference/useInfiniteQuery) — `initialPageParam` requirement
- [TanStack Query v5 infinite queries guide](https://tanstack.com/query/v5/docs/react/guides/infinite-queries) — cursor pagination pattern
- [Web Crypto API SubtleCrypto sign() — MDN](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign) — HMAC implementation
- [Verifying Slack signatures with SubtleCrypto in Vercel Edge Runtime](https://medium.com/@jackoddy/verifying-slack-signatures-using-web-crypto-subtlecrypto-in-vercels-edge-runtime-45c1a1d2b33b) — Edge Runtime HMAC pattern
- [Next.js Edge Runtime API reference](https://nextjs.org/docs/app/api-reference/edge) — available APIs
- [Zod v4 migration guide](https://zod.dev/v4/changelog) — breaking changes from v3
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — signed double-submit cookie pattern
- [jose v6 npm](https://www.npmjs.com/package/jose) — v6.1.3 current; edge-compatible JWT/HMAC

---

*Stack research for: v1.2 Security Audit & Optimization — Next.js 16 dashboard additions*
*Researched: 2026-02-22*
