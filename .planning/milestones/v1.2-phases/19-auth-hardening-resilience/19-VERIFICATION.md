---
phase: 19-auth-hardening-resilience
verified: 2026-02-23T05:30:00Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "A mutation that receives 503 is retried up to 5 times with exponential backoff and a persistent 'Retrying...' toast"
    - "A connection issues banner appears inline when a polling query gets 503 after previously succeeding"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to a guild's accounts page, simulate backend 503 via network throttle, observe retry behavior"
    expected: "A 'Retrying...' loading toast appears immediately on first retry. An overlay spinner covers the form section preventing edits. After retries exhaust, a 'Failed to save changes. Please try again later.' error toast replaces it."
    why_human: "Cannot inject 503 responses or observe toast/overlay behavior via grep"
  - test: "Trigger background polling 429 (via network throttle or mock), then immediately attempt a settings save"
    expected: "Settings save proceeds without a RateLimitError being thrown — only the polling bucket is blocked, mutation bucket is clear"
    why_human: "Cannot simulate separate rate limit buckets triggering concurrently in automated verification"
  - test: "Navigate to accounts page after backend has successfully loaded data, simulate a polling 503, observe inline banner"
    expected: "ConnectionIssuesBanner ('Connection issues — retrying...') appears inline between GuildTabs and the filter bar. The stale account data remains visible underneath."
    why_human: "Cannot trigger real 503 polling failure or observe React component rendering without running the application"
---

# Phase 19: Auth Hardening and Resilience Verification Report

**Phase Goal:** Server-rendered pages authenticate correctly against the backend, and transient backend failures no longer block users from saving changes
**Verified:** 2026-02-23T05:30:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure via plan 19-03 (commits 162438d and 8a7a3bd)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | backendFetch auto-forwards auth_token cookie as Authorization Bearer when called from server context and no Authorization header is already set | VERIFIED (no change) | `src/lib/server/backend-fetch.ts` lines 28-38: `!headers.has('Authorization')` guard, `await import('next/headers')`, `Bearer ${token}` assignment |
| 2 | Existing API routes that explicitly pass Authorization header are unaffected — no double-injection | VERIFIED (no change) | Guard at line 28 `if (!headers.has('Authorization'))` skips the cookie-forwarding block when caller already set the header |
| 3 | Calling backendFetch from client context does not throw — the dynamic import guard silently skips cookie forwarding | VERIFIED (no change) | Lines 36-38: empty `catch` block skips forwarding silently when `import('next/headers')` fails outside server context |
| 4 | A mutation that receives 503 is retried up to 5 times with exponential backoff and a persistent 'Retrying...' toast | VERIFIED (gap closed) | `fetch-with-retry.ts` lines 399-431: dedicated inner loop `for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++)` runs exactly 5 iterations, independent of outer `DEFAULT_MAX_RETRIES=3` bound. Old `attempt < MUTATION_MAX_RETRIES` pattern fully removed (grep returns 0 matches). `onRetry?.(mutationAttempt, MUTATION_MAX_RETRIES)` fires before each sleep |
| 5 | Background polling hitting 429 does not block user-initiated mutations — separate rate limit buckets | VERIFIED (no change) | `pollingRateLimitUntil` and `mutationRateLimitUntil` are independent variables at lines 35-36. `globalRateLimitUntil` fully absent (grep returns 0 results across entire src/ tree). `setRateLimitCooldown(ms, isMutation)` routes to correct bucket |
| 6 | A connection issues banner appears inline when a polling query gets 503 after previously succeeding | VERIFIED (gap closed) | `accounts/page.tsx` line 236: early return narrowed from `if (isError)` to `if (isError && !data)`. `ConnectionIssuesBanner` at line 273 is now in the normal `return` path (line 252+), reachable when `isError=true && data` exists. Component at `src/components/connection-issues-banner.tsx` line 21 has `if (!isError || !hasData) return null` — renders correctly when both props are true |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/server/backend-fetch.ts` | Auto-forwarding auth_token cookie as Bearer header in SSR context | VERIFIED | Dynamic import guard at lines 28-38; `import('next/headers')` pattern confirmed; no changes in 19-03 |
| `src/lib/fetch-with-retry.ts` | Mutation 503 retry via dedicated inner loop reaching exactly 5 retries | VERIFIED | Inner loop `for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++)` at line 400. `MUTATION_MAX_RETRIES=5` at line 32 is now the binding constraint. Old outer-loop-dependent pattern removed. Commit 162438d |
| `src/components/rate-limit-banner.tsx` | Countdown banner for polling rate limit cooldown | VERIFIED (no change) | File unchanged; 91 lines, `polling_rate_limit_until` sessionStorage key, `rate-limit-updated` event listener, 1-second countdown |
| `src/components/connection-issues-banner.tsx` | Inline banner for 503 read errors, gated on isError && hasData | VERIFIED | File unchanged and correct; `if (!isError || !hasData) return null` gate at line 21; renders orange "Connection issues" banner when both are true |
| `src/hooks/use-guilds.ts` | isRetrying state from mutation hooks, exposed via onRetry/onRetrySettled | VERIFIED (no change) | `useState<boolean>(false)` for isRetrying at line 148; `onRetry` at line 158; `onRetrySettled` at line 166; `return { ...mutation, isRetrying }` at line 230 |
| `src/components/forms/guild-settings-form.tsx` | Blocking overlay during mutation retry | VERIFIED (no change) | `const { isRetrying, ...mutation } = useUpdateGuildSettings(guildId)` at line 22; overlay at lines 106-113 conditional on `isRetrying` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/server/backend-fetch.ts` | `next/headers cookies()` | dynamic import with try/catch | WIRED | `import('next/headers')` at line 30, `await cookies()` at line 31, token extracted and set as Bearer |
| `src/lib/fetch-with-retry.ts` | mutation 503 retry block | dedicated mutationAttempt counter independent of outer loop | WIRED | Inner loop `for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++)` at line 400. No dependency on outer `attempt` variable. Old pattern `attempt < MUTATION_MAX_RETRIES` absent |
| `src/lib/fetch-with-retry.ts` | `src/hooks/use-guilds.ts` | onRetry callback in fetchWithRetry config | WIRED | `onRetry` in config type (line 245), hooks pass callbacks at lines 158 and 266 |
| `src/hooks/use-guilds.ts` | `src/components/forms/guild-settings-form.tsx` | isRetrying returned from hook | WIRED | Line 22 of form: `const { isRetrying, ...mutation } = useUpdateGuildSettings(guildId)`; overlay at line 106 |
| `src/lib/fetch-with-retry.ts` | `src/components/rate-limit-banner.tsx` | sessionStorage polling_rate_limit_until + rate-limit-updated event | WIRED | fetch-with-retry writes to sessionStorage at line 167 and dispatches event at line 170; banner reads on mount and listens for event |
| `src/components/rate-limit-banner.tsx` | `src/app/(dashboard)/layout.tsx` | import and render above children | WIRED | `import { RateLimitBanner }` at line 8 of layout; `<RateLimitBanner />` at line 38 |
| `src/components/connection-issues-banner.tsx` | `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` | conditional render within normal return, not behind early return | WIRED | Early return narrowed to `if (isError && !data)` at line 236. `ConnectionIssuesBanner isError={isError} hasData={!!data}` at line 273 is inside the normal `return (...)` block at line 252, structurally reachable when `isError=true && data` is truthy |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| AUTH-02 | 19-01-PLAN.md | SSR route handlers forward `auth_token` cookie as `Authorization: Bearer` header when calling `backendFetch` | SATISFIED | `backendFetch` auto-injects cookie token when `!headers.has('Authorization')` via dynamic import of `next/headers`; commit 180f22f |
| AUTH-03 | 19-02-PLAN.md | `fetchWithRetry` handles 503 responses with user-facing retry toast for mutations and silent backoff for reads. Mutation retries up to 5 times via dedicated counter | SATISFIED | Dedicated inner loop `mutationAttempt 1..5` independent of outer `DEFAULT_MAX_RETRIES=3`. `onRetry` fires before each retry sleep. CSRF token re-injected on each retry attempt. TypeScript compilation clean |
| AUTH-04 | 19-02-PLAN.md | Background polling 429s do not block user-initiated mutations — split rate limit buckets per request type | SATISFIED | `pollingRateLimitUntil` (GET/HEAD/OPTIONS) and `mutationRateLimitUntil` (POST/PUT/PATCH/DELETE) are independent. `globalRateLimitUntil` fully absent from codebase |

No orphaned requirements — all three IDs (AUTH-02, AUTH-03, AUTH-04) are claimed and cross-referenced.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/fetch-with-retry.ts` | 132 | `TODO(v1.3): Remove old envelope support` | Info | Pre-existing planned cleanup for a future API migration; not related to Phase 19 changes. No functional impact |

No blockers or warnings introduced by the 19-03 gap closure changes.

### Gap Closure Verification

**Gap 1 — Mutation retry count (CLOSED)**

Previous state: outer for-loop `attempt = 0..maxRetries` where `maxRetries = DEFAULT_MAX_RETRIES = 3` capped retries at 3 even though `MUTATION_MAX_RETRIES = 5`.

Fixed state (commit 162438d): the mutation 503 block at line 399 now enters a self-contained inner loop `for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++)`. The inner loop:
- Runs exactly 5 iterations (mutationAttempt 1, 2, 3, 4, 5)
- Is independent of the outer loop's `maxRetries` bound
- Calls `onRetry?.(mutationAttempt, MUTATION_MAX_RETRIES)` before each sleep
- Re-injects CSRF token for each retry
- Returns immediately if a non-503 response is received
- Returns the original 503 response after all 5 retries are exhausted
- Old `attempt < MUTATION_MAX_RETRIES` pattern is absent (grep returns 0 matches)

**Gap 2 — ConnectionIssuesBanner unreachable (CLOSED)**

Previous state: `if (isError) { return <full-page error UI> }` at line 236 exited the function before `ConnectionIssuesBanner` at line 273.

Fixed state (commit 8a7a3bd): early return narrowed to `if (isError && !data)` at line 236. When `isError=true && data` exists (polling failure after prior success), execution falls through to the normal `return (...)` at line 252, where `<ConnectionIssuesBanner isError={isError} hasData={!!data} />` at line 273 renders the inline orange "Connection issues" banner. Initial load failures (`isError && !data`) still show the full-page error UI.

### Human Verification Required

### 1. Mutation 503 Retry UX (5 attempts)

**Test:** Open a guild settings page, throttle the network to return 503 for PATCH requests, change a channel setting and submit
**Expected:** A "Retrying..." loading toast appears immediately on first retry. An overlay spinner covers the form section. After 5 retries exhaust without success, a final error toast replaces it. Total of 6 requests are made (1 original + 5 retries).
**Why human:** Cannot inject 503 responses or observe toast/overlay behavior via grep

### 2. Split Rate Limit Bucket Isolation

**Test:** Trigger a polling 429 (e.g., mock the accounts API to return 429 with Retry-After: 300), then immediately attempt to save guild settings (PATCH mutation)
**Expected:** The settings save proceeds normally — no RateLimitError is thrown for the mutation. The RateLimitBanner appears in the layout for background polling, but the mutation path is unaffected.
**Why human:** Cannot simulate concurrent rate limit bucket state without running the application

### 3. ConnectionIssuesBanner on Polling Failure

**Test:** Navigate to the accounts page (let it load data successfully), then simulate a backend 503 on the next polling interval
**Expected:** The orange "Connection issues — retrying..." banner appears inline between the GuildTabs and the filter bar. Stale account data remains visible underneath. The banner disappears when polling recovers.
**Why human:** Cannot trigger real 503 polling failure or observe React component rendering without running the application

---

_Verified: 2026-02-23T05:30:00Z_
_Verifier: Claude (gsd-verifier)_
