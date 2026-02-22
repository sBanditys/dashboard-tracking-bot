# Phase 15: Reactivate Next.js Middleware - Research

**Researched:** 2026-02-22
**Domain:** Next.js 16 proxy/middleware reactivation, CSP enhancements, CSRF cookie issuance, auth redirects
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CSP Policy Rules**
- Enforced from the start — no report-only phase
- Nonce-based inline script/style handling (Claude picks the best Next.js-compatible nonce propagation method)
- External domain allowlist: Claude audits codebase for actual external resources and builds the allowlist
- img-src: 'self' + Discord CDN + data: URIs
- font-src: 'self' + fonts.gstatic.com (Google Fonts allowed)
- connect-src: must include wss:// for WebSocket connections
- No kill switch — CSP is always enforced, fix violations properly
- Same policy across all environments (dev, staging, prod)
- CSP violation reports sent to webhook via CSP_REPORT_URI environment variable
- Rate-limit CSP reports to prevent webhook flooding
- No per-route CSP overrides needed

**Security Header Suite**
- Strict-Transport-Security: max-age=31536000; includeSubDomains (1 year + subdomains)
- Referrer-Policy: strict-origin-when-cross-origin
- X-Content-Type-Options: nosniff
- X-Frame-Options (Claude picks appropriate value)
- Permissions-Policy (Claude determines which features to restrict)

**CSP Violation Reporting**
- Webhook endpoint via CSP_REPORT_URI env var
- Claude decides: proxy through API route vs direct, report-to vs report-uri, report deduplication, payload enrichment
- Rate limiting on reports is required

**CSP Testing**
- Automated E2E tests to verify CSP doesn't break functionality
- Tests should cover all routes in the app
- Claude picks the E2E framework and test depth

**Auth Redirect Behavior**
- Unauthenticated users redirect to / (landing page)
- Preserve return URL: redirect to /?returnTo=/original/path so users land back after login
- Protected routes: everything except / and /login
- Auth detection method: Claude checks existing auth setup and uses whatever pattern is in place
- API route auth handling: Claude determines best approach

**CSRF Token Scope**
- _csrf_token cookie set on all page routes
- Token generation method: Claude picks best approach
- Cookie accessibility (HttpOnly vs JS-readable): Claude decides based on existing frontend patterns
- Token rotation strategy: Claude decides
- CSRF validation applies to all state-changing methods: POST, PUT, DELETE, PATCH
- CSRF exemptions: Claude determines necessary exemptions (e.g., OAuth callback)

**Route Matching & Middleware Behavior**
- Middleware execution order, matcher config vs run-all: Claude decides
- Static asset handling: Claude determines optimal exclusion list
- Security-focused cache headers: Cache-Control: no-store for authenticated pages
- X-Request-ID header: generate unique ID per request, pass through to Express backend for tracing
- Middleware file structure (single vs modular): Claude decides based on complexity

### Claude's Discretion
- Nonce propagation method for Next.js
- frame-ancestors restriction level
- Permissions-Policy feature list
- worker-src restrictions
- upgrade-insecure-requests inclusion
- connect-src domain list (based on codebase audit)
- CSP report endpoint architecture (proxy vs direct)
- Report-to vs report-uri directive choice
- Report deduplication and payload enrichment
- E2E testing framework selection and test depth
- API route auth handling in middleware
- CSRF token generation, rotation, and cookie settings
- CSRF validation location (middleware vs API routes)
- CSRF exemption list
- Route matching approach (matcher vs run-all)
- Static asset exclusion list
- Middleware execution order
- Logging strategy
- Bot/crawler handling
- Rate limiting for page requests
- Geo/IP restrictions
- Middleware file structure

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-03 | All frontend mutation requests include CSRF token via double-submit cookie pattern | Root cause fix (proxy.ts → middleware.ts rename) restores `_csrf_token` cookie issuance; fetchWithRetry already has injection and retry logic |
| AUTH-04 | Dashboard serves Content-Security-Policy headers preventing XSS vectors | Root cause fix restores CSP header injection; enhanced CSP needed (HSTS, wss://, fonts.gstatic.com, violation reporting) |
</phase_requirements>

---

## Summary

Phase 15 has one root cause and several enhancements. The root cause is that `src/middleware.ts` was renamed to `src/proxy.ts` during the Next.js 14→16 upgrade (commit `a2a9747`), and the exported function was renamed from `middleware` to `proxy`. The v1.1 audit confirmed both the empty middleware manifest AND the consequence chain: no CSRF cookie, no CSP headers, no server-side auth redirects.

The fix is well-understood: rename `src/proxy.ts` back to `src/middleware.ts` AND rename `export async function proxy` back to `export async function middleware`. Next.js 16.1.6 source code confirms it supports both `middleware.ts` (deprecated, warns) and `proxy.ts` (current convention). The existing `src/proxy.ts` uses the correct Next.js 16 convention (`export async function proxy`) and the build process DOES recognize it — but the current build's middleware manifest is empty, indicating either a stale build or a build-time registration issue that is resolved by fresh `npm run build`.

Crucially: the code in `src/proxy.ts` already contains working CSRF validation, CSP header injection, auth redirects, and token refresh logic. Phase 15 must:
1. Fix the file so Next.js executes it (rename OR rebuild)
2. Enhance CSP with new requirements: HSTS, fonts.gstatic.com, wss:// (for Next.js HMR dev), violation reporting, Cache-Control, X-Request-ID
3. Update auth redirect to use `returnTo` param (currently uses `callbackUrl`)
4. Add a CSP report API route with rate limiting
5. Add E2E tests

**Primary recommendation:** Rename `src/proxy.ts` → `src/middleware.ts` with `export async function middleware` to guarantee activation (Phase 15 success criteria explicitly requires this). This uses the deprecated convention but it works and avoids any ambiguity about build-time detection of `proxy.ts`. The deprecation warning is harmless. Enhance the security headers to match the new requirements before activating.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js built-in middleware | 16.1.6 (installed) | Request interception, header injection, auth redirects | The only mechanism that runs before all routes in Next.js |
| Playwright | ^1.x | E2E testing | Official Next.js recommendation for App Router E2E tests; supports header inspection, cookie verification, multi-route testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| crypto.randomUUID() | Node.js built-in | Nonce and X-Request-ID generation | Available in Node.js 14.17+ and Edge runtime, no install required |
| In-memory Map | Built-in | CSP report rate limiting | Simple, sufficient for per-IP or per-endpoint rate limiting in middleware |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| middleware.ts (deprecated) | proxy.ts (current) | proxy.ts is the "correct" Next.js 16 convention but the build manifest was empty in the current codebase; middleware.ts is guaranteed to work per the Phase 15 success criteria |
| Playwright (E2E) | Cypress | Playwright has better Node.js/TypeScript integration, official Next.js support, faster; Cypress requires more config for Next.js App Router |
| In-memory rate limiter | Redis/Valkey | No persistence between restarts, but sufficient for abuse prevention; persistent rate limiting deferred to v2 (PERF-02) |
| report-uri directive | report-to (Reporting API v1) | report-uri is widely supported across all browsers; report-to is newer but browser support is still inconsistent; use report-uri for reliability |

**Installation:**
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

---

## Architecture Patterns

### Root Cause Fix: File and Export Rename

**What:** `src/proxy.ts` → `src/middleware.ts`, `export async function proxy` → `export async function middleware`
**Why this approach:** Phase 15 success criteria explicitly requires `src/middleware.ts` with `export async function middleware`. Next.js 16.1.6 source code (confirmed in `build/index.js`) shows it detects both `middleware.ts` and `proxy.ts` and shows a deprecation warning for `middleware.ts` — but it works. The build manifest being empty confirms the current `proxy.ts` is NOT being invoked at runtime.

**Important:** If both `middleware.ts` AND `proxy.ts` exist, Next.js throws an error: `"Both middleware file ... and proxy file ... are detected. Please use proxy file only."` Delete `proxy.ts` after creating `middleware.ts`.

### Pattern 1: Next.js 16 Middleware File (middleware.ts)

**What:** Next.js middleware runs before every matched request, can modify request/response headers, redirect, and set cookies.
**When to use:** CSRF cookie issuance, CSP header injection, auth redirects, X-Request-ID generation

```typescript
// Source: /vercel/next.js/v16.1.6 docs
// File: src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // runs for all matched paths
  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```

### Pattern 2: CSP Nonce Generation and Propagation

**What:** Generate a unique nonce per request, inject via `x-nonce` request header so Next.js can apply it to framework scripts, and set it on the response `Content-Security-Policy` header.
**Critical:** CSP header must be set on BOTH request headers AND response headers in Next.js 16 so the framework can extract the nonce for script tags during SSR.

```typescript
// Source: /vercel/next.js/v16.1.6 docs, content-security-policy.mdx
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const cspHeader = buildCspHeader(nonce);

const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-nonce', nonce);
requestHeaders.set('Content-Security-Policy', cspHeader);  // For framework script nonce extraction

const response = NextResponse.next({ request: { headers: requestHeaders } });
response.headers.set('Content-Security-Policy', cspHeader);  // For browser enforcement
```

The layout reads the nonce:
```typescript
// src/app/layout.tsx (already implemented)
const nonce = (await headers()).get("x-nonce") ?? "";
```

### Pattern 3: CSRF Double-Submit Cookie

**What:** Generate a random token, set as non-HttpOnly cookie, validate cookie value == `X-CSRF-Token` header on mutations.
**Existing:** Already implemented in `src/proxy.ts`. Port to `middleware.ts` without changes.

```typescript
// Current working implementation in src/proxy.ts
response.cookies.set('_csrf_token', crypto.randomUUID(), {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: false,  // Client JS must read token to send in header
  path: '/',
});
```

### Pattern 4: CSRF Token Rotation — Per-Request is Already Implemented

**Important finding:** The v1.1 audit notes: "CSRF token rotation changed from per-session to per-request during Next.js 16 upgrade." Current `proxy.ts` calls `setCsrfCookie(response, crypto.randomUUID())` on EVERY response — not per-session. This means every page load rotates the token.

The `fetchWithRetry` already handles this with silent CSRF retry (reads fresh cookie on 403). This is safe.

**Do not change token rotation strategy** — per-request rotation is already the live pattern and fetchWithRetry accounts for it.

### Pattern 5: Auth Redirect with returnTo Parameter

**What:** Unauthenticated access to protected routes redirects to `/?returnTo=/original/path`
**Change from current:** Current proxy.ts redirects to `/login?callbackUrl=/path`. The CONTEXT.md says use `/?returnTo=/path` instead.
**Impact:** The login page (`src/app/(auth)/login/page.tsx`) currently reads `searchParams.get('callbackUrl')`. If the redirect target changes to `/?returnTo=`, the landing page (`) must read `returnTo` and pass it through the OAuth flow OR the login page must also read `returnTo`.

**Resolution:** The redirect goes to `/?returnTo=/path` (landing page with the returnTo param). The login button on the landing page reads `returnTo` from query params, stores to sessionStorage as `auth_callback_url`, and the callback reads from sessionStorage. This requires updating the landing page to read the `returnTo` param and pass it to the login flow.

**OR:** A simpler approach is to keep redirecting to `/login?callbackUrl=/path` (same as current) since the login page already handles it. But the CONTEXT.md explicitly says `/?returnTo=/original/path` — this is a locked decision.

### Pattern 6: CSP Violation Reporting

**What:** Browser sends CSP violation reports to a configured endpoint. The endpoint forwards to a webhook via `CSP_REPORT_URI` env var.
**Architecture decision (Claude's discretion):** Proxy through an API route (`/api/csp-report`) rather than sending directly to the webhook from the browser. Reasons:
- Keeps webhook URL private (not exposed in browser-visible CSP header)
- Allows server-side rate limiting
- Allows payload enrichment (add request metadata, deduplicate)

**Rate limiting:** Use a simple in-memory Map keyed by IP. Allow N reports per 60-second window.

```typescript
// src/app/api/csp-report/route.ts
export async function POST(request: NextRequest) {
  // Rate limit by IP
  // Parse report
  // Forward to CSP_REPORT_URI if set
}
```

**report-uri vs report-to:** Use `report-uri /api/csp-report` in the CSP header. `report-uri` is more widely supported than `report-to` (Reporting API v1). Can add both directives for future-proofing.

### Pattern 7: New Security Headers

**What:** Add HSTS, Cache-Control (authenticated pages), X-Request-ID

```typescript
// HSTS — ONLY set in production (browsers will enforce for 1 year)
// Setting in dev would lock localhost to HTTPS for a year
if (process.env.NODE_ENV === 'production') {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// Cache-Control: no-store for authenticated pages
// Apply when user has auth cookie (don't cache sensitive dashboard data)
if (hasSessionCookie && !isApiRoute) {
  response.headers.set('Cache-Control', 'no-store');
}

// X-Request-ID — unique per request for tracing
const requestId = crypto.randomUUID();
response.headers.set('X-Request-ID', requestId);
// Also forward to Express backend via request header for correlation
requestHeaders.set('X-Request-ID', requestId);
```

### Pattern 8: Enhanced CSP Directives

**Existing CSP (in security-headers.ts):**
```
default-src 'self'
script-src 'self' 'nonce-{nonce}' 'strict-dynamic' ['unsafe-eval' in dev]
style-src 'self' 'unsafe-inline'
img-src 'self' blob: data: https://cdn.discordapp.com
font-src 'self'
connect-src 'self'
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
```

**Required changes for Phase 15:**
- `font-src`: Add `https://fonts.gstatic.com` (Google Fonts allowed per CONTEXT.md). However, codebase audit shows local Geist fonts loaded via `next/font/local` — no Google Fonts CDN calls detected. Add fonts.gstatic.com anyway per locked decision.
- `connect-src`: Add `wss:` — required for Next.js HMR WebSocket connections in development (the codebase has no explicit WebSocket code, but Next.js dev server uses `ws://` or `wss://` for hot module replacement). In production, `'self'` is sufficient. Conditionally add `wss:` in dev only is an option, but context says same policy across all environments — so include `wss:` unconditionally.
- Add `report-uri /api/csp-report` directive (for violation reporting).
- No changes needed to img-src, script-src, style-src, or other directives.

**Updated CSP:**
```
default-src 'self';
script-src 'self' 'nonce-{nonce}' 'strict-dynamic' ['unsafe-eval' in dev];
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://cdn.discordapp.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' wss:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
report-uri /api/csp-report;
```

### Pattern 9: Matcher Config

**Recommended matcher** (improves on current by filtering prefetch requests that don't need nonce generation):
```typescript
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

The `missing` clause excludes Next.js prefetch requests from middleware execution, which avoids generating unnecessary nonces for resource-hint fetches.

### Pattern 10: E2E Tests with Playwright

**Framework:** Playwright with `@playwright/test`
**Location:** `e2e/` directory at project root
**Config:** `playwright.config.ts`
**Scope:** All routes — header presence verification, CSRF cookie issuance, auth redirect

```typescript
// e2e/security-headers.spec.ts
import { test, expect } from '@playwright/test';

test('CSP header present on page response', async ({ page }) => {
  const response = await page.goto('/');
  const cspHeader = response?.headers()['content-security-policy'];
  expect(cspHeader).toBeDefined();
  expect(cspHeader).toContain("nonce-");
  expect(cspHeader).not.toContain("'unsafe-inline'");  // Only for scripts
});

test('_csrf_token cookie set on page load', async ({ page, context }) => {
  await page.goto('/');
  const cookies = await context.cookies();
  const csrfCookie = cookies.find(c => c.name === '_csrf_token');
  expect(csrfCookie).toBeDefined();
  expect(csrfCookie?.httpOnly).toBe(false);  // Must be readable by JS
});
```

### Anti-Patterns to Avoid

- **Setting HSTS on localhost/dev:** Strict-Transport-Security on non-HTTPS will lock the browser to HTTPS for max-age duration. Always guard with `NODE_ENV === 'production'` check.
- **Setting `Content-Security-Policy` header on API routes:** JSON responses don't need CSP. Only apply to page (HTML) routes. Current code already has this conditional — preserve it.
- **Having both `middleware.ts` AND `proxy.ts`:** Next.js 16 throws a build error if both exist. Delete `proxy.ts` after creating `middleware.ts`.
- **Using `cookies()` from `next/headers` in middleware:** Middleware runs in Edge-like context. Use `request.cookies.get()` instead.
- **Not setting CSP on both request AND response headers:** CSP must be on request headers (for Next.js to extract nonce for framework scripts) AND on response headers (for browser enforcement). Setting only response headers means framework-injected scripts won't have the nonce.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| E2E test infrastructure | Custom HTTP test harness | Playwright | Playwright handles page lifecycle, cookies, headers inspection, parallel execution |
| CSRF token library | Manual double-submit implementation | Current proxy.ts implementation (working) | Already implemented and battle-tested in the codebase |
| Rate limiting library | Full rate limiter from scratch | Simple in-memory Map | Phase scope is limited; complex rate limiting deferred to v2 per PERF-02 |

**Key insight:** The security logic in `proxy.ts` is already correct — the only issue is the filename prevents Next.js from executing it. Copy, don't rewrite.

---

## Common Pitfalls

### Pitfall 1: Stale Build After File Rename
**What goes wrong:** After renaming `proxy.ts` → `middleware.ts`, the build artifacts still reference the old file. Middleware manifest remains empty even after rename if build is not regenerated.
**Why it happens:** Next.js caches build artifacts in `.next/`. The middleware manifest (`middleware-manifest.json`) is only regenerated on `npm run build` or `npm run dev` restart.
**How to avoid:** After rename, always do a fresh build or clear `.next/` and restart dev server.
**Warning signs:** Empty `middleware-manifest.json` after rename.

### Pitfall 2: HSTS Breaking Local Development
**What goes wrong:** HSTS header set in development causes browser to refuse HTTP connections to localhost for 1 year (max-age).
**Why it happens:** Browser stores HSTS policy for any domain that sends the header, including localhost.
**How to avoid:** Always guard HSTS with `process.env.NODE_ENV === 'production'` check.
**Warning signs:** Browser refuses to load `http://localhost:3001` — redirects to HTTPS automatically.

### Pitfall 3: CSP Violation Report Flooding
**What goes wrong:** A single misconfigured CSP directive can generate thousands of reports per second, flooding the webhook.
**Why it happens:** Every page load on every user triggers the violation report.
**How to avoid:** Implement in-memory rate limiting on the `/api/csp-report` route before forwarding to webhook. Rate limit per IP or globally. Also deduplicate by violation source+directive.
**Warning signs:** Webhook receives hundreds of identical reports per minute.

### Pitfall 4: Auth Redirect Changing Return URL Parameter Name
**What goes wrong:** Phase 15 changes the redirect from `/login?callbackUrl=/path` to `/?returnTo=/path`. The existing login page reads `callbackUrl`. If the landing page (`/`) doesn't propagate `returnTo` to the login flow, users lose their return URL after OAuth.
**Why it happens:** The `returnTo` parameter on `/` is on the landing page, not the login page. The login page currently reads `callbackUrl` from its own query params.
**How to avoid:** Update the landing page (`/`) to detect `returnTo` query param and pass it to the login page when user clicks "Sign in". OR update the login page to also check for `returnTo` as a fallback param name. The simplest approach: redirect unauthenticated users to `/login?callbackUrl=/path` (keep existing working pattern) — but this contradicts the CONTEXT.md decision of `/?returnTo=`.
**Resolution:** Follow CONTEXT.md: redirect to `/?returnTo=/path`. Update the landing page to read `returnTo` from query params and pass to login flow. The callback page already reads from `sessionStorage.getItem('auth_callback_url')` which is set by the login page — the chain works if the landing page sets `auth_callback_url` in sessionStorage or passes `returnTo` to the login page.
**Warning signs:** After login, user lands on landing page instead of the page they tried to access.

### Pitfall 5: CSRF Token Missing on Initial Page Load
**What goes wrong:** CSRF token cookie is set by middleware on every response. If middleware is not invoked for the initial page load, the token is never set, causing the first mutation to fail.
**Why it happens:** Middleware matcher excludes the route, or static page served without middleware.
**How to avoid:** Verify the matcher includes `/` (landing page) and `/login`. Test by loading the app fresh and checking for `_csrf_token` cookie.
**Warning signs:** `fetchWithRetry` shows `X-CSRF-Token` header is empty in request; silent retry always triggers on first mutation.

### Pitfall 6: `export const config` Must Be a Static Object
**What goes wrong:** Using dynamic expressions in `export const config` (like `process.env`) causes Next.js build errors.
**Why it happens:** Next.js statically analyzes the config during build time.
**How to avoid:** All matcher values must be literal strings or string arrays — no runtime expressions.
**Warning signs:** Build error: "Middleware's config export must be a static object".

---

## Code Examples

### Complete middleware.ts Structure

```typescript
// Source: current src/proxy.ts + Phase 15 enhancements
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCspHeader, getSecurityHeaders } from '@/lib/server/security-headers';
import { extractDashboardSessionCookies } from '@/lib/server/dashboard-session-cookies';
import { getClientIpFromRequest } from '@/lib/server/client-context';
import { BACKEND_API_URL } from '@/lib/server/api-url';

// [existing constants and helper functions from proxy.ts unchanged]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestId = crypto.randomUUID();

  // [CSRF validation — identical to proxy.ts lines 121-137]

  // [Auth cookie reading — identical to proxy.ts lines 139-142]

  // [Proactive token refresh — identical to proxy.ts]

  // Build request headers with nonce for page routes
  const requestHeaders = new Headers(request.headers);
  if (!isApiRoute) {
    const csp = buildCspHeader(nonce);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', csp);  // NEW: set on request too
  }
  requestHeaders.set('X-Request-ID', requestId);  // NEW: always forward request ID
  // [refresh token injection into cookies if refreshedTokens]

  // Create response
  let response: NextResponse;
  response = NextResponse.next({ request: { headers: requestHeaders } });

  // Set cookies (CSRF + refreshed auth tokens)
  response.cookies.set('_csrf_token', crypto.randomUUID(), {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: false,
    path: '/',
  });
  // [refreshed token cookies if refreshedTokens]

  // Apply security headers
  if (!isApiRoute) {
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    // NEW: Cache-Control for authenticated pages
    if (hasSessionCookie) {
      response.headers.set('Cache-Control', 'no-store');
    }
  } else {
    // API routes: non-CSP security headers only
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      if (key !== 'Content-Security-Policy') {
        response.headers.set(key, value);
      }
    }
  }

  // NEW: X-Request-ID on response (for client-side tracing)
  response.headers.set('X-Request-ID', requestId);

  // NEW: HSTS in production only
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // [Auth redirects — redirect to /?returnTo= instead of /login?callbackUrl=]

  return response;
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

### CSP Report API Route with Rate Limiting

```typescript
// src/app/api/csp-report/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter: IP → { count, resetAt }
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;       // max reports per window
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return new NextResponse(null, { status: 429 });
  }

  const reportUri = process.env.CSP_REPORT_URI;
  if (!reportUri) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const body = await request.json();
    await fetch(reportUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Silently ignore forwarding errors
  }

  return new NextResponse(null, { status: 204 });
}
```

### Updated getSecurityHeaders with HSTS

```typescript
// src/lib/server/security-headers.ts — updated buildCspHeader
export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://cdn.discordapp.com",
    "font-src 'self' https://fonts.gstatic.com",   // NEW: Google Fonts
    "connect-src 'self' wss:",                      // NEW: wss: for HMR/WebSockets
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",                   // NEW: violation reporting
  ];

  return directives.join('; ');
}

// HSTS is NOT in getSecurityHeaders because it should only be applied in production
// Apply directly in middleware with NODE_ENV guard
```

### Playwright E2E Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3001',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware` | `proxy.ts` + `export function proxy` | Next.js 14→16 upgrade (commit a2a9747) | Both work in v16.1.6; `middleware.ts` shows deprecation warning but is fully functional |
| @edge-csrf/nextjs library | Custom double-submit cookie in proxy.ts | Same upgrade commit | @edge-csrf/nextjs was replaced with inline implementation; @edge-csrf/nextjs IS still installed in node_modules |
| Per-session CSRF token | Per-request CSRF token (new token on every response) | Same upgrade | fetchWithRetry already handles this via silent retry on CSRF failure |

**Deprecated/outdated:**
- `@edge-csrf/nextjs` in package.json: Still installed, not used. Phase 15 does NOT need to bring it back. The custom implementation in proxy.ts is equivalent.
- `middleware.ts` file convention: Still works in Next.js 16.1.6, just shows a deprecation warning at build time.

---

## Open Questions

1. **Auth redirect target: `/` vs `/login`**
   - What we know: CONTEXT.md says "redirect to `/?returnTo=/original/path`". Current code redirects to `/login?callbackUrl=`. The landing page (`/`) currently does not read `returnTo` from query params.
   - What's unclear: The landing page would need to be updated to pass `returnTo` to the login/OAuth flow. This adds scope to Phase 15 beyond the middleware itself.
   - Recommendation: Implement the `/?returnTo=` redirect per CONTEXT.md. Update the landing page to detect the `returnTo` param and store it in sessionStorage as `auth_callback_url` before initiating login. The existing callback flow already reads from sessionStorage.

2. **E2E test depth for "all routes"**
   - What we know: CONTEXT.md says "E2E tests should cover all routes in the app". The app has 8+ dashboard routes (guilds list, guild detail, accounts, posts, analytics, settings, exports, bonus).
   - What's unclear: Testing all routes requires authentication, which requires a test Discord account or mocked auth.
   - Recommendation: Test security headers on public routes (/, /login, /auth/*) without auth. For dashboard routes, test the auth redirect behavior (unauthenticated → redirect to /?returnTo=). Skip full authenticated route testing (requires Discord OAuth) — verify headers on the redirect response instead.

3. **CSRF token set on ALL responses or only page responses?**
   - What we know: Current `proxy.ts` calls `setCsrfCookie(response, crypto.randomUUID())` on ALL responses including API routes (the cookie set is unconditional). The CONTEXT.md says "_csrf_token cookie set on all page routes".
   - What's unclear: Whether API route responses should also get a fresh CSRF cookie (current behavior) or only page routes.
   - Recommendation: Keep current behavior (cookie set on all matched responses). Setting on API routes too is harmless and ensures the cookie is refreshed after every middleware-matched request.

---

## Sources

### Primary (HIGH confidence)
- `/vercel/next.js/v16.1.6` (Context7) — proxy.ts/middleware.ts file convention, CSP nonce pattern, matcher config, auth redirect pattern
- `node_modules/next/dist/esm/build/index.js` — Verified that Next.js 16.1.6 supports BOTH `middleware.ts` (deprecated) AND `proxy.ts` (current); shows deprecation warning for middleware.ts but does not block it
- `node_modules/next/dist/esm/build/utils.js` — Verified that `isMiddlewarePage` checks both MIDDLEWARE_FILENAME and PROXY_FILENAME; both are valid entry points
- `.next/server/middleware-manifest.json` — Confirmed empty (no middleware registered at build time), root cause evidence
- `src/proxy.ts` — Existing implementation contains all needed logic; only needs rename + enhancements

### Secondary (MEDIUM confidence)
- `.planning/v1.1-MILESTONE-AUDIT.md` — Root cause analysis, consequence chain documentation, confirmed fix approach
- `.planning/phases/10-frontend-security-hardening/10-03-PLAN.md` — CSP decisions from Phase 10 (style-src rationale, img-src rationale)
- `.planning/phases/10-frontend-security-hardening/10-VERIFICATION.md` — Confirmed Phase 10 passed code review but integration was broken at runtime

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Verified against Next.js 16.1.6 installed source code
- Architecture (file rename fix): HIGH — Confirmed by examining Next.js build source
- Architecture (CSP enhancements): HIGH — Codebase audited for external resources; connect-src wss: confirmed for HMR
- Architecture (E2E testing): MEDIUM — Playwright is correct choice but test coverage scope for authenticated routes needs implementation decision
- Pitfalls: HIGH — Root cause traced directly in source code and build manifests

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (30 days — Next.js version is pinned, stability expected)
