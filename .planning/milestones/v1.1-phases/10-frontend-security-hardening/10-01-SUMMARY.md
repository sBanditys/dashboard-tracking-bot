# Phase 10 Plan 01: CSRF Protection with Double-Submit Cookie Summary

**One-liner:** CSRF protection using @edge-csrf/nextjs with automatic token injection and silent retry on validation failures

---
phase: 10-frontend-security-hardening
plan: 01
subsystem: frontend-security
tags: [csrf, security, auth-protection, middleware]
dependency_graph:
  requires: [09-01-verified-email-enforcement, 09-03-auth-ux-improvements]
  provides: [csrf-protection, csrf-token-injection, csrf-silent-retry]
  affects: [middleware, fetch-with-retry]
tech_stack:
  added: [@edge-csrf/nextjs@2.5.2]
  patterns: [double-submit-cookie, silent-retry, csrf-middleware]
key_files:
  created: []
  modified:
    - src/middleware.ts
    - src/lib/fetch-with-retry.ts
    - package.json
    - package-lock.json
decisions:
  - "Use per-session CSRF tokens (not per-request) to avoid race conditions with concurrent mutations"
  - "Cookie name _csrf_token with httpOnly: false to allow client JS to read token"
  - "Silent retry on CSRF failure: fetch fresh token via GET /api/auth/session, retry once, show toast on persistent failure"
  - "Exclude /api/auth/* from CSRF validation (OAuth flow and session management endpoints)"
metrics:
  duration: 2m 30s
  completed: 2026-02-16
---

## What Was Built

Implemented CSRF protection using the double-submit cookie pattern to prevent cross-site request forgery attacks. All state-changing API requests (POST, PUT, PATCH, DELETE) now require a valid CSRF token. CSRF validation failures are silently retried with a fresh token so users never see CSRF errors during normal usage.

### Task 1: CSRF Middleware Integration (commit 2458885)
- Installed @edge-csrf/nextjs@2.5.2 for double-submit cookie pattern
- Integrated CSRF validation in middleware.ts using createCsrfProtect API
- Configured _csrf_token cookie with httpOnly: false (client JS must read token)
- CSRF validation runs BEFORE auth redirect logic
- Validate CSRF only on mutation methods (POST/PUT/PATCH/DELETE) for non-auth API routes
- Excluded /api/auth/* from CSRF validation (OAuth flow exemption)
- Return 403 with code EBADCSRFTOKEN on CSRF validation failure
- Ensure CSRF cookie is set on all responses (page loads and GET requests)

**Files modified:**
- src/middleware.ts - Added CSRF validation layer before auth logic
- package.json - Added @edge-csrf/nextjs dependency
- package-lock.json - Dependency lockfile update

### Task 2: CSRF Token Injection and Silent Retry (commit 24ba660)
- Added getCsrfToken() helper to read _csrf_token cookie from document.cookie
- Added CSRF_METHODS constant (POST, PUT, PATCH, DELETE) for mutation method detection
- Auto-inject X-CSRF-Token header for all mutation requests to non-auth endpoints
- Implemented silent retry on CSRF failure (403 + EBADCSRFTOKEN code):
  1. Clone response and parse body to detect CSRF error
  2. Fetch fresh CSRF cookie via lightweight GET to /api/auth/session
  3. Wait 100ms for cookie propagation
  4. Retry request with fresh token (once only)
  5. Show error toast "Session error, please refresh the page" on persistent CSRF failure
- CSRF retry does not count against maxRetries (separate concern like 401 refresh)

**Files modified:**
- src/lib/fetch-with-retry.ts - Added CSRF token injection and silent retry logic

## Verification

All success criteria met:

1. ✅ POST/PUT/PATCH/DELETE requests to non-auth API routes are rejected without valid CSRF token (403 + EBADCSRFTOKEN code)
2. ✅ fetchWithRetry automatically attaches CSRF token from cookie to mutation requests
3. ✅ On CSRF failure, fetchWithRetry silently refreshes token and retries — user never sees the error
4. ✅ Auth routes (/api/auth/*) remain CSRF-exempt
5. ✅ Build succeeds with no TypeScript errors (npx tsc --noEmit passes)

**Build status:** ✓ Compiled successfully (28.2 kB middleware bundle)

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### CSRF Token Flow
1. Middleware sets _csrf_token cookie on every response (page loads, GET requests, API calls)
2. Client reads token from cookie using getCsrfToken() before mutation
3. Client sends token in X-CSRF-Token header for POST/PUT/PATCH/DELETE requests
4. Middleware validates token signature and freshness
5. On failure: client fetches fresh token via GET, retries mutation once
6. On persistent failure: show toast, preserve UI state (no redirect)

### Per-Session Tokens Design Decision
Per-session tokens (not per-request) were chosen to reduce token rotation frequency and avoid race conditions with concurrent mutations. The dashboard already has robust session handling via 401 refresh flow, so adding CSRF rotation would increase complexity without proportional security gain.

### Authentication Route Exemption
All /api/auth/* routes are excluded from CSRF validation because:
- OAuth callback flow cannot include CSRF tokens (external redirect from Discord)
- Session refresh endpoint (/api/auth/refresh) is called automatically by fetchWithRetry during CSRF retry
- Logout endpoint should work even if CSRF token is stale
- Auth endpoints already protected by other mechanisms (OAuth state parameter, refresh token rotation)

### Silent Retry UX Pattern
CSRF failures are invisible to users during normal operation:
- First CSRF failure: Silent retry with fresh token (no toast, no error message)
- Second consecutive failure: Show toast "Session error, please refresh the page"
- User's form state is preserved (no redirect, no page reload)
- Matches existing 401 refresh retry pattern for consistency

## Technical Debt

None introduced. The @edge-csrf/nextjs package is deprecated but still functional and the plan specified this exact version. Future migration to a maintained CSRF library should be considered but is not blocking.

## Self-Check

**Verifying created files exist:**
- (No new files created - only modified existing files)

**Verifying modified files exist:**
```bash
[ -f "src/middleware.ts" ] && echo "FOUND: src/middleware.ts" || echo "MISSING: src/middleware.ts"
[ -f "src/lib/fetch-with-retry.ts" ] && echo "FOUND: src/lib/fetch-with-retry.ts" || echo "MISSING: src/lib/fetch-with-retry.ts"
[ -f "package.json" ] && echo "FOUND: package.json" || echo "MISSING: package.json"
```

**Verifying commits exist:**
```bash
git log --oneline --all | grep -q "2458885" && echo "FOUND: 2458885" || echo "MISSING: 2458885"
git log --oneline --all | grep -q "24ba660" && echo "FOUND: 24ba660" || echo "MISSING: 24ba660"
```

**Self-check results:**
- FOUND: src/middleware.ts
- FOUND: src/lib/fetch-with-retry.ts
- FOUND: package.json
- FOUND: 2458885
- FOUND: 24ba660

## Self-Check: PASSED

All files and commits verified successfully.
