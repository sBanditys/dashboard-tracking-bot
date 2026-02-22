# Phase 16: Restore Next.js Middleware (Undo Regression) - Research

**Researched:** 2026-02-22
**Domain:** Next.js 16 middleware/proxy file conventions, CSRF cookies, CSP headers, auth redirects
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rename `src/proxy.ts` back to `src/middleware.ts`
- Rename `export async function proxy` to `export async function middleware`
- No logic changes needed — the existing code already implements all required functionality
- Verify Next.js middleware activates by checking CSRF cookie, CSP header, and auth redirects

### Claude's Discretion
- Whether to consolidate any repetitive header-setting patterns during the rename (minor cleanup only)
- Verification approach (manual checks vs automated tests)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | All frontend mutation requests include CSRF token via double-submit cookie pattern | `proxy.ts` already implements full CSRF double-submit logic (cookie issuance + header validation). The file just needs to be named `middleware.ts` with `export function middleware` per the locked decision. |
| AUTH-04 | Dashboard serves Content-Security-Policy headers preventing XSS vectors | `buildCspHeader()` + `getSecurityHeaders()` are already implemented in `src/lib/server/security-headers.ts` and imported in `proxy.ts`. Rename activates them on all page responses. |
</phase_requirements>

---

## Summary

**CRITICAL FINDING: The premise in CONTEXT.md contains a factual error.** The milestone audit (`v1.1-MILESTONE-AUDIT.md`) concluded that renaming `middleware.ts` to `proxy.ts` broke Next.js middleware by citing only `MIDDLEWARE_FILENAME = 'middleware'` in `node_modules/next/dist/lib/constants.js:272`. However, the same file also defines `PROXY_FILENAME = 'proxy'` at line 274, and the Next.js 16 build system's `isMiddlewareFilename()` function accepts BOTH names. In Next.js 16.1.6 (the actually installed version), `src/proxy.ts` with `export function proxy` is the canonical, actively-supported convention — not a regression. The old `src/middleware.ts` convention is deprecated but still functional in this version.

Despite this, the locked decision in CONTEXT.md is to rename `proxy.ts` back to `middleware.ts`. This rename will work correctly in Next.js 16.1.6 because both file conventions are supported — it will simply produce a deprecation warning in the console. The existing logic in `proxy.ts` is complete and correct; no logic changes are needed.

The E2E tests in `e2e/csrf-cookie.spec.ts`, `e2e/security-headers.spec.ts`, and `e2e/auth-redirect.spec.ts` are all written to test observable behavior (cookies, response headers, redirects) — they will pass regardless of whether the file is named `middleware.ts` or `proxy.ts`, as long as the file runs. The primary verification goal is to confirm the middleware executes for all matched routes.

**Primary recommendation:** Execute the rename exactly as locked (`proxy.ts` → `middleware.ts`, `proxy` → `middleware` export), run the existing E2E tests, and document the actual Next.js 16 behavior accurately in the phase summary.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (installed) | App framework / middleware execution | Project's framework; middleware/proxy is a built-in feature |
| Playwright | (installed, see package.json) | E2E verification of headers/cookies | Already used in Phase 15 E2E tests; no new installation needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/server` (NextRequest, NextResponse) | Built-in | Middleware/proxy request handling | All middleware logic already uses these |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rename to `middleware.ts` (locked) | Keep `proxy.ts` | `proxy.ts` is the correct Next.js 16 convention; renaming to `middleware.ts` produces a deprecation warning but works. The locked decision takes precedence. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── middleware.ts     # (renamed from proxy.ts) — request interception for CSRF/CSP/auth
├── app/              # Next.js App Router pages and API routes
├── lib/
│   └── server/
│       └── security-headers.ts  # buildCspHeader() + getSecurityHeaders() utilities
└── ...
```

### Pattern 1: Next.js 16 Middleware/Proxy File Convention

**What:** Next.js 16 supports two file conventions for request interception:
1. `proxy.ts` with `export function proxy` — the **new canonical** convention (Node.js runtime only, no edge runtime support)
2. `middleware.ts` with `export function middleware` — the **deprecated but still functional** convention

Both are recognized by `isMiddlewareFilename()` in `node_modules/next/dist/build/utils.js:241`:
```javascript
// Source: node_modules/next/dist/build/utils.js:241-243
function isMiddlewareFilename(file) {
    return file === MIDDLEWARE_FILENAME         // 'middleware'
        || file === `src/${MIDDLEWARE_FILENAME}` // 'src/middleware'
        || file === PROXY_FILENAME               // 'proxy'
        || file === `src/${PROXY_FILENAME}`;     // 'src/proxy'
}
```

**When to use:** Either convention works in Next.js 16.1.6. `proxy.ts` is preferred going forward to avoid deprecation warnings.

**Example (locked decision — what will be implemented):**
```typescript
// Source: Next.js 16 upgrading docs (deprecated but functional convention)
// File: src/middleware.ts

export async function middleware(request: NextRequest) {
  // ... existing proxy.ts logic, unchanged ...
}

export const config = {
  matcher: [
    {
      source: '/((?!legal|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```

### Pattern 2: CSRF Double-Submit Cookie

**What:** On every response, middleware sets a random `_csrf_token` cookie (not `httpOnly`, so client JS can read it). Mutation API requests must include `X-CSRF-Token: <value>` header matching the cookie.

**Already implemented** in `src/proxy.ts`:
```typescript
// setCsrfCookie — sets on every response
response.cookies.set('_csrf_token', crypto.randomUUID(), {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: false,   // Client JS must read the token
  path: '/',
});

// Validation — on API mutation routes (excluding auth + csp-report)
if (isApiRoute && !isAuthRoute && !isCspReportRoute && isMutationMethod) {
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

### Pattern 3: CSP Nonce Injection

**What:** Per-request random nonce is generated, injected into the CSP header, and forwarded to the page via `x-nonce` request header. Page components read this header to attach `nonce` to `<script>` tags.

**Already implemented** in `src/proxy.ts`:
```typescript
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
// Injected as request header for page components to read
requestHeaders.set('x-nonce', nonce);
requestHeaders.set('Content-Security-Policy', buildCspHeader(nonce));
// Set on response
response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
```

Note: `Buffer.from()` is Node.js API — safe only because `proxy.ts` always runs on Node.js runtime (unlike the deprecated `middleware.ts` which could run on Edge). This is a semantic advantage of the `proxy.ts` convention.

### Pattern 4: Auth Redirect

**What:** Unauthenticated requests to dashboard routes redirect to `/?returnTo=/path` (not directly to `/login`) to avoid infinite redirect loops with the landing page.

**Already implemented** in `src/proxy.ts`:
```typescript
const isDashboardRoute = pathname.startsWith('/dashboard')
  || pathname.startsWith('/guilds')
  || pathname.startsWith('/settings');

if (isDashboardRoute && !hasSessionCookie) {
  const landingUrl = new URL('/', request.url);
  if (pathname !== '/') {
    landingUrl.searchParams.set('returnTo', pathname);
  }
  return NextResponse.redirect(landingUrl);
}
```

### Anti-Patterns to Avoid

- **Using `export default` instead of named export:** Next.js 16 checks for named `middleware` export when file is `middleware.ts`. Default export also works but named export is more explicit and matches the docs.
- **Adding `export const runtime = 'nodejs'`:** `proxy.ts` ignores route segment config (throws error if you try). `middleware.ts` historically ran on edge; if you want to explicitly force nodejs, this was done via `export const config = { runtime: 'nodejs' }` in older Next.js. In Next.js 16, proxy always runs nodejs and `runtime` config is disallowed in proxy files.
- **Applying CSP to API routes:** The existing code correctly skips `Content-Security-Policy` for API routes (JSON responses don't need CSP). Keep this pattern.
- **Applying `Cache-Control: no-store` to API routes:** Only page routes with session cookies get this header. Already correct in existing code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF token generation | Custom entropy/hash logic | `crypto.randomUUID()` | Already used; Web Crypto API is available in all Next.js runtimes |
| Header forwarding to page components | Custom state mechanism | `NextResponse.next({ request: { headers: requestHeaders } })` | Standard Next.js pattern for passing request-scoped data to pages |
| Security header content | Custom header strings | Existing `buildCspHeader()` + `getSecurityHeaders()` in `src/lib/server/security-headers.ts` | Already implemented correctly; don't duplicate |

**Key insight:** All the complex logic already exists in `src/proxy.ts`. This phase is purely a rename operation — the only code change is the function name.

---

## Common Pitfalls

### Pitfall 1: Assuming the rename "fixes" broken middleware
**What goes wrong:** The CONTEXT.md and milestone audit claim `proxy.ts` never executed. This is factually incorrect for Next.js 16.1.6.
**Why it happens:** The audit only read `MIDDLEWARE_FILENAME = 'middleware'` in `constants.js:272` and missed `PROXY_FILENAME = 'proxy'` at line 274. Both are accepted by `isMiddlewareFilename()`.
**How to avoid:** After the rename, the behavior should be IDENTICAL to current behavior. If E2E tests are currently passing (with `proxy.ts`), they will continue to pass with `middleware.ts`.
**Warning signs:** If E2E tests pass before the rename but fail after, that signals a real problem introduced during rename (e.g., a copy error in the function body).

### Pitfall 2: Next.js 16 deprecation warning treated as an error
**What goes wrong:** Renaming to `middleware.ts` causes Next.js 16 to emit a console warning: `"The 'middleware' file convention is deprecated. Please use 'proxy' instead."` (from `build/index.js:611`).
**Why it happens:** Next.js 16 supports `middleware.ts` for backward compatibility but treats it as deprecated.
**How to avoid:** This is expected behavior. The warning does not prevent execution. Document it in the phase summary.
**Warning signs:** The deprecation warning appearing in dev output is normal; it does not indicate middleware is inactive.

### Pitfall 3: Both files existing simultaneously
**What goes wrong:** If both `src/middleware.ts` and `src/proxy.ts` exist, Next.js 16 throws a build error.
**Why it happens:** From `build/index.js:605`: `"Both middleware file... and proxy file... are detected. Please use proxy file only."`
**How to avoid:** The rename must be atomic — rename/move, do not copy. Delete (or git-rename) `proxy.ts` to `middleware.ts` in a single step.
**Warning signs:** Build error mentioning both file names.

### Pitfall 4: The `Buffer.from()` call and Node.js runtime
**What goes wrong:** `Buffer.from(crypto.randomUUID()).toString('base64')` is a Node.js API. If this ran on Edge runtime it would fail.
**Why it happens:** `Buffer` is not in the Web Crypto / Edge runtime.
**How to avoid:** `middleware.ts` historically ran on Edge by default in older Next.js versions. In Next.js 16, the deprecated `middleware.ts` convention still runs on Node.js (the same runtime as `proxy.ts`). The `Buffer` call is safe. No changes needed.
**Warning signs:** Runtime error about `Buffer is not defined` — would only occur if somehow edge runtime was forced (it cannot be with `proxy.ts`, and it won't be with `middleware.ts` in Next.js 16 either).

---

## Code Examples

### The Rename Operation

```bash
# In project root — atomic git rename preserving history
git mv src/proxy.ts src/middleware.ts
```

### Function Signature Change (the only code edit)
```typescript
// Before (src/proxy.ts)
export async function proxy(request: NextRequest) {

// After (src/middleware.ts)
export async function middleware(request: NextRequest) {
```

**Everything else in the file stays identical.**

### E2E Verification via Existing Tests

The existing Playwright tests cover all success criteria:

```typescript
// e2e/csrf-cookie.spec.ts — verifies AUTH-03
// Checks: _csrf_token cookie set, UUID format, rotates per request, 403 without token
test('_csrf_token cookie set on page load', async ({ page, context }) => {
  await page.goto('/login');
  const cookies = await context.cookies();
  const csrfCookie = cookies.find(c => c.name === '_csrf_token');
  expect(csrfCookie).toBeDefined();
});

// e2e/security-headers.spec.ts — verifies AUTH-04
// Checks: CSP header present, nonce-based, strict-dynamic, per-request nonce rotation
test(`CSP header present on /login`, async ({ page }) => {
  const response = await page.goto('/login', { waitUntil: 'commit' });
  const csp = response?.headers()['content-security-policy'];
  expect(csp).toBeDefined();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain('nonce-');
  expect(csp).toContain("'strict-dynamic'");
});

// e2e/auth-redirect.spec.ts — verifies auth redirect SSR behavior
test('unauthenticated user on /guilds redirects to /?returnTo=/guilds', async ({ request }) => {
  const response = await request.get('/guilds', { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toContain('returnTo');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware` | `proxy.ts` + `export function proxy` | Next.js 16 | Old convention still works but produces deprecation warning |
| Edge runtime for middleware | Node.js runtime only for proxy | Next.js 16 | `Buffer`, `fs`, and other Node.js APIs are now available |
| `skipMiddlewareUrlNormalize` config flag | `skipProxyUrlNormalize` | Next.js 16 | Flag renamed (not used in this project) |

**Deprecated/outdated:**
- `src/middleware.ts` with named `middleware` export: Deprecated in Next.js 16, functional with warning. Will be removed in a future major version.
- Edge runtime for middleware: Not supported in `proxy.ts`. Still available for `middleware.ts` per Next.js 16 docs, but not used in this project.

---

## Open Questions

1. **Are E2E tests currently passing with `src/proxy.ts`?**
   - What we know: The Next.js 16 build system accepts `proxy.ts`. The existing logic is correct.
   - What's unclear: Whether the tests have actually been run since commit `2feb03e`. The milestone audit assumed failure without empirical test results.
   - Recommendation: The planner should include a step to run E2E tests BEFORE the rename to establish a baseline. If they pass before the rename, they should also pass after.

2. **Will the deprecation warning cause any CI/CD failures?**
   - What we know: The warning is emitted via `_log.warnOnce()` — a console warning, not an error.
   - What's unclear: Whether the project has any CI pipeline that treats warnings as errors.
   - Recommendation: Low risk. Document the warning in the phase summary.

---

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js/v16.1.6` (Context7) — proxy file conventions, middleware deprecation, runtime constraints
- `node_modules/next/dist/lib/constants.js:272-275` — MIDDLEWARE_FILENAME='middleware', PROXY_FILENAME='proxy' (verified directly in installed package)
- `node_modules/next/dist/build/utils.js:241-243` — `isMiddlewareFilename()` accepts both 'middleware' and 'proxy' filenames (verified directly in installed package)
- `node_modules/next/dist/build/index.js:605-611` — Error if both files exist, deprecation warning for middleware.ts (verified directly in installed package)
- `node_modules/next/dist/build/analysis/get-page-static-info.js:237-292` — proxy export detection, `hasProxyExport` validation (verified directly in installed package)

### Secondary (MEDIUM confidence)
- `src/proxy.ts` — Confirmed the file contains complete, correct implementation of CSRF, CSP, auth redirect logic
- `e2e/csrf-cookie.spec.ts`, `e2e/security-headers.spec.ts`, `e2e/auth-redirect.spec.ts` — Existing tests cover all success criteria

### Tertiary (LOW confidence)
- `.planning/v1.1-MILESTONE-AUDIT.md` — Source of the "regression" claim. Audit was INCORRECT; it cited only MIDDLEWARE_FILENAME constant without checking PROXY_FILENAME or isMiddlewareFilename() implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Next.js 16.1.6 is installed; Context7 docs + direct source inspection confirm both file conventions work
- Architecture: HIGH — All patterns already implemented in `src/proxy.ts`; only function name changes
- Pitfalls: HIGH — Verified against Next.js 16.1.6 build source; deprecation warning behavior confirmed

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable; Next.js 16 minor releases unlikely to break backward compat)

---

## Implementation Summary for Planner

This phase requires exactly **2 code changes**:

1. `git mv src/proxy.ts src/middleware.ts` (rename file)
2. Change `export async function proxy(` to `export async function middleware(` on line 113 of the file

Then verify with the existing E2E test suite (`npx playwright test`).

**Expected behavior after rename:**
- Next.js 16 will detect `src/middleware.ts`, print a deprecation warning, and execute the middleware for all matched routes
- `_csrf_token` cookie will be set on every page response
- `Content-Security-Policy` header will be present on all page responses
- Unauthenticated requests to `/guilds`, `/settings`, `/dashboard` will redirect to `/?returnTo=/path`

**Note for phase summary:** The phase summary should accurately document that (a) `proxy.ts` was valid Next.js 16 convention, (b) the rename produces a deprecation warning, and (c) the project should consider migrating back to `proxy.ts` in a future phase when deprecation becomes removal.
