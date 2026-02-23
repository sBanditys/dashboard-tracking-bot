---
phase: 21-csrf-hmac-signing
plan: 01
subsystem: auth
tags: [csrf, hmac, crypto-subtle, web-crypto, jwt, middleware, next.js]

# Dependency graph
requires:
  - phase: 17-error-envelope
    provides: proxy.ts middleware foundation and CSRF cookie infrastructure
provides:
  - HMAC-signed CSRF token generation via crypto.subtle (Web Crypto API)
  - JTI extraction from auth_token JWT cookie for session binding
  - Graceful fallback to plain 64-char hex tokens when secret/jti absent
  - CSRF_HMAC_SECRET constant with CSRF_HMAC_SECRET || INTERNAL_API_SECRET fallback chain
affects:
  - backend Phase 37 HMAC validation contract (backend must match token format)
  - Any future phase touching CSRF token generation or validation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Web Crypto API (crypto.subtle) for HMAC-SHA256 signing in Edge middleware — no node:crypto dependency"
    - "Session-bound CSRF tokens: randomValue.hmac format (129 chars) binding token to user JTI"
    - "Graceful fallback: return plain 64-char hex randomValue when CSRF_HMAC_SECRET or jti is absent"

key-files:
  created: []
  modified:
    - src/proxy.ts

key-decisions:
  - "CSRF_HMAC_SECRET falls back to INTERNAL_API_SECRET for backward compatibility (single env var covers both use cases)"
  - "Per-request crypto.subtle.importKey — no module-scope CryptoKey caching (avoids secret rotation issues)"
  - "Double-submit cookie check kept intact alongside HMAC (belt-and-suspenders per locked decision)"
  - "Fallback to plain random token when jti or secret absent — silent degradation, no errors"

patterns-established:
  - "generateHmacCsrfToken(jti): async, returns randomValue.hmac or plain randomValue — call with await at CSRF cookie site"
  - "extractJtiFromAuthToken(request): reads auth_token cookie (not dashboard_at), base64url-decodes payload, returns payload.jti string or null"
  - "Hex encoding: Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')"

requirements-completed: [AUTH-01]

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 21 Plan 01: CSRF HMAC Signing Summary

**HMAC-signed CSRF tokens via crypto.subtle in Next.js middleware: randomValue.hmac format (129 chars) session-bound to JWT jti, with graceful fallback when secret or session is absent**

## Performance

- **Duration:** 1 min 3s
- **Started:** 2026-02-23T19:26:10Z
- **Completed:** 2026-02-23T19:27:13Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `generateHmacCsrfToken(jti)`: async function using `crypto.getRandomValues` + `crypto.subtle.importKey/sign` to produce HMAC-SHA256 signed tokens in `randomValue.hmac` format matching backend Phase 37 contract
- Added `extractJtiFromAuthToken(request)`: parses `auth_token` cookie JWT (base64url decode), extracts `jti` field for session binding — returns null on any error (graceful)
- Added `CSRF_HMAC_SECRET` constant with fallback chain (`CSRF_HMAC_SECRET || INTERNAL_API_SECRET || ''`)
- Wired call site: replaced `crypto.randomUUID()` for CSRF with `await generateHmacCsrfToken(extractJtiFromAuthToken(request))` — `crypto.randomUUID()` now only for nonce and requestId (2 occurrences)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HMAC token generation and JTI extraction to proxy.ts** - `1ee5a0c` (feat)
2. **Task 2: Wire HMAC token generation into the CSRF cookie call site** - `36f1757` (feat)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified
- `src/proxy.ts` - Added CSRF_HMAC_SECRET constant, extractJtiFromAuthToken, generateHmacCsrfToken; wired HMAC generation at CSRF cookie call site

## Decisions Made
- CSRF_HMAC_SECRET falls back to INTERNAL_API_SECRET: single env var `INTERNAL_API_SECRET` covers both internal auth and CSRF HMAC without requiring separate config
- No module-scope CryptoKey caching: per-request `crypto.subtle.importKey` is safe and avoids issues when rotating secrets
- Double-submit cookie check preserved: middleware checks cookie === header BEFORE backend validates HMAC (belt-and-suspenders, fast-fail tampered requests)
- Silent fallback: no logging when falling back to plain tokens — graceful degradation for local dev without secrets

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
- Set `CSRF_HMAC_SECRET` env var to match backend's CSRF_HMAC_SECRET (or use shared `INTERNAL_API_SECRET` as fallback)
- Backend Phase 37 must be deployed with dual-check mode (accepts both plain UUID and HMAC tokens) before these HMAC tokens are in production

## Next Phase Readiness
- Dashboard now generates HMAC-signed CSRF tokens ready for backend Phase 37 HMAC validation
- Backend Phase 37 dual-check mode must be confirmed live before production deployment
- No further frontend changes needed for CSRF HMAC — token format contract is complete

---
*Phase: 21-csrf-hmac-signing*
*Completed: 2026-02-23*
