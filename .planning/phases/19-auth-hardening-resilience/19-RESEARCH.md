# Phase 19: Auth Hardening & Resilience - Research

**Researched:** 2026-02-23
**Domain:** SSR cookie forwarding, mutation retry with blocking UI, rate limit separation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Mutation retry (503 handling)
- Auto-retry mutations with toast notification (not manual retry)
- 5 retry attempts with exponential backoff before showing final failure
- Generic "Retrying..." message in toast (no attempt count, no countdown)
- Blocking overlay on the form/section during retries — user cannot edit while retrying
- Edits blocked during retry (consistent with blocking overlay)
- On successful retry after failures, show a "Changes saved" success toast
- If user navigates away during retry, retry continues in background and toast follows to new page
- Cancel button on overlay and mutation type differentiation: Claude's discretion
- Overlay visual style (dimmed section vs full overlay): Claude's discretion
- Final failure state after 5 attempts exhausted: Claude's discretion
- Backoff timing visibility (countdown vs generic): Claude's discretion
- Network errors (backend unreachable) vs 503: Claude's discretion
- Mutation queuing strategy (queue vs latest-wins): Claude's discretion

#### Read retry (503 handling)
- Reads (polling, page loads) that get 503 show a subtle indicator — small banner at top of section: "Connection issues — retrying..."
- Banner auto-dismisses when reads start succeeding again
- Reads retry silently in background behind the banner

#### Rate limit feedback (429 handling)
- Show subtle indicator when background polling hits 429: banner with countdown ("Data updates paused — resuming in Xm")
- Use Retry-After header value from backend to set cooldown duration
- Cooldown persists across page refresh (sessionStorage)
- Mutations and polling should have separate rate limit tracking so polling 429s don't block user saves (separation strategy: Claude's discretion)
- Rate limit banner style (same as 503 or distinct): Claude's discretion
- Banner auto-dismiss behavior when cooldown expires: Claude's discretion

#### SSR auth failure
- 401 or missing/expired cookie during SSR: redirect to login page
- After re-login, redirect user back to the page they were originally trying to access (return URL)
- Show explanation on login page: "Your session expired — please log in again"
- Token validation strategy (forward-only vs check-expiry-first): Claude picks best approach for security and preventing abuse
- SSR 503 handling (loading shell vs server-side retry): Claude's discretion

#### Client-side auth failure
- Client-side requests that return 401 also redirect to login (consistent with SSR behavior)
- Handling of unsaved changes during 401 redirect: Claude's discretion
- Global vs per-component 401 interceptor architecture: Claude's discretion

### Claude's Discretion
- Cancel button on overlay
- Mutation type differentiation
- Overlay visual style (dimmed section vs full overlay)
- Final failure state after 5 attempts exhausted
- Backoff timing visibility
- Network errors vs 503 handling
- Mutation queuing strategy (queue vs latest-wins)
- Rate limit banner style
- Banner auto-dismiss behavior when cooldown expires
- Separation strategy for mutation vs polling rate limit tracking
- SSR 503 handling (loading shell vs server-side retry)
- Global vs per-component 401 interceptor architecture
- Handling of unsaved changes during 401 redirect

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-02 | SSR route handlers forward `auth_token` cookie as `Authorization: Bearer` header when calling `backendFetch`, enabling authenticated server-rendered pages | All pages are currently `'use client'` — no SSR pages call `backendFetch` directly. The requirement means creating a capability in `backendFetch` so that FUTURE SSR pages (or the current page.tsx that does cookie checks) can call the backend without manual token extraction boilerplate |
| AUTH-03 | `fetchWithRetry` handles 503 responses with user-facing retry toast for mutations and silent backoff for reads, instead of treating 503 as unrecoverable | `fetchWithRetry` currently retries 503 only for GET/HEAD/OPTIONS (`RETRYABLE_METHODS`). Mutations (POST/PUT/PATCH/DELETE) receive a 503 and immediately return the response without retry — this is the current gap |
| AUTH-04 | Global rate limit cooldown (`globalRateLimitUntil`) separated so background polling 429s do not block user-initiated mutations | `globalRateLimitUntil` is a single module-level variable shared by all callers. A polling 429 sets it; all subsequent mutation calls throw `RateLimitError` immediately. Need two separate cooldown buckets |
</phase_requirements>

---

## Summary

Phase 19 has three distinct sub-problems that share no code, so they can be planned and executed independently.

**AUTH-02 (SSR auth forwarding):** The entire dashboard is client-rendered (`'use client'` on every page). The only true server-rendered page is `app/page.tsx` (root redirect) which reads cookies but does not call `backendFetch`. The requirement is to make `backendFetch` capable of automatically forwarding the `auth_token` cookie as an `Authorization: Bearer` header when called in server context (SSR route handlers or Server Components), so any future SSR page does not need to manually extract tokens. The correct implementation reads the `auth_token` cookie from `next/headers` when `backendFetch` is invoked from server context, prepending the Authorization header automatically.

**AUTH-03 (503 mutation retry):** `fetchWithRetry` already retries 503 for safe methods (GET/HEAD/OPTIONS via `RETRYABLE_METHODS`). Mutations are not in that set, so a 503 from a mutation immediately returns the response to the caller (no retry). The fix requires: (1) detecting mutation 503s in `fetchWithRetry`, (2) retrying up to 5 times with exponential backoff, and (3) surfacing a persistent "Retrying..." toast during the retry loop and a blocking overlay in the form component. The toast must survive page navigation (Sonner's `toast.loading()` with a fixed ID persists across route changes). The overlay is a per-component concern: forms/sections that use mutations need to render a blocking overlay when the mutation is in a retry state.

**AUTH-04 (rate limit separation):** The current `globalRateLimitUntil` variable is module-level and shared. A polling 429 (from any `fetchWithRetry` call without `skipGlobalCooldown: true`) sets it, causing all subsequent calls to throw immediately. The fix is to split into two separate cooldown buckets: `pollingRateLimitUntil` (for reads) and `mutationRateLimitUntil` (for writes). Polling calls set only the polling bucket; mutation calls set only the mutation bucket. The rate limit banner needs a countdown driven by `sessionStorage`-persisted cooldown end time.

**Primary recommendation:** Implement in plan order: 19-01 (SSR auth, smallest change, high value for future pages) then 19-02 (503 + 429, intertwined since both touch `fetchWithRetry`). The 503 retry toast and 429 banner can be implemented in the same plan since both affect `fetchWithRetry` and the UI feedback layer simultaneously.

---

## Standard Stack

### Core (no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | ^2.0.7 | Toast notifications including persistent `toast.loading()` | Already in use; `toast.loading()` with fixed ID persists across route changes |
| next/headers | Next.js ^16 | Server-side cookie access via `cookies()` | Already used in API routes and `lib/auth.ts` |
| React (useState, useRef, useCallback) | ^19 | Overlay state management in form components | Project standard |
| sessionStorage | Browser API | Persisting rate limit cooldown across page refresh | No library needed; built-in |

### No New Installations Required

This phase modifies existing files only. All tools are already present in `package.json`.

**Installation:**
```bash
# Nothing to install
```

---

## Architecture Patterns

### Current File Map (what exists)

```
src/lib/fetch-with-retry.ts          # Client-side fetch with rate limit + retry logic
src/lib/server/backend-fetch.ts      # Server-side fetch wrapper (adds X-Internal-Secret + Idempotency-Key)
src/lib/auth.ts                      # getSession() reads auth_token cookie from next/headers
src/proxy.ts                         # Middleware: token refresh, CSRF, security headers
src/app/providers.tsx                # Sonner Toaster with 5s auto-dismiss
src/components/offline-banner.tsx    # Pattern for fixed top banners (reference for 503/429 banners)
src/hooks/use-guilds.ts              # useUpdateGuildSettings mutation (target for blocking overlay)
src/components/forms/guild-settings-form.tsx  # Target form for overlay implementation
```

### Pattern 1: AUTH-02 — backendFetch Auto-forwards auth_token in SSR context

**What:** When `backendFetch` is called from a server context (Next.js API route or Server Component), automatically read `auth_token` from `next/headers` cookies and inject it as `Authorization: Bearer {token}` unless the caller has already set an Authorization header.

**Why forward-only (not check-expiry-first):** The middleware (`proxy.ts`) already handles proactive token refresh before page requests land — it refreshes the `auth_token` cookie when close to expiry. By the time an SSR route handler or Server Component calls `backendFetch`, the cookie has already been refreshed by middleware. Checking expiry inside `backendFetch` would duplicate that logic and add latency. Forward-only is both simpler and sufficient. If the backend returns 401, the API route should return 401 to the client, which then triggers the existing `fetchWithRetry` 401 handling (session refresh → login redirect).

**When to use:** Any server-side `backendFetch` call where the caller does not explicitly set `Authorization`.

**Critical constraint:** `next/headers` is only available in server context (App Router route handlers, Server Components). Calling `cookies()` from client context throws at runtime. `backendFetch` must guard this import dynamically or detect server context.

**Implementation approach — dynamic import with try/catch:**

```typescript
// src/lib/server/backend-fetch.ts
import { randomUUID } from 'crypto';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Auto-forward auth_token as Bearer when running in server context
  // and the caller hasn't already set Authorization
  if (!headers.has('Authorization')) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Not in server context (e.g., called from client) — skip
    }
  }

  if (INTERNAL_SECRET) {
    headers.set('x-internal-secret', INTERNAL_SECRET);
  }

  const method = (init?.method || 'GET').toUpperCase();
  if (MUTATION_METHODS.has(method) && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', randomUUID());
  }

  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
```

**Important:** Many existing API route handlers already manually extract the token and pass it as `headers: { 'Authorization': \`Bearer ${token}\` }`. After this change, those routes will still work correctly — the `!headers.has('Authorization')` guard prevents double-injection. The existing pattern can remain unchanged; the auto-forward makes the explicit token extraction optional rather than mandatory.

**SSR auth failure → login redirect:** When `backendFetch` returns 401 in an SSR route handler, the handler currently returns `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. The client-side `fetchWithRetry` 401 handler then fires `recoverExpiredSession()` which redirects to `/login?callbackUrl=...`. This existing chain already handles the return URL. The login page already supports `callbackUrl` via `sessionStorage.setItem('auth_callback_url', callbackUrl)`. The explanation "Your session expired — please log in again" needs to be surfaced — the login page has `AUTH_ERROR_MESSAGES.session_expired` but it only fires when `?error=session_expired` is in the URL. `recoverExpiredSession()` in `fetchWithRetry` shows a `toast.error('Session expired, please log in again')` then redirects to `/login?callbackUrl=...` — the explanation already exists as a toast. No additional changes needed to login page for this path.

### Pattern 2: AUTH-03 — 503 Mutation Retry in fetchWithRetry

**What:** Extend `fetchWithRetry` to retry mutations (POST/PUT/PATCH/DELETE) on 503 with exponential backoff, up to 5 attempts. A retry-state signal (callback or returned state) lets callers show the blocking overlay.

**Current gap:**
```typescript
// Current: canRetryRequest = RETRYABLE_METHODS.has(requestMethod)
// RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
// Therefore mutations skip the 503 retry block entirely and return the 503 response
```

**Implementation — add mutation 503 retry with callback:**

The challenge is surfacing retry state to components. Two approaches:

1. **Option A: onRetry callback in config** — pass `onRetry?: (attempt: number) => void` in the config object. The caller (mutation hook) uses it to set a `isRetrying` state.
2. **Option B: Throw a typed MutationRetryError after exhaustion** — simpler but doesn't allow progress feedback during retry.

**Recommendation: Option A (onRetry callback)** because:
- Components need to know retrying is in progress (for blocking overlay), not just the final failure
- Consistent with how `useSSE` uses callbacks for state surfacing
- Config object already exists (`{ maxRetries?, skipGlobalCooldown? }`)

```typescript
// Extend the config type in fetch-with-retry.ts
config?: number | {
  maxRetries?: number;
  skipGlobalCooldown?: boolean;
  onRetry?: (attempt: number, maxAttempts: number) => void;  // fires before each retry
}

// In the 503 retry block for mutations:
const MUTATION_RETRYABLE_STATUSES = new Set([503]);
const MUTATION_MAX_RETRIES = 5;

// Inside fetchWithRetry, after the canRetryRequest 503 block:
if (!canRetryRequest && response.status === 503 && attempt < MUTATION_MAX_RETRIES) {
  const delay = calculateBackoff(attempt);
  onRetry?.(attempt + 1, MUTATION_MAX_RETRIES);  // fires before sleep
  await sleep(delay);
  continue;
}
```

**Blocking overlay in form components:**

The `useUpdateGuildSettings` mutation in `use-guilds.ts` wraps `fetchWithRetry`. The component (`GuildSettingsForm`) needs a `isRetrying` state to render the overlay.

Pattern:
```typescript
// In use-guilds.ts useUpdateGuildSettings:
const [isRetrying, setIsRetrying] = useState(false);  // or use ref for stability

// Pass onRetry to fetchWithRetry:
const response = await fetchWithRetry(url, options, {
  onRetry: (attempt) => {
    if (attempt === 1) {
      toast.loading('Retrying...', { id: 'mutation-retry' });
    }
    setIsRetrying(true);  // ← problem: useState in hook, not in mutationFn
  }
})
```

**Problem:** `mutationFn` in TanStack Query is an async function — it runs outside React's render cycle. `useState` setters are safe to call from async contexts but the mutation hook can't expose `isRetrying` state back to the component cleanly through TanStack's mutation result.

**Better pattern:** Use a separate `useRef`/`useState` inside the hook, exposed as part of the hook's return value:

```typescript
// In use-guilds.ts:
export function useUpdateGuildSettings(guildId: string) {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  const mutation = useMutation({
    mutationFn: async (settings: UpdateSettingsRequest) => {
      const response = await fetchWithRetry(url, options, {
        onRetry: () => setIsRetrying(true),
      });
      // ...
    },
    onSuccess: () => {
      setIsRetrying(false);
      toast.dismiss('mutation-retry');
      toast.success('Changes saved');
    },
    onError: () => {
      setIsRetrying(false);
      toast.dismiss('mutation-retry');
      // show final failure toast
    },
  });

  return { ...mutation, isRetrying };
}
```

**Sonner persistent toast during navigation:** `toast.loading('Retrying...', { id: 'mutation-retry' })` with a fixed `id` persists across Next.js route changes because the `<Toaster>` is in the root layout and Sonner maintains toast state outside React Router. The `toast.dismiss('mutation-retry')` call in `onSuccess`/`onError` cleans up correctly. This satisfies the "toast follows to new page" requirement.

**Overlay visual style (Claude's discretion):** Dimmed section overlay (not full-page modal) is more appropriate — it scopes the block to the section being saved, not the entire page. A semi-transparent overlay div with `pointer-events: none` children and a centered spinner achieves this.

**Network errors vs 503 (Claude's discretion):** Network errors (thrown exceptions from `fetch()`) currently go through the existing `lastError` retry path. For consistency, they should also trigger `onRetry` and the overlay. The existing network error retry in `fetchWithRetry` (bottom of the for loop) should also call `onRetry`.

**Mutation queuing strategy (Claude's discretion):** Latest-wins. If a second mutation fires while the first is retrying (shouldn't happen with blocking overlay, but defensive), the first's `onRetry` callbacks still fire until the first settles. No queuing mechanism needed since the overlay prevents new mutations.

**Read 503 behavior:** A small `ConnectionIssuesBanner` component rendered inside sections that use polling queries. The banner shows when the query's `error` state is set and the error message includes 503 (or a new typed error). The banner auto-dismisses when the query succeeds (goes from `isError` to `isSuccess`). This is a component-level concern using React Query's `status` — no changes to `fetchWithRetry` needed for reads, since reads already retry 503 via `RETRYABLE_SERVER_STATUSES`.

### Pattern 3: AUTH-04 — Separate Polling vs Mutation Rate Limit Buckets

**What:** Split `globalRateLimitUntil` into two module-level variables. Reads (polling) write to `pollingRateLimitUntil`. Mutations write to `mutationRateLimitUntil`. Each type only checks its own bucket before proceeding.

**Current code to modify in `fetch-with-retry.ts`:**

```typescript
// CURRENT (line 34):
let globalRateLimitUntil = 0;

// TO REPLACE WITH:
let pollingRateLimitUntil = 0;    // for GET/HEAD/OPTIONS
let mutationRateLimitUntil = 0;   // for POST/PUT/PATCH/DELETE
```

**Routing logic:**
- `canRetryRequest` (true for GET/HEAD/OPTIONS) → uses `pollingRateLimitUntil`
- mutations (false) → uses `mutationRateLimitUntil`
- `skipGlobalCooldown: true` → bypasses both (existing behavior, for exports)

**Rate limit banner with countdown:** A new React component `RateLimitBanner` reads cooldown expiry from `sessionStorage` on mount, computes remaining seconds, and shows a countdown. The component should be placed in the dashboard layout so it appears on all authenticated pages.

**sessionStorage persistence pattern:**
```typescript
// When a polling 429 is received in fetchWithRetry:
const expiryTime = Date.now() + retryAfterMs;
pollingRateLimitUntil = expiryTime;
sessionStorage.setItem('polling_rate_limit_until', String(expiryTime));

// RateLimitBanner component on mount:
const stored = sessionStorage.getItem('polling_rate_limit_until');
const expiryTime = stored ? parseInt(stored, 10) : 0;
const remainingMs = Math.max(0, expiryTime - Date.now());
```

**Countdown timer pattern:**
```typescript
// In RateLimitBanner:
const [remainingMs, setRemainingMs] = useState(initialRemainingMs);

useEffect(() => {
  if (remainingMs <= 0) return;
  const interval = setInterval(() => {
    const newRemaining = Math.max(0, expiryTime - Date.now());
    setRemainingMs(newRemaining);
    if (newRemaining === 0) {
      clearInterval(interval);
      sessionStorage.removeItem('polling_rate_limit_until');
    }
  }, 1000);
  return () => clearInterval(interval);
}, [expiryTime, remainingMs]);
```

**Banner auto-dismiss:** When `remainingMs` reaches 0, the component returns `null`.

**Note on `sessionStorage` and SSR:** `sessionStorage` is browser-only. The `RateLimitBanner` must be `'use client'` and guard `sessionStorage` access with `typeof window !== 'undefined'` or an `useEffect`.

**But `fetchWithRetry` is client-only** (module-level variables, `document.cookie` reads, `window.location` calls). Writing to `sessionStorage` inside `fetchWithRetry` is safe — it only runs in browser context.

**Banner placement:** The `RateLimitBanner` should be inside the `(dashboard)/layout.tsx`, placed above `{children}` in the main content area. Currently that layout is `'use client'` (already uses `useState`), so no conversion needed.

**503 read banner placement:** A `ConnectionIssuesBanner` component can be co-located with the sections that use polling (e.g., inside the guild detail page wrapper). It checks React Query's error state from whichever query is polling. The SSE `connectionState === 'reconnecting'` banner already exists on `BotStatus` — this 503 banner is separate and covers HTTP polling (not SSE).

### Anti-Patterns to Avoid

- **Calling `cookies()` from client context:** `next/headers` throws when called outside server context. The `try/catch` dynamic import guard in `backendFetch` is essential.
- **Using a single `globalRateLimitUntil` after AUTH-04:** After the split, any code that still references `globalRateLimitUntil` will cause TypeScript errors (variable doesn't exist). Rename cleanly.
- **Toast ID collision:** Using `toast.loading('Retrying...', { id: 'mutation-retry' })` — if multiple mutations retry simultaneously (edge case with concurrent mutations), they share the same toast ID and the dismiss will remove the toast for both. Since the blocking overlay prevents concurrent mutations on the same form, this is acceptable. For global robustness, use a per-mutation-call unique ID passed in via `onRetry`.
- **Blocking overlay in wrong layer:** The overlay must wrap the form/section being saved, not the entire page. Applying it at the layout level would block the entire UI.
- **sessionStorage in server context:** Any component reading `sessionStorage` must be `'use client'` and guard against SSR with `useEffect` or `typeof window !== 'undefined'`.
- **Not dismissing loading toast on final failure:** `toast.dismiss('mutation-retry')` must be called in BOTH `onSuccess` AND `onError` callbacks. Otherwise the "Retrying..." toast persists forever after final failure.
- **Calling `setIsRetrying(true)` inside `mutationFn` without cleanup:** If the mutation is cancelled (component unmount during navigation), the setState call fires on an unmounted component. Guard with a mounted ref or use TanStack's `meta` to pass state down.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent toast across routes | Custom toast portal or global event bus | `sonner` `toast.loading()` with fixed `id` | Sonner's Toaster is mounted in root layout; toast state persists across Next.js route changes |
| Server cookie reading | Manual cookie header parsing | `cookies()` from `next/headers` | Built-in App Router primitive; already used in `lib/auth.ts` and all API routes |
| Countdown timer | Custom RAF loop | `setInterval` with 1s tick | Simple, sufficient precision for minute-scale countdowns |
| Retry backoff | Custom timing | Existing `calculateBackoff()` in fetch-with-retry.ts | Already implemented with jitter; just extend to call `onRetry` |

**Key insight:** Every mechanism needed already exists. The phase is entirely about wiring together existing pieces and adding one split variable.

---

## Common Pitfalls

### Pitfall 1: All Pages Are Client-Rendered — AUTH-02 Has No Immediate Consumer
**What goes wrong:** The requirement says "SSR route handlers forward auth_token cookie" but inspection reveals all dashboard pages are `'use client'`. The only server-rendered page (`app/page.tsx`) only checks cookie presence — it does not call `backendFetch`.
**Why it happens:** The project chose client-rendering for all dashboard pages for simplicity.
**How to avoid:** Implement AUTH-02 by modifying `backendFetch` to auto-forward the cookie when available. This is a capability addition for future SSR pages and a defensive improvement for existing API routes. Existing API routes that already pass the token explicitly are unaffected (the `!headers.has('Authorization')` guard prevents double-injection).
**Warning signs:** Tests for AUTH-02 would need to use an API route (or a new test SSR page) as the test surface, not an existing dashboard page.

### Pitfall 2: onRetry Fires Outside React Render Cycle
**What goes wrong:** `onRetry` is called inside `mutationFn`, which is an async function that runs in TanStack Query's internal scheduler. Calling `setState` from there works (React batches correctly in React 19), but linting rules may flag it.
**Why it happens:** React Query's `mutationFn` executes outside a React event handler.
**How to avoid:** Use a `useRef` to track `isRetrying` state synchronously, and expose a derived `useState` that mirrors it. Alternatively, use TanStack's `mutation.isPending` combined with a separate `isRetrying` variable in the hook's closure.
**Warning signs:** React warning about `setState` on unmounted component if the user navigates away during retry.

### Pitfall 3: 503 Banner Triggers on First Failed Load (Not Just Polling)
**What goes wrong:** The "Connection issues — retrying..." banner should appear when a polling query hits 503, not when the initial page load fails with 503.
**Why it happens:** React Query doesn't distinguish between initial fetch and background refetch.
**How to avoid:** Check `query.isFetching && query.isError && !query.isLoading` — `isLoading` is true only on the first fetch. Or check `query.failureCount > 0` with `!query.isLoading`. Alternatively, show the banner only after the query has previously succeeded (check if `query.data !== undefined`).
**Warning signs:** Banner shows on first page load when backend is down, instead of the skeleton/error state.

### Pitfall 4: Rate Limit sessionStorage Leaks Across Sessions
**What goes wrong:** `sessionStorage` persists for the browser tab session. If the user closes and reopens the tab, `sessionStorage` is cleared. But within the same tab, a rate limit set for polling could outlast the intended 15-minute window if the user is idle.
**Why it happens:** `sessionStorage` does not auto-expire individual keys.
**How to avoid:** Always store the absolute expiry timestamp (not a duration). On read, check `expiryTime > Date.now()`. If the stored expiry has passed, treat as no cooldown and remove the key.
**Warning signs:** Banner shows "Data updates paused — resuming in 0m" after the cooldown should have cleared.

### Pitfall 5: Blocking Overlay Prevents Stale Warning Detection
**What goes wrong:** The `GuildSettingsForm` currently checks for concurrent edits via `checkForStaleSettings()`. If a retry is in progress and the query data updates in background, the stale check won't fire because the form is blocked.
**Why it happens:** The overlay blocks user interaction but `queryClient.setQueryData` still runs in background.
**How to avoid:** After a successful retry resolves, always call `queryClient.invalidateQueries` to refetch the latest server state before showing "Changes saved". This is already done in `onSettled` of `useUpdateGuildSettings`. No special handling needed.
**Warning signs:** Settings appear saved locally but differ from server state.

---

## Code Examples

Verified patterns from codebase inspection:

### Existing backendFetch (source of truth for AUTH-02 changes)
```typescript
// Source: src/lib/server/backend-fetch.ts
import { randomUUID } from 'crypto';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (INTERNAL_SECRET) {
    headers.set('x-internal-secret', INTERNAL_SECRET);
  }
  const method = (init?.method || 'GET').toUpperCase();
  if (MUTATION_METHODS.has(method) && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', randomUUID());
  }
  return fetch(input, { ...init, headers, cache: 'no-store' });
}
```

### Existing globalRateLimitUntil (source of truth for AUTH-04 split)
```typescript
// Source: src/lib/fetch-with-retry.ts lines 34, 138-146
let globalRateLimitUntil = 0;

function getRateLimitRemainingMs(): number {
  return Math.max(0, globalRateLimitUntil - Date.now());
}

function setRateLimitCooldown(ms: number): void {
  if (ms <= 0) return;
  const boundedMs = Math.min(ms, MAX_RATE_LIMIT_WINDOW_MS);
  globalRateLimitUntil = Math.max(globalRateLimitUntil, Date.now() + boundedMs);
}

// Early exit check (line 222-226):
if (!skipGlobalCooldown && !isAuthEndpoint(url)) {
  const cooldownMs = getRateLimitRemainingMs();
  if (cooldownMs > 0) {
    throw new RateLimitError(cooldownMs);
  }
}
```

### Existing 503 retry (only for GET/HEAD/OPTIONS — shows the gap for AUTH-03)
```typescript
// Source: src/lib/fetch-with-retry.ts lines 349-357
if (canRetryRequest && RETRYABLE_SERVER_STATUSES.has(response.status) && attempt < maxRetries) {
  const delay = calculateBackoff(attempt);
  console.warn(`Server error (${response.status}). Retrying...`);
  await sleep(delay);
  continue;
}
// canRetryRequest = RETRYABLE_METHODS.has(requestMethod) — excludes POST/PUT/PATCH/DELETE
```

### Existing recoverExpiredSession() — already handles login redirect with return URL
```typescript
// Source: src/lib/fetch-with-retry.ts lines 171-201
async function recoverExpiredSession(): Promise<void> {
  // ...
  const returnUrl = window.location.pathname + window.location.search;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(returnUrl)}`;
  // Shows toast then redirects after 2.5s
  toast.error('Session expired, please log in again');
  await new Promise(r => setTimeout(r, 2500));
  window.location.replace(loginUrl);
}
```

### Sonner persistent toast pattern (for AUTH-03 retry toast)
```typescript
// Source: Sonner docs — toast with fixed id persists across route changes
// Fires on first retry attempt:
toast.loading('Retrying...', {
  id: 'mutation-retry',
  duration: Infinity,  // Don't auto-dismiss — we dismiss manually
});

// On success after retries:
toast.dismiss('mutation-retry');
toast.success('Changes saved');

// On final failure after 5 retries:
toast.dismiss('mutation-retry');
toast.error('Failed to save changes. Please try again later.');
```

### OfflineBanner pattern (reference for RateLimitBanner structure)
```typescript
// Source: src/components/offline-banner.tsx
// Pattern: fixed top banner, 'use client', useEffect for browser API access
'use client';
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    // ... event listeners
  }, []);
  if (!isOffline) return null;
  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b ...">
      ...
    </div>
  );
}
```

### Dashboard layout (AUTH-04 banner placement target)
```typescript
// Source: src/app/(dashboard)/layout.tsx
// Already 'use client', uses useState — no conversion needed
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside ...><Sidebar /></aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar ... />
        <main className="relative z-0 flex-1 overflow-auto p-4 md:p-6">
          <Breadcrumbs />
          {/* RateLimitBanner goes here, above children */}
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Plan Breakdown Recommendation

### 19-01: Forward auth_token cookie as Authorization header in SSR route handlers
**Scope:** Modify `backendFetch` only. Add dynamic `next/headers` cookie read with try/catch guard. Add `!headers.has('Authorization')` check to prevent double-injection.
**Files touched:** `src/lib/server/backend-fetch.ts` (1 file, ~15 lines added)
**Test:** API route that explicitly passes Authorization still works. API route that omits it now gets the cookie forwarded.

### 19-02: Handle 503 with retry toast and separate global rate limit cooldown for mutations vs reads
**Scope:**
1. `fetch-with-retry.ts` — add `onRetry` callback to config type; add mutation 503 retry block (5 attempts); split `globalRateLimitUntil` into `pollingRateLimitUntil` + `mutationRateLimitUntil`; write to `sessionStorage` on polling 429
2. Hook changes — `useUpdateGuildSettings` (and other key mutation hooks) return `isRetrying` state; call `toast.loading` / `toast.dismiss` appropriately
3. New component — `RateLimitBanner` reads from `sessionStorage`, shows countdown, placed in `(dashboard)/layout.tsx`
4. Form component — `GuildSettingsForm` renders blocking overlay when `isRetrying === true`
5. `ConnectionIssuesBanner` component — shown inline in sections with polling queries when query is in error state after prior success

**Files touched:**
- `src/lib/fetch-with-retry.ts`
- `src/hooks/use-guilds.ts` (add `isRetrying` to `useUpdateGuildSettings`)
- `src/components/forms/guild-settings-form.tsx` (blocking overlay)
- `src/app/(dashboard)/layout.tsx` (RateLimitBanner import)
- `src/components/rate-limit-banner.tsx` (new component)
- `src/components/connection-issues-banner.tsx` (new component)

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Manual `Authorization: Bearer ${token}` in every API route | Auto-forward in `backendFetch` | Future SSR pages don't need boilerplate; existing routes unaffected |
| Single `globalRateLimitUntil` | Separate polling + mutation buckets | Polling 429s no longer block user-initiated saves |
| No 503 retry for mutations | 5-attempt retry with blocking overlay | Transient backend outages no longer silently fail mutation |

---

## Open Questions

1. **Should existing API routes that manually pass the token be updated to remove the redundant extraction?**
   - What we know: There are ~50+ API routes that extract `auth_token` from cookies and pass it explicitly. After AUTH-02, this is redundant but harmless.
   - What's unclear: Whether to clean them up in this phase or leave for later.
   - Recommendation: Leave existing routes unchanged in this phase. The `!headers.has('Authorization')` guard makes the auto-forward safe and backwards-compatible. Clean-up is a separate refactor concern, not a correctness requirement.

2. **Which mutation hooks beyond `useUpdateGuildSettings` need the `isRetrying` / blocking overlay treatment?**
   - What we know: The requirement's success criterion mentions "a mutation attempted when the backend returns 503 shows a retry toast instead of silently failing." This implies all mutations, not just settings.
   - What's unclear: Whether the blocking overlay should be implemented for every mutation consumer or only the settings form.
   - Recommendation: Implement `isRetrying` return in all mutation hooks that are likely to be triggered by user action on forms (settings, add account, add brand, delete operations). The `onRetry` callback in `fetchWithRetry` handles the toast universally — the per-hook `isRetrying` state is needed only for components that render a blocking overlay. For confirmation-modal mutations (delete), no overlay is needed since the modal already blocks.

3. **Does `formatDuration()` in `fetch-with-retry.ts` produce the correct format for the rate limit countdown banner ("Data updates paused — resuming in Xm")?**
   - What we know: `formatDuration()` returns "Xm Ys" format (e.g., "2m 30s"). The banner spec says "Xm".
   - What's unclear: Whether "Xm 0s" is acceptable or the banner should use a different formatter.
   - Recommendation: Use `Math.ceil(remainingMs / 60000)` directly in the banner component — simpler and produces clean "Xm" output without importing the private function.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/fetch-with-retry.ts` — confirmed exact `globalRateLimitUntil` variable (line 34), `RETRYABLE_METHODS` set (line 31), 503 retry block for reads (lines 349-357), `onRetry` gap for mutations, `canRetryRequest` logic
- Codebase: `src/lib/server/backend-fetch.ts` — confirmed current backendFetch signature and behavior
- Codebase: `src/lib/auth.ts` — confirmed `getSession()` pattern using `cookies()` from `next/headers`
- Codebase: `src/proxy.ts` — confirmed middleware token refresh already handles proactive refresh; forward-only approach in `backendFetch` is correct
- Codebase: `src/app/(dashboard)/layout.tsx` — confirmed already `'use client'` with `useState`; valid placement for `RateLimitBanner`
- Codebase: `src/components/offline-banner.tsx` — confirmed pattern for browser-API banners
- Codebase: `src/app/providers.tsx` — confirmed Sonner `Toaster` in root layout with `duration: 5000`; confirms persistent toast pattern works across routes
- Codebase: `src/hooks/use-guilds.ts` — confirmed `useUpdateGuildSettings` structure (primary mutation hook for overlay implementation)
- Codebase: `src/components/forms/guild-settings-form.tsx` — confirmed current form state machine (`saveStatus`); overlay integrates with existing pattern
- Codebase: `src/app/(auth)/login/page.tsx` — confirmed `callbackUrl` sessionStorage handling; login page already supports post-login redirect
- Codebase: `package.json` — confirmed `sonner ^2.0.7`, `next ^16`, `react ^19`; no new dependencies needed

### Secondary (MEDIUM confidence)
- Sonner docs (training knowledge): `toast.loading()` with `id` persists across Next.js route changes because Toaster is in root layout — standard Sonner pattern, HIGH confidence based on Sonner design

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- AUTH-02 (SSR auth forwarding): HIGH — backendFetch is a single 34-line file; the change is mechanical; `next/headers` pattern confirmed from `lib/auth.ts`
- AUTH-03 (503 mutation retry): HIGH — gap in `fetchWithRetry` confirmed at line 350; `RETRYABLE_METHODS` is the root cause; `onRetry` callback pattern is clean
- AUTH-04 (rate limit separation): HIGH — `globalRateLimitUntil` is a single module-level variable; split is mechanical; `sessionStorage` pattern is standard

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (stable codebase; no external dependencies changing)
