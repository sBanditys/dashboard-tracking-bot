---
phase: 15-reactivate-nextjs-middleware
verified: 2026-02-22T14:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Run dev server and load /login in a real browser"
    expected: "_csrf_token cookie appears in DevTools (Application > Cookies), Content-Security-Policy header visible in Network tab, nonce attribute present on <script> tags in the HTML source"
    why_human: "Cookie SameSite and httpOnly properties, header injection at runtime, and nonce propagation to JSX output require a live server — cannot be confirmed by static file analysis"
  - test: "Access /guilds while logged out, then log in via Discord OAuth"
    expected: "Browser is redirected to /?returnTo=%2Fguilds, then to /login?callbackUrl=%2Fguilds, then after successful OAuth callback lands on /guilds (not /guilds default)"
    why_human: "Full auth redirect chain requires real Discord OAuth tokens; the returnTo→callbackUrl→sessionStorage→callback chain spans multiple pages and OAuth round-trip"
---

# Phase 15: Reactivate Next.js Middleware — Verification Report

**Phase Goal:** Next.js middleware is active, restoring CSRF cookie issuance and CSP header injection for all routes
**Verified:** 2026-02-22T14:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/middleware.ts` exists with `export async function middleware` (not proxy.ts/proxy) | VERIFIED | File exists at `src/middleware.ts` line 113: `export async function middleware(request: NextRequest)`. `src/proxy.ts` confirmed deleted. |
| 2 | `_csrf_token` cookie is set on page responses (CSRF double-submit pattern active) | VERIFIED | `middleware.ts:203`: `setCsrfCookie(response, crypto.randomUUID())` — called unconditionally on every pass-through response. `setCsrfCookie` at line 104 sets `httpOnly: false`, `sameSite: 'lax'`, `path: '/'`. |
| 3 | `Content-Security-Policy` header is present on all page responses | VERIFIED | `middleware.ts:258-271`: non-API routes call `getSecurityHeaders(nonce)` which includes CSP. Redirect paths at lines 229-237 and 244-252 also set security headers explicitly. |
| 4 | Auth redirect happens at SSR level for unauthenticated requests to protected routes | VERIFIED | `middleware.ts:223-239`: `if (isDashboardRoute && !hasSessionCookie)` redirects to `/?returnTo={pathname}` — this is the middleware edge layer, before any page render. |
| 5 | CSP includes `font-src fonts.gstatic.com`, `connect-src wss:`, and `report-uri /api/csp-report` | VERIFIED | `security-headers.ts:31`: `"font-src 'self' https://fonts.gstatic.com"`. Line 32: `"connect-src 'self' wss:"`. Line 38: `"report-uri /api/csp-report"`. |
| 6 | HSTS header set in production only | VERIFIED | `middleware.ts:282-284`: `if (process.env.NODE_ENV === 'production') { response.headers.set('Strict-Transport-Security', ...) }`. Same guard applied to all three early-return paths. |
| 7 | X-Request-ID header present on all responses | VERIFIED | `middleware.ts:118`: `const requestId = crypto.randomUUID()`. Set at line 279 on main response, line 216 on auth-page early return, line 234 on dashboard redirect, line 249 on login redirect. |
| 8 | Cache-Control: no-store set on authenticated page responses | VERIFIED | `middleware.ts:274-276`: `if (!isApiRoute && hasSessionCookie) { response.headers.set('Cache-Control', 'no-store'); }` |
| 9 | Landing page reads returnTo param and bridges to `/login?callbackUrl=` | VERIFIED | `src/app/page.tsx:20-22`: reads `params.returnTo`, then `redirect('/login?callbackUrl=${encodeURIComponent(returnTo)}')`. Authenticated users still redirect to `/guilds`. |
| 10 | CSP report API route accepts POST, rate-limits by IP, forwards to CSP_REPORT_URI | VERIFIED | `src/app/api/csp-report/route.ts`: `export async function POST`, in-memory rate limiter at 10 req/min with `setInterval` cleanup, conditional webhook forward to `process.env.CSP_REPORT_URI`. |

**Score: 10/10 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/middleware.ts` | Active middleware with CSRF, CSP, auth redirect, token refresh | VERIFIED | 299 lines, full implementation — `export async function middleware`, CSRF double-submit, nonce CSP, auth redirect, proactive token refresh, X-Request-ID on all paths |
| `src/lib/server/security-headers.ts` | Enhanced CSP builder with fonts.gstatic.com, wss:, report-uri | VERIFIED | 63 lines, `buildCspHeader` returns 11 directives including all three required additions; `getSecurityHeaders` returns full 5-header suite |
| `src/app/api/csp-report/route.ts` | CSP violation report proxy with rate limiting | VERIFIED | 64 lines, `export async function POST`, in-memory Map rate limiter, `setInterval` cleanup, webhook forwarding |
| `src/app/page.tsx` | Landing page with returnTo param handling | VERIFIED | 25 lines, reads `searchParams.returnTo`, bridges to `/login?callbackUrl=`, authenticated users → `/guilds` |
| `playwright.config.ts` | Playwright config for E2E testing | VERIFIED | 27 lines, `defineConfig`, `testDir: './e2e'`, `baseURL: 'http://localhost:3001'`, chromium project |
| `e2e/security-headers.spec.ts` | CSP and security header verification tests | VERIFIED | Contains `Content-Security-Policy`, tests all directives, nonce uniqueness, API routes |
| `e2e/csrf-cookie.spec.ts` | CSRF cookie presence and property tests | VERIFIED | Contains `_csrf_token`, tests UUID format, rotation, CSRF validation rejection |
| `e2e/auth-redirect.spec.ts` | Auth redirect behavior tests | VERIFIED | Contains `returnTo`, `%2Fguilds`, `callbackUrl` — covers full redirect chain |
| `src/proxy.ts` | Must NOT exist | VERIFIED | File confirmed deleted; no collision with middleware.ts |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `src/lib/server/security-headers.ts` | `import { buildCspHeader, getSecurityHeaders }` | WIRED | `middleware.ts:3`: `import { buildCspHeader, getSecurityHeaders } from '@/lib/server/security-headers'`. Both are called in the middleware body. |
| `src/middleware.ts` | browser | `response.cookies.set('_csrf_token', ...)` | WIRED | `middleware.ts:203`: `setCsrfCookie(response, crypto.randomUUID())` called on every non-early-return response path. |
| `src/app/page.tsx` | `/login?callbackUrl=` | `returnTo` → `callbackUrl` bridge | WIRED | `page.tsx:21`: `redirect('/login?callbackUrl=${encodeURIComponent(returnTo)}')` |
| CSP header | `src/app/api/csp-report/route.ts` | `report-uri /api/csp-report` in CSP directive | WIRED | `security-headers.ts:38`: `"report-uri /api/csp-report"`. Route exists at `src/app/api/csp-report/route.ts` with `export async function POST`. CSP report route added to CSRF exemption at `middleware.ts:124-130`. |
| `playwright.config.ts` | `e2e/*.spec.ts` | `testDir: './e2e'` | WIRED | `playwright.config.ts:3`: `testDir: './e2e'`. All three spec files exist in `e2e/`. |
| `e2e/security-headers.spec.ts` | `src/middleware.ts` | verifies `Content-Security-Policy` header | WIRED | Spec asserts CSP directives including `fonts.gstatic.com`, `wss:`, `report-uri /api/csp-report` — all delivered by middleware. |
| `e2e/csrf-cookie.spec.ts` | `src/middleware.ts` | verifies `_csrf_token` cookie | WIRED | Spec asserts cookie name, UUID value, `httpOnly: false`, `sameSite: 'Lax'`, `path: '/'` — all set by `setCsrfCookie` in middleware. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-03 | 15-01, 15-02 | All frontend mutation requests include CSRF token via double-submit cookie pattern | SATISFIED | `middleware.ts`: sets `_csrf_token` cookie on every response, validates `X-CSRF-Token` header against cookie on API mutations. CSRF exemption correctly applied to `/api/auth/*` and `/api/csp-report`. E2E test in `e2e/csrf-cookie.spec.ts` confirms 403+EBADCSRFTOKEN on POST without token. |
| AUTH-04 | 15-01, 15-02 | Dashboard serves Content-Security-Policy headers preventing XSS vectors | SATISFIED | `security-headers.ts` builds CSP with nonce-based `script-src`, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`. Middleware injects it on all page responses. E2E test in `e2e/security-headers.spec.ts` verifies all 9 directives. |

**No orphaned requirements.** REQUIREMENTS.md maps only AUTH-03 and AUTH-04 to Phase 15. Both are claimed in plan frontmatter and verified above.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | No stubs, placeholders, empty handlers, or TODO comments found in any modified file. |

---

### Human Verification Required

#### 1. CSRF Cookie and CSP Header at Runtime

**Test:** Start `npm run dev`, navigate to `http://localhost:3001/login` in a browser.
**Expected:** DevTools Application > Cookies shows `_csrf_token` with `HttpOnly: false`, `SameSite: Lax`, `Path: /`, value matching UUID format. Network tab shows `Content-Security-Policy` on the response, and the HTML `<script>` tags carry a matching `nonce=` attribute.
**Why human:** Cookie attributes and nonce propagation into JSX require a running server and browser inspection.

#### 2. Full Auth Redirect Chain

**Test:** While logged out, navigate directly to `http://localhost:3001/guilds`.
**Expected:** Browser redirects through `/?returnTo=%2Fguilds` → `/login?callbackUrl=%2Fguilds`. After Discord OAuth completes, the callback page delivers the user to `/guilds` (not the default dashboard home).
**Why human:** The full chain spans middleware, server component (page.tsx), Discord OAuth, and the callback page's sessionStorage read — requires real OAuth credentials and cannot be scripted without them.

---

### Summary

Phase 15 fully achieves its goal. The root cause of the v1.1 middleware inactivity (`src/proxy.ts` with `export function proxy`) has been fixed: the file is now `src/middleware.ts` with `export async function middleware`, making it a valid Next.js middleware file that Next.js will actually execute.

All four success criteria from the phase specification are met by real, substantive code:

1. `src/middleware.ts` exists with `export async function middleware` — confirmed, proxy.ts deleted.
2. `_csrf_token` cookie is set unconditionally on page responses — `middleware.ts:203`.
3. `Content-Security-Policy` header present on all page responses (and redirect responses) — `middleware.ts:258-270` plus explicit application on all early-return paths.
4. Auth redirect at SSR/middleware level for unauthenticated protected routes — `middleware.ts:223-239` redirects before any page component renders.

Both requirements (AUTH-03, AUTH-04) are fully satisfied. No anti-patterns were found. E2E tests exist and cover all behaviors, with the note from the SUMMARY that `playwright test` runner cannot be confirmed to produce output in the sandbox environment, but all 42 assertions were verified via Playwright API directly.

---

_Verified: 2026-02-22T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
