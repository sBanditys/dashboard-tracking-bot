# Phase 14: Fix Import Confirm CSRF Bypass - Research

**Researched:** 2026-02-22
**Domain:** CSRF security / fetch abstraction / POST-SSE streaming
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | All frontend mutation requests include CSRF token via double-submit cookie pattern | The existing `fetchWithRetry` injects `X-CSRF-Token` from `_csrf_token` cookie for all `CSRF_METHODS` (POST, PUT, PATCH, DELETE) on non-auth endpoints. Switching `useConfirmImport` from raw `fetch()` to `fetchWithRetry` automatically satisfies this for the import confirm POST. |
| IMPEX-04 | Admin can confirm and execute import with progress indicator | The confirm flow must remain functionally identical: POST body `{ importId }`, `credentials: 'include'`, `Content-Type: application/json`, streaming SSE ReadableStream parse loop. Switching to `fetchWithRetry` preserves all of this since `fetchWithRetry` passes `options` through to the underlying `fetch()` call unchanged (except header augmentation). |
</phase_requirements>

---

## Summary

Phase 14 is a single-file, surgical fix. During Phase 13 plan 13-02, the `useConfirmImport` hook was intentionally implemented using raw `fetch()` because the confirm endpoint uses POST-SSE streaming and the original plan noted "Cannot use EventSource (it's a POST endpoint). Use `fetch()` + `ReadableStream` parsing." However, this left the hook bypassing the CSRF token injection that `fetchWithRetry` provides, creating a gap identified in the v1.1 audit.

The fix is replacing the raw `fetch()` call on line 95 of `src/hooks/use-import.ts` with `fetchWithRetry()`. The `fetchWithRetry` function already supports POST requests, injects `X-CSRF-Token` from the `_csrf_token` cookie (set by `src/proxy.ts` CSRF middleware), and passes all options through to the underlying `fetch()` transparently. The SSE streaming logic that follows (response.body.getReader(), line-by-line SSE parsing, onProgress callbacks) requires zero changes — it operates on the `Response` object, which `fetchWithRetry` returns just like native `fetch`.

The two existing functions in `use-import.ts` (`useImportTemplate` and `useImportPreview`) already use `fetchWithRetry` correctly. The gap exists only in `useConfirmImport` because the POST-SSE pattern was perceived as requiring raw `fetch()` — which is incorrect; `fetchWithRetry` is a thin wrapper around `fetch()` that returns the same `Response` type with the same `.body` streaming capability.

**Primary recommendation:** Replace the single `fetch(` call in `useConfirmImport` with `fetchWithRetry(`, remove the `credentials: 'include'` if desired (it can stay — `fetchWithRetry` passes options through), verify the import confirm flow works end-to-end.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fetchWithRetry` | Project-local (`src/lib/fetch-with-retry.ts`) | CSRF injection + 401 refresh + retry logic | Every other mutation hook in the project already uses this |
| CSRF double-submit cookie | Custom (proxy.ts) | Sets `_csrf_token` cookie on all responses, validates `X-CSRF-Token` header on mutations | Already live in production via Phase 10 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ReadableStream` / `getReader()` | Browser native | SSE streaming from POST response body | Already used in `useConfirmImport` — no change needed |
| `@tanstack/react-query` | Project version | `useQueryClient` for cache invalidation | Already imported in `useConfirmImport` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fetchWithRetry` | Raw `fetch()` with manual CSRF header injection | Would satisfy the header requirement but lose the silent CSRF retry, 401 refresh, and rate limit handling that fetchWithRetry provides. Never do this — fetchWithRetry is the project standard. |
| Keeping raw `fetch()` | Adding manual `X-CSRF-Token` header injection inside `useConfirmImport` | This would close the CSRF gap at the hook level but duplicate logic from fetchWithRetry and violate the project pattern. Rejected. |

**Installation:** No new packages required. This phase uses only existing project infrastructure.

---

## Architecture Patterns

### Current Code (the bug)

```typescript
// src/hooks/use-import.ts, line 95 — CURRENT (incorrect)
const response = await fetch(
    `/api/guilds/${guildId}/accounts/import/confirm`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
        credentials: 'include',
    }
)
```

**Why this is wrong:** Raw `fetch()` does not inject `X-CSRF-Token`. The proxy middleware (`src/proxy.ts` line 127-137) validates CSRF on all `POST` requests to non-auth API routes. Without the header, the request gets 403 `EBADCSRFTOKEN`.

### Pattern 1: Standard Mutation Hook (fetchWithRetry)

**What:** All mutation hooks in the project call `fetchWithRetry` with POST/PUT/PATCH/DELETE, which automatically reads `_csrf_token` cookie and sets `X-CSRF-Token` header.

**When to use:** Every state-changing request from a React hook.

**Example from existing code (`use-exports.ts` line 33-39):**
```typescript
// Source: src/hooks/use-exports.ts (verified, production code)
const response = await fetchWithRetry(`/api/guilds/${guildId}/exports`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
}, { skipGlobalCooldown: true })
```

### Pattern 2: POST-SSE Streaming via fetchWithRetry

**What:** POST to SSE endpoint using `fetchWithRetry`, then stream `response.body` via `getReader()`. `fetchWithRetry` returns a standard `Response` object — `response.body` is a `ReadableStream` exactly as with raw `fetch()`.

**When to use:** Any POST request that returns a streaming `text/event-stream` body.

**The fix (what `useConfirmImport` should look like):**
```typescript
// Source: pattern from src/hooks/use-import.ts + src/lib/fetch-with-retry.ts analysis
const response = await fetchWithRetry(
    `/api/guilds/${guildId}/accounts/import/confirm`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
        credentials: 'include',
    }
)

// Everything below is UNCHANGED — response.body streaming works identically
if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    throw new Error(
        (errBody as { message?: string }).message || 'Failed to confirm import'
    )
}
// ... getReader() streaming loop unchanged
```

### Pattern 3: CSRF Token Flow (how it works end-to-end)

```
1. User loads page → proxy.ts middleware sets _csrf_token cookie (httpOnly: false)
2. useConfirmImport calls fetchWithRetry(url, { method: 'POST', ... })
3. fetchWithRetry reads _csrf_token from document.cookie via getCsrfToken()
4. fetchWithRetry sets X-CSRF-Token: <token> header before calling fetch()
5. proxy.ts CSRF validation: cookieToken === headerToken → passes
6. Route handler receives POST, pipes SSE stream to client
7. useConfirmImport streams response.body via getReader()
8. onProgress callbacks fire for each SSE event
```

### Anti-Patterns to Avoid

- **Direct `fetch()` for mutations:** Any hook that calls raw `fetch()` with POST/PUT/PATCH/DELETE bypasses CSRF injection. This is the exact bug being fixed.
- **Manual X-CSRF-Token injection:** Duplicates logic from fetchWithRetry. Use the wrapper instead.
- **Changing the SSE streaming loop:** The `response.body.getReader()` logic after the fetch call is correct and must not be modified. Only the fetch call itself changes.
- **Removing `credentials: 'include'`:** The option can stay; `fetchWithRetry` passes options through to `fetch()` at line 230 of `fetch-with-retry.ts`. Auth cookies are needed for the proxy route to validate the session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF header injection | Custom cookie reader + header setter in useConfirmImport | `fetchWithRetry` | Already exists, handles silent retry, rate limits, 401 refresh |
| CSRF silent retry | Re-implement GET-to-refresh + retry loop | `fetchWithRetry` (lines 251-268) | Already handles EBADCSRFTOKEN detection and retry |

**Key insight:** `fetchWithRetry` is not just a retry wrapper — it's the project's universal HTTP client that handles CSRF, 401 session refresh, rate limiting, and error toasts. Using raw `fetch()` for mutations intentionally opts out of all these behaviors.

---

## Common Pitfalls

### Pitfall 1: Believing POST-SSE Requires Raw fetch()

**What goes wrong:** Developer assumes `fetchWithRetry` interferes with streaming because it "might buffer the response." This is incorrect — `fetchWithRetry` returns the raw `Response` object from `fetch()` without modification. Streaming via `response.body.getReader()` works identically.

**Why it happens:** The Phase 13-02 plan explicitly stated "Cannot use EventSource (it's a POST endpoint). Use `fetch()` + `ReadableStream` parsing." This was correct about EventSource but incorrectly implied raw `fetch()` was required. `fetchWithRetry` is not EventSource — it wraps `fetch()` and returns its `Response`.

**How to avoid:** Verify that `fetchWithRetry` calls `return response` at the end of a successful fetch (confirmed: line 344 of `fetch-with-retry.ts`: `return response`). The response object flows through unchanged.

**Warning signs:** If `response.body` is null after using `fetchWithRetry`, that indicates a different problem (network error or response type mismatch), not a streaming incompatibility.

### Pitfall 2: 403 on First Load (Stale CSRF Token)

**What goes wrong:** If the `_csrf_token` cookie is absent or stale when the user triggers import confirm, the first request gets 403.

**Why it happens:** `fetchWithRetry` already handles this: the CSRF retry block (lines 251-268 in `fetch-with-retry.ts`) detects `EBADCSRFTOKEN`, makes a GET to `/api/auth/session` to refresh the cookie, waits 100ms, and retries. After the fix, the import confirm flow inherits this retry automatically.

**How to avoid:** No action required — this is handled by `fetchWithRetry` itself.

### Pitfall 3: Changing More Than Necessary

**What goes wrong:** Developer refactors `useConfirmImport` beyond the single-line fix, breaking the SSE streaming, error handling, or cache invalidation.

**Why it happens:** The function is complex (streaming loop, buffer management, error states). It's tempting to "improve" it while fixing the CSRF gap.

**How to avoid:** Change only the `fetch(` to `fetchWithRetry(` on line 95. Verify the import flow end-to-end. No other changes needed.

### Pitfall 4: Import Statement Missing

**What goes wrong:** `fetchWithRetry` is not imported in `use-import.ts`.

**Why it happens:** Looking at the file, `fetchWithRetry` IS already imported (line 6: `import { fetchWithRetry } from '@/lib/fetch-with-retry'`). It's used by `useImportTemplate` and `useImportPreview`. No import change needed.

---

## Code Examples

### The Complete Fix

```typescript
// File: src/hooks/use-import.ts
// Change ONLY line 95 — replace fetch( with fetchWithRetry(

// BEFORE (line 95-103):
const response = await fetch(
    `/api/guilds/${guildId}/accounts/import/confirm`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
        credentials: 'include',
    }
)

// AFTER:
const response = await fetchWithRetry(
    `/api/guilds/${guildId}/accounts/import/confirm`,
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
        credentials: 'include',
    }
)
```

No other changes to the file are required. `fetchWithRetry` is already imported at line 6.

### How CSRF Injection Works in fetchWithRetry

```typescript
// Source: src/lib/fetch-with-retry.ts (lines 219-229, verified)
// Inject CSRF token for mutation requests (not auth endpoints)
let requestOptions = options;
if (CSRF_METHODS.has(requestMethod) && !isAuthEndpoint(url)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        const headers = new Headers(options?.headers);
        headers.set('X-CSRF-Token', csrfToken);
        requestOptions = { ...options, headers };
    }
}
const response = await fetch(url, requestOptions);
```

`CSRF_METHODS` includes `'POST'` (line 31: `const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])`).
The import confirm URL (`/api/guilds/.../accounts/import/confirm`) is not an auth endpoint.
Therefore: `X-CSRF-Token` header is automatically injected.

### How the Proxy Validates CSRF

```typescript
// Source: src/proxy.ts (lines 127-137, verified)
if (isApiRoute && !isAuthRoute && isMutationMethod) {
    const cookieToken = request.cookies.get('_csrf_token')?.value;
    const headerToken = request.headers.get('X-CSRF-Token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json(
            { error: 'Invalid CSRF token', code: 'EBADCSRFTOKEN' },
            { status: 403 }
        );
    }
}
```

After the fix: `headerToken` will match `cookieToken` because `fetchWithRetry` reads the cookie and injects it as the header. The 403 bypass is closed.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `fetch()` in useConfirmImport | `fetchWithRetry()` with CSRF injection | Phase 14 (this phase) | Closes AUTH-03 gap for import confirm |
| All other mutation hooks | Already use `fetchWithRetry` | Phase 10 + 13 | No change needed |

**Deprecated/outdated:**
- Raw `fetch()` for mutations: Any direct `fetch()` call with POST/PUT/PATCH/DELETE in a hook is now an antipattern in this codebase. All such calls should use `fetchWithRetry`.

---

## Open Questions

None. This is a well-defined, isolated fix with high-confidence analysis.

1. **Does `fetchWithRetry` interfere with SSE streaming?**
   - What we know: `fetchWithRetry` returns the raw `Response` object from `fetch()` at line 344 (`return response`). The `response.body` is a `ReadableStream<Uint8Array>` as returned by the browser's Fetch API.
   - What's unclear: Nothing — this is confirmed by code inspection.
   - Recommendation: Change `fetch(` to `fetchWithRetry(` and test the streaming flow.

2. **Will the CSRF silent retry break streaming?**
   - What we know: The CSRF retry in `fetchWithRetry` (lines 251-268) fires on 403 with EBADCSRFTOKEN, then issues a `continue` to retry the request loop. On the second attempt (with fresh CSRF token), it returns the SSE response normally. The streaming occurs AFTER the response is returned — the retry logic only applies to the initial connection.
   - What's unclear: Nothing — the retry happens before any streaming begins.
   - Recommendation: No concern here. The fix is safe.

---

## Sources

### Primary (HIGH confidence)

- `src/lib/fetch-with-retry.ts` — Full source code inspection; confirmed CSRF injection at lines 219-229, CSRF retry at lines 251-268, response passthrough at line 344
- `src/proxy.ts` — Full source code inspection; confirmed CSRF validation at lines 127-137, `_csrf_token` cookie set at line 200
- `src/hooks/use-import.ts` — Full source code inspection; confirmed raw `fetch()` at line 95, `fetchWithRetry` already imported at line 6, SSE streaming loop at lines 116-154

### Secondary (MEDIUM confidence)

- `src/hooks/use-exports.ts` — Pattern reference; confirmed `fetchWithRetry` with POST at line 33 for a non-streaming mutation, demonstrating the wrapper works for POST
- `.planning/phases/13-alert-import-management/13-02-PLAN.md` — Historical context on why raw `fetch()` was used (EventSource confusion), confirms the gap was introduced intentionally but incorrectly
- `.planning/phases/10-frontend-security-hardening/10-01-PLAN.md` — Confirms CSRF implementation decisions: double-submit cookie, silent retry, EBADCSRFTOKEN code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — fetchWithRetry is the project-standard wrapper; CSRF pattern is fully implemented and verified in code
- Architecture: HIGH — The fix is a one-line change; all surrounding code (import, streaming loop, error handling) is verified correct
- Pitfalls: HIGH — All pitfalls derived from direct code inspection, not speculation

**Research date:** 2026-02-22
**Valid until:** Stable until `src/lib/fetch-with-retry.ts` or `src/proxy.ts` CSRF logic changes (no near-term risk)
