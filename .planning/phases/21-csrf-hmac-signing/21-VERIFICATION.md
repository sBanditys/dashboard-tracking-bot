---
phase: 21-csrf-hmac-signing
verified: 2026-02-23T21:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 21: CSRF HMAC Signing Verification Report

**Phase Goal:** Server-to-server mutations send cryptographically signed CSRF tokens that the backend can verify with HMAC
**Verified:** 2026-02-23T21:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A mutation proxied through middleware sends an HMAC-signed CSRF token (`randomValue.hmac` format) when `CSRF_HMAC_SECRET` is configured and user is authenticated | VERIFIED | `generateHmacCsrfToken` at lines 127-154 produces `${randomValue}.${hmac}` (129 chars) when `jti` and `CSRF_HMAC_SECRET` are both present. Called with `await` at line 261 inside the `proxy` function. |
| 2 | When `CSRF_HMAC_SECRET` is not set, middleware falls back to plain random tokens (64-char hex) without errors | VERIFIED | `if (!jti || !CSRF_HMAC_SECRET) { return randomValue; }` at line 134-136. `CSRF_HMAC_SECRET` constant at line 15 defaults to `''` when neither env var is set, so the condition always triggers on empty secret. |
| 3 | The HMAC signature is computed over `jti:randomValue` using the shared secret, matching the backend csrf.ts contract exactly | VERIFIED | Payload construction at line 149: `` const payload = `${jti}:${randomValue}`; `` signed via `crypto.subtle.sign('HMAC', key, encoder.encode(payload))` at line 150. Matches backend Phase 37 contract. `crypto.subtle` used throughout — no `node:crypto` import present. |
| 4 | The existing double-submit cookie check (cookie === header) remains intact and runs before HMAC generation | VERIFIED | Double-submit check at lines 187-197 is unchanged (`cookieToken !== headerToken` → 403 with `EBADCSRFTOKEN`). HMAC token generation at lines 260-262 runs after the check, as part of setting the response cookie. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/proxy.ts` | HMAC CSRF token generation, JTI extraction, async token flow | VERIFIED | Contains `CSRF_HMAC_SECRET` constant (line 15), `extractJtiFromAuthToken` function (lines 107-120), `generateHmacCsrfToken` async function (lines 127-154), and wired call site (lines 260-262). File is substantive (359 lines). No stubs or placeholders. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/proxy.ts` (`generateHmacCsrfToken`) | backend `csrf.ts` (`validateHmacCsrfToken`) | HMAC-SHA256 over `jti:randomValue` with shared `CSRF_HMAC_SECRET` | VERIFIED | `crypto.subtle.sign` at line 150; payload `${jti}:${randomValue}` at line 149; hex encoding via `Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')` at line 151. Matches backend contract exactly. |
| `src/proxy.ts` (`extractJtiFromAuthToken`) | `request.cookies` `auth_token` | JWT payload parsing for `jti` field | VERIFIED | `request.cookies.get('auth_token')?.value` at line 109. Base64url decode at line 114-115. `payload.jti` type guard at line 116. Try/catch returns `null` on any error. |
| `src/proxy.ts` (`setCsrfCookie` call) | `generateHmacCsrfToken` | `await` at line 261 call site | VERIFIED | Lines 260-262: `const jti = extractJtiFromAuthToken(request); const csrfToken = await generateHmacCsrfToken(jti); setCsrfCookie(response, csrfToken);` — replaces the previous `setCsrfCookie(response, crypto.randomUUID())`. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 21-01-PLAN.md | Proxy layer generates HMAC-signed CSRF tokens using `crypto.subtle` and `INTERNAL_API_SECRET` for server-to-server mutations, matching backend Phase 37 HMAC validation | SATISFIED | `generateHmacCsrfToken` uses `crypto.subtle.importKey` + `crypto.subtle.sign` (lines 140-151). `CSRF_HMAC_SECRET` constant uses `INTERNAL_API_SECRET` as fallback (line 15). `crypto.randomUUID()` now only appears twice, both for nonce (line 174) and requestId (line 175) — not for CSRF. REQUIREMENTS.md marks AUTH-01 as `[x] Complete` for Phase 21. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TODOs, FIXMEs, placeholders, console.log calls, or stub returns found in `src/proxy.ts`. |

### Minor Deviation (Non-Blocking)

The PLAN specified `if (parts.length !== 3) return null;` in `extractJtiFromAuthToken`, but the implementation uses `if (parts.length < 2) return null;` (line 112). This is a functionally equivalent or more permissive guard — `parts[1]` (the JWT payload) is still safely accessible for any token with 2+ parts, and the surrounding `try/catch` handles any malformed JSON. The `typeof payload.jti === 'string'` type guard at line 116 further protects the return value. This is not a bug and does not affect correctness.

### Human Verification Required

The following item cannot be verified programmatically and requires a live environment:

**1. End-to-end mutation succeeds with HMAC validation enabled on the backend**

- **Test:** With `CSRF_HMAC_SECRET` set to the same value in both dashboard and backend, log in as a user, submit a mutation (e.g., save guild settings), and confirm the request succeeds with HTTP 200 rather than 403.
- **Expected:** The mutation succeeds. The `csrf_token` cookie and `X-CSRF-Token` header both contain a 129-char `randomValue.hmac` token. The backend HMAC validation accepts it.
- **Why human:** Cannot run the Next.js middleware or the Express backend locally from a verification script. The HMAC token format can be verified by code inspection (done above), but whether the backend Phase 37 dual-check mode is deployed and configured with the matching secret requires a live environment test.

### Gaps Summary

No gaps found. All four observable truths are verified. The single required artifact (`src/proxy.ts`) exists, is substantive, and all three key links are wired. Requirement AUTH-01 is satisfied. No new npm dependencies were added (verified via `git diff` of `package.json` — no changes). TypeScript compiles with zero errors. `crypto.randomUUID()` appears exactly 2 times (nonce + requestId), not for CSRF token generation.

The implementation matches the PLAN contract precisely:
- Token format: `randomValue.hmac` (129 chars) when authenticated with secret configured
- Fallback: plain 64-char hex randomValue when `jti` or `CSRF_HMAC_SECRET` is absent
- Uses `crypto.subtle` (Web Crypto API) exclusively — no `node:crypto` or new npm packages
- `CSRF_HMAC_SECRET` env var with fallback to `INTERNAL_API_SECRET` (line 15)
- Double-submit cookie check (cookie === header) preserved and runs before HMAC token generation

---

_Verified: 2026-02-23T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
