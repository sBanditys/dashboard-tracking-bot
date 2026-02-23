# Phase 21: CSRF HMAC Signing - Research

**Researched:** 2026-02-23
**Domain:** Web Crypto API (crypto.subtle), Next.js middleware (Edge Runtime), CSRF token HMAC signing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Token rotation:** Regenerate HMAC token on every request (per-request, matches current per-request UUID behavior)
- **Middleware validation:** Keep existing double-submit cookie check in middleware (belt-and-suspenders); middleware fast-fails tampered requests before backend
- **CSRF failure UX:** On 403 CSRF error: silently auto-retry once with fresh CSRF token; no toast during retry; if retry fails: show persistent error toast ("user must refresh and try again"); 1 retry maximum
- **Deploy coordination:** Ship HMAC tokens immediately — no feature flag or env toggle; backend dual-check mode accepts both old (UUID) and new (HMAC) tokens during transition
- **Backend forwarding:** API route handlers forward the HMAC-signed token in `X-CSRF-Token` header when proxying to backend; applies to all routes that currently forward the plain CSRF token (e.g. refresh endpoint in proxy.ts)
- **Missing secret fallback:** If `INTERNAL_API_SECRET` is not set, fall back to plain UUID tokens; no warning or failure — graceful degradation
- **Logging:** Silent — no logging for normal HMAC generation; only log on actual errors

### Claude's Discretion

- Token expiry window (whether to embed timestamp, and if so, what TTL)
- Session binding strategy (whether to include user/session data in the signed payload or just sign a random nonce)
- Error message wording for persistent CSRF failure toast (match existing app toast patterns)
- HMAC algorithm choice and token format

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Proxy layer generates HMAC-signed CSRF tokens using `crypto.subtle` and `INTERNAL_API_SECRET` for server-to-server mutations, matching backend Phase 37 HMAC validation | Backend csrf.ts contract fully documented; crypto.subtle HMAC generation verified; token format confirmed as `randomValue.hmac` (129 chars); key secret alignment issue identified and resolved below |
</phase_requirements>

## Summary

The backend CSRF middleware (`csrf.ts`) already implements full HMAC validation using `CSRF_HMAC_SECRET` (not `INTERNAL_API_SECRET`). The token format is `randomValue.hmac` — a 64-char hex random value, a dot separator, and a 64-char hex HMAC-SHA-256 signature over the payload `jti:randomValue`. The dashboard proxy (`src/proxy.ts`) runs as Next.js middleware and has access to the global `crypto.subtle` Web Crypto API, which is available in both Edge Runtime and Node.js 22.

The `crypto.subtle` approach works directly in `proxy.ts` without imports. The key difference from `crypto.randomUUID()` (currently used) is that `generateHmacToken` is `async` — which requires `setCsrfCookie` to become an async operation, and the call at line 203 to `await` it. JTI extraction (for session binding) parses the `auth_token` cookie — the dashboard's local name for the access token — using `atob()` or `Buffer.from(..., 'base64')`, both available in the middleware runtime.

**Critical discovery:** The CONTEXT.md refers to `INTERNAL_API_SECRET` as the env var for HMAC signing, but the backend uses `CSRF_HMAC_SECRET` (a separate, dedicated secret). These are distinct keys with different purposes: `INTERNAL_API_SECRET` authenticates server-to-server identity via `X-Internal-Secret` header; `CSRF_HMAC_SECRET` binds CSRF tokens to session JTIs. The dashboard must use `CSRF_HMAC_SECRET` to match backend validation — or interpret the CONTEXT.md instruction as "use whichever env var name is configured," treating `INTERNAL_API_SECRET` as the dashboard-side alias for the shared secret. See Open Questions.

**Primary recommendation:** Implement `generateHmacCsrfToken(secret, jti)` as an async function using `crypto.subtle`, reading `process.env.CSRF_HMAC_SECRET` (with fallback to `process.env.INTERNAL_API_SECRET` and then UUID). Extract JTI from the `auth_token` cookie. Both token generation and JTI extraction are pure TypeScript operations with no new dependencies.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crypto.subtle` (global) | Web Crypto API (built-in) | HMAC-SHA256 signing | Available globally in Next.js middleware Edge Runtime and Node.js 22; no imports needed; spec-compliant |
| `crypto.getRandomValues` (global) | Web Crypto API (built-in) | Cryptographic random bytes | Edge Runtime compatible; replaces `crypto.randomBytes` (Node.js only) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Buffer` (global in Node.js) | Built-in | base64url decode for JTI extraction | Available in middleware — `Buffer.from(base64, 'base64').toString('utf-8')` |
| `atob` (global) | Built-in | base64 decode (alternative to Buffer) | Also available in middleware; simpler for basic base64 without url-safe handling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.subtle` (async) | `node:crypto` `createHmac` | `node:crypto` is NOT available in Next.js Edge Runtime; `crypto.subtle` is the correct cross-runtime API |
| `crypto.getRandomValues` | `crypto.randomBytes` | `randomBytes` is Node.js specific; `getRandomValues` works in both Edge Runtime and Node.js |

**Installation:** No new npm packages required. This is a zero-dependency implementation.

## Architecture Patterns

### Recommended Project Structure

The change is surgical — only `src/proxy.ts` needs modification. No new files required.

```
src/
├── proxy.ts        # Add generateHmacCsrfToken(), update setCsrfCookie() to async
└── (no new files)
```

### Pattern 1: HMAC Token Generation with crypto.subtle

**What:** Async function generating `randomValue.hmac` token matching backend contract
**When to use:** Called in `proxy.ts` wherever `crypto.randomUUID()` is currently used for CSRF

```typescript
// Source: Verified against backend /api/src/middleware/csrf.ts lines 85-94
const CSRF_HMAC_SECRET = process.env.CSRF_HMAC_SECRET
  || process.env.INTERNAL_API_SECRET
  || '';

async function generateHmacCsrfToken(jti: string | null): Promise<string> {
  // Generate 32 random bytes as 64-char hex string
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomValue = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (!jti || !CSRF_HMAC_SECRET) {
    // No session or no HMAC key — fall back to plain random token (UUID compat)
    return randomValue;
  }

  // HMAC-SHA256 over "jti:randomValue" — matches backend generateHmacCsrfToken()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CSRF_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const payload = `${jti}:${randomValue}`;
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  const hmac = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${randomValue}.${hmac}`;
}
```

### Pattern 2: JTI Extraction from auth_token Cookie

**What:** Extract JTI from the dashboard's `auth_token` cookie (JWT access token) for session binding
**When to use:** Before calling `generateHmacCsrfToken()` in proxy middleware

```typescript
// Source: Mirrors backend csrf.ts extractJtiFromAccessToken() — lines 65-78
// Dashboard cookie name is 'auth_token', not 'dashboard_at'
function extractJtiFromAuthToken(request: NextRequest): string | null {
  const tokenValue = request.cookies.get('auth_token')?.value;
  if (!tokenValue) return null;
  try {
    const parts = tokenValue.split('.');
    if (parts.length !== 3) return null;
    // base64url decode: replace URL-safe chars before decoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      Buffer.from(base64, 'base64').toString('utf-8')
    ) as { jti?: string };
    return typeof payload.jti === 'string' ? payload.jti : null;
  } catch {
    return null;
  }
}
```

### Pattern 3: Async setCsrfCookie Integration

**What:** Update the existing synchronous `setCsrfCookie()` call to async HMAC generation
**When to use:** Line 203 of proxy.ts — `setCsrfCookie(response, crypto.randomUUID())`

```typescript
// Current (line 203 in proxy.ts):
setCsrfCookie(response, crypto.randomUUID());

// New pattern — extract JTI then await token generation:
const jti = extractJtiFromAuthToken(request);
const csrfToken = await generateHmacCsrfToken(jti);
setCsrfCookie(response, csrfToken);
```

The `proxy` function is already `async` (line 113), so `await` works without signature changes.

### Pattern 4: Backend Token Format Contract

**What:** The exact format the backend expects (from `generateHmacCsrfToken` in csrf.ts)
**Source:** `/Users/gabrielleal/Desktop/Tracking Data Bot/api/src/middleware/csrf.ts` lines 85-94

```
Token = randomValue + "." + hmac

Where:
  randomValue = 64-char hex string (32 random bytes)
  hmac = HMAC-SHA256(key=CSRF_HMAC_SECRET, message="jti:randomValue")
         as 64-char hex string

Total token length = 64 + 1 + 64 = 129 chars

Backend validation (validateHmacCsrfToken):
  1. Split on first "." — if no dot, reject (legacy plain token)
  2. If no jti or no CSRF_HMAC_SECRET, return false
  3. Recompute expectedHmac = HMAC-SHA256(CSRF_HMAC_SECRET, "jti:randomPart")
  4. timing-safe compare(expectedHmac, hmacPart)
```

### Anti-Patterns to Avoid

- **`import { createHmac } from 'crypto'` or `import { createHmac } from 'node:crypto'`:** Node.js `crypto` module is unavailable in Next.js Edge Runtime. Use `crypto.subtle` (global Web Crypto) instead.
- **Synchronous HMAC:** Web Crypto API is async-only. Any attempt to make it synchronous will fail.
- **Key caching without proper scope:** Do NOT cache the `CryptoKey` object in module scope for multiple different secrets — key import is fast (~1ms) and re-importing per request is safe.
- **Using `INTERNAL_API_SECRET` without fallback check:** The backend uses `CSRF_HMAC_SECRET`; the dashboard must use the same secret value. If both env vars are set, prefer `CSRF_HMAC_SECRET`.
- **Skipping double-submit check when HMAC is present:** The decision is belt-and-suspenders — keep BOTH the existing middleware double-submit check AND the new HMAC validation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing-safe comparison | Custom string comparison | Backend already handles this (timing-safe comparison of cookie vs header) | The middleware double-submit cookie check compares strings — this is fine because the HMAC adds cryptographic security. Timing-safe comparison only matters when secrets are directly compared, which the backend handles. |
| Token parsing | Custom regex parser | Simple string split on `.` (first occurrence) — matches backend exactly | Backend uses `token.indexOf('.')` to find dot, not regex. |
| Hex encoding | Custom Uint8Array → hex | `Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')` | Standard pattern; matches what backend produces with `digest('hex')` |

**Key insight:** The HMAC implementation is intentionally minimal. The token is a one-time-use random nonce with a session binding signature — not a JWT, not a stateful session ID. The entire signing logic fits in ~15 lines.

## Common Pitfalls

### Pitfall 1: Wrong Secret Variable Name

**What goes wrong:** Dashboard generates HMAC with `INTERNAL_API_SECRET` but backend validates with `CSRF_HMAC_SECRET` — tokens always fail HMAC check.
**Why it happens:** CONTEXT.md uses `INTERNAL_API_SECRET` as the env var name; backend uses `CSRF_HMAC_SECRET`. These are different secrets with different purposes.
**How to avoid:** Read `CSRF_HMAC_SECRET` first, fall back to `INTERNAL_API_SECRET`. In production, both env vars must be set to the same value. Add a comment explaining the mapping.
**Warning signs:** All authenticated mutations return 403 with "CSRF token is not bound to the current session" when `CSRF_HMAC_SECRET` is set in backend but `INTERNAL_API_SECRET` is used in dashboard.

### Pitfall 2: Cookie Name Mismatch for JTI Extraction

**What goes wrong:** Dashboard extracts JTI from wrong cookie — gets `null`, falls back to plain UUID token, fails backend HMAC check when session is present.
**Why it happens:** Dashboard stores the access token as `auth_token` (local name); backend reads `DASHBOARD_ACCESS_COOKIE_NAME` (`dashboard_at`). These are different names for the same token in different contexts.
**How to avoid:** In `proxy.ts`, extract JTI from `request.cookies.get('auth_token')?.value` (the cookie set by the refresh handler at line 186). Do NOT read `dashboard_at` — that cookie is the backend-side name forwarded to backend calls.
**Warning signs:** HMAC tokens are generated as plain randomValue (no dot) even when user is logged in. Check that `extractJtiFromAuthToken(request)` returns non-null for authenticated requests.

### Pitfall 3: Key Import on Every Request (Performance)

**What goes wrong:** Calling `crypto.subtle.importKey()` every request adds ~1ms overhead. In testing, this is negligible but should be understood.
**Why it happens:** `crypto.subtle` is async and has no built-in key caching per-request. The key object must be recreated each call since the function runs in middleware.
**How to avoid:** Module-level key caching is acceptable IF the secret never rotates between deploys. For simplicity and correctness under secret rotation, importing per-request is safe. Performance impact is ~0.5-1ms per request (verified acceptable for middleware).
**Warning signs:** If profiling shows middleware latency spike, consider module-scope lazy key caching with a closure.

### Pitfall 4: Backend CSRF Bypass for Bearer Auth Requests

**What goes wrong:** Assuming that all dashboard-to-backend API calls need HMAC CSRF tokens. In fact, `requireCsrfForDashboardCookieAuth` skips CSRF entirely when `Authorization: Bearer` is present.
**Why it happens:** `backendFetch` auto-injects `Authorization: Bearer auth_token` for SSR calls. These bypass CSRF on the backend (`hasBearerAuthorization` check at line 398 of csrf.ts).
**Impact on this phase:** Only the `refreshTokensFromMiddleware` function in `proxy.ts` (lines 31-97) makes direct backend calls from middleware context without going through `backendFetch`. This is the ONLY place where the CSRF cookie/header forwarding matters for backend-facing calls from middleware.
**How to avoid:** Understand the two layers: (1) Dashboard proxy middleware generates the CSRF token and sets the cookie — this is the main change. (2) Client-side fetch sends cookie value in `X-CSRF-Token` header — this is unchanged. (3) Backend API calls from SSR context via `backendFetch` bypass CSRF via Bearer auth.

### Pitfall 5: Double-Submit Validation Still Required

**What goes wrong:** Removing the existing double-submit cookie check in proxy middleware because "HMAC is more secure."
**Why it happens:** Assuming HMAC replaces double-submit.
**How to avoid:** The decision is explicit: keep both. Middleware still validates `cookieToken === headerToken` at line 134. HMAC adds a second layer (session binding). Both checks stay.

### Pitfall 6: async Required Throughout Call Chain

**What goes wrong:** `generateHmacCsrfToken()` is async, but existing `setCsrfCookie()` calls assume synchronous token generation.
**Why it happens:** Current code at line 203: `setCsrfCookie(response, crypto.randomUUID())` — synchronous. New code needs `await generateHmacCsrfToken(jti)`.
**How to avoid:** `proxy` is already `async function proxy(request: NextRequest)` — just add `await`. No wrapper changes needed. There is only ONE call site for CSRF cookie generation (line 203).

## Code Examples

Verified patterns from official sources and codebase inspection:

### Complete generateHmacCsrfToken Implementation

```typescript
// Source: Pattern derived from backend csrf.ts (generateHmacCsrfToken, lines 85-94)
// Uses crypto.subtle (global Web Crypto API — available in Edge Runtime and Node.js 22)

// Prefer CSRF_HMAC_SECRET (backend's key name) with fallback to INTERNAL_API_SECRET (dashboard alias)
const CSRF_HMAC_SECRET = (process.env.CSRF_HMAC_SECRET || process.env.INTERNAL_API_SECRET || '').trim();

async function generateHmacCsrfToken(jti: string | null): Promise<string> {
  // 32 random bytes = 64 hex chars (matches backend CSRF_TOKEN_LENGTH = 32)
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const randomValue = Array.from(rawBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (!jti || !CSRF_HMAC_SECRET) {
    // Fallback: plain random token when no session or no secret configured
    // Backend accepts this as it gates HMAC check on (jti && CSRF_HMAC_SECRET)
    return randomValue;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(CSRF_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${jti}:${randomValue}`)
  );

  const hmac = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${randomValue}.${hmac}`;
}
```

### JTI Extraction from auth_token Cookie

```typescript
// Source: Mirrors backend extractJtiFromAccessToken (csrf.ts lines 65-78)
// Key difference: reads 'auth_token' (dashboard local name), not 'dashboard_at' (backend name)
function extractJtiFromAuthToken(request: NextRequest): string | null {
  const tokenValue = request.cookies.get('auth_token')?.value;
  if (!tokenValue) return null;
  try {
    const parts = tokenValue.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(
      Buffer.from(base64, 'base64').toString('utf-8')
    ) as { jti?: string };
    return typeof payload.jti === 'string' ? payload.jti : null;
  } catch {
    return null;
  }
}
```

### Updated proxy.ts Call Site (line 203)

```typescript
// Before (synchronous, line 203):
setCsrfCookie(response, crypto.randomUUID());

// After (async HMAC):
const jti = extractJtiFromAuthToken(request);
const csrfToken = await generateHmacCsrfToken(jti);
setCsrfCookie(response, csrfToken);
```

### Refreshed Token Forwarding in refreshTokensFromMiddleware (lines 69-74)

```typescript
// The refresh endpoint call in proxy.ts forwards the csrf_token cookie
// After the cookie is set as HMAC-signed, this forwarding is unchanged:
const csrfToken = request.cookies.get('csrf_token')?.value;
if (csrfToken) {
  fetchHeaders['X-CSRF-Token'] = csrfToken;
  cookieParts.push(`csrf_token=${encodeURIComponent(csrfToken)}`);
}
// No change needed here — it forwards whatever is in the cookie already
```

### 403 CSRF Retry (already implemented in fetch-with-retry.ts lines 303-320)

```typescript
// ALREADY IMPLEMENTED — no change needed
// fetch-with-retry.ts already handles CSRF 403 retry:
if (response.status === 403 && !didRetryAfterCsrf && !isAuthEndpoint(url)) {
  // Fetches /api/auth/session (GET) to trigger middleware to refresh CSRF cookie
  await fetch('/api/auth/session', { method: 'GET', credentials: 'include' });
  await sleep(100);
  didRetryAfterCsrf = true;
  continue;
}
// If retry fails: shows 'Session error, please refresh the page' toast
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `crypto.randomUUID()` (UUID token) | `crypto.subtle` HMAC-signed token | Phase 21 | Tokens are session-bound — a stolen cookie cannot forge a valid CSRF token without the HMAC secret |
| Double-submit only (cookie === header) | Double-submit + HMAC session binding | Phase 21 | Defense in depth: middleware validates equality; backend validates cryptographic binding |
| `node:crypto` for HMAC (server-side only) | `crypto.subtle` Web Crypto API | Next.js Edge Runtime requirement | Works in both Edge Runtime and Node.js; future-proof for CDN edge deployment |

**Deprecated/outdated:**
- `crypto.randomUUID()` for CSRF token generation: still valid for nonces, but replaced for CSRF by HMAC signing
- Plain double-submit without session binding: remains in middleware as belt-and-suspenders, supplemented by HMAC

## Open Questions

1. **Secret variable name: `INTERNAL_API_SECRET` vs `CSRF_HMAC_SECRET`**
   - What we know: Backend uses `CSRF_HMAC_SECRET` exclusively for CSRF HMAC. Dashboard's CONTEXT.md says to use `INTERNAL_API_SECRET`. The two serve different purposes in the backend (`INTERNAL_API_SECRET` = X-Internal-Secret service auth; `CSRF_HMAC_SECRET` = CSRF JTI binding).
   - What's unclear: Was CONTEXT.md intending `INTERNAL_API_SECRET` to be a shared key that serves both purposes, or was it an error? In the current backend code they are distinct secrets.
   - Recommendation: Read `CSRF_HMAC_SECRET` first, fall back to `INTERNAL_API_SECRET`. This honors the CONTEXT.md locked decision while also working correctly when `CSRF_HMAC_SECRET` is properly configured. Add a clear comment: `// CSRF_HMAC_SECRET must match backend's CSRF_HMAC_SECRET env var`. The planner should use `CSRF_HMAC_SECRET` as the primary env var in the implementation.

2. **Token expiry window / timestamp embedding**
   - What we know: This is left to Claude's Discretion. The backend does NOT embed a timestamp in its HMAC token — it's a pure `randomValue.hmac` format with no expiry. Per-request regeneration means tokens are single-use (the cookie overwrites the previous one on each response).
   - What's unclear: Whether adding a timestamp provides meaningful security given per-request rotation.
   - Recommendation: Do NOT embed a timestamp. Match the backend's exact token format (`randomValue.hmac`). Adding a timestamp would require backend changes to parse it, and the per-request rotation already minimizes the replay window to the duration of a single request cycle.

3. **Session binding when user is not logged in (no auth_token cookie)**
   - What we know: `extractJtiFromAuthToken` returns `null` when no auth_token cookie exists. `generateHmacCsrfToken(null)` returns a plain randomValue (no dot). Backend skips HMAC check when `jti` is null. This is the correct behavior for unauthenticated pages.
   - Recommendation: This is handled correctly by the fallback logic. No action needed.

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — Validation Architecture section omitted per instructions.

## Sources

### Primary (HIGH confidence)

- `/Users/gabrielleal/Desktop/Tracking Data Bot/api/src/middleware/csrf.ts` — Complete backend CSRF HMAC contract; token format `randomValue.hmac`; `generateHmacCsrfToken`, `validateHmacCsrfToken` implementations; secret env var = `CSRF_HMAC_SECRET`
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/proxy.ts` — Current proxy.ts with `setCsrfCookie`, double-submit check, `INTERNAL_SECRET` = `process.env.INTERNAL_API_SECRET`, all async-compatible
- `/Users/gabrielleal/Desktop/dashboard-tracking-bot/src/lib/fetch-with-retry.ts` — 403 CSRF retry already implemented (lines 303-334); no changes needed to fetch-with-retry
- Node.js 22 REPL verification: `crypto.subtle.importKey` + `crypto.subtle.sign` produce correct 129-char `randomValue.hmac` tokens

### Secondary (MEDIUM confidence)

- Context7 `/vercel/next.js` — Edge Runtime limitations documented; `crypto.subtle` available globally in middleware; `node:crypto` module NOT available in Edge Runtime
- `/Users/gabrielleal/Desktop/Tracking Data Bot/api/src/middleware/internalAuth.ts` — Confirms `INTERNAL_API_SECRET` is for X-Internal-Secret service auth, separate from CSRF signing

### Tertiary (LOW confidence)

- None — all critical claims verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by codebase inspection and live Node.js testing
- Architecture: HIGH — token format verified against backend source; crypto.subtle API tested
- Pitfalls: HIGH — all pitfalls derived from actual code discrepancies found during research

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (stable domain — backend contract unlikely to change)
