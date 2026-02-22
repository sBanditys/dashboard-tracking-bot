---
phase: 17-error-envelope-api-alignment
verified: 2026-02-23T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 17: Error Envelope API Alignment Verification Report

**Phase Goal:** All API errors display correctly regardless of envelope shape, and CSRF cookie name is aligned with backend
**Verified:** 2026-02-23
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A backend error from any route displays a readable message in the UI — never `[object Object]` | VERIFIED | `parseApiError` imported and called in all 7 hooks (use-alerts, use-email-alerts, use-guilds, use-tracking, use-bulk-operations, use-import, use-exports); reads `.error` string field from `SanitizedError` proxy shape; `error-sanitizer.ts` uses `extractBackendError` to normalize both envelope shapes before returning `{ error: string }` |
| 2 | An `unverified_email` error triggers the email-verification redirect under both old and new envelope shapes | VERIFIED | `extractErrorCode(body) === 'unverified_email'` at line 309 of `fetch-with-retry.ts`; `extractErrorCode` handles both `{ error: { code } }` (new) and `{ code }` (old) shapes |
| 3 | The CSRF cookie the dashboard reads is named `csrf_token`, matching the backend's cookie name | VERIFIED | Zero `_csrf_token` references in `src/`; `proxy.ts` sets `csrf_token` via `setCsrfCookie()` (line 105), reads it at CSRF validation (line 131), reads it in `refreshTokensFromMiddleware()` (line 70); `fetch-with-retry.ts` reads `csrf_token=` (line 134); `auth/refresh/route.ts` reads `csrf_token` (line 52) |
| 4 | Any deprecated Zod v3 validation patterns have been replaced with v4 equivalents | VERIFIED | Zod audit confirmed zero deprecated patterns (`z.string().email()`, `z.string().uuid()`, `error.errors`) in `src/`; only `src/lib/validators.ts` imports Zod, using v4-native `z.email()`, `z.uuid()`, `z.url()`, `.check(ctx)` with `ctx.issues`; audit result documented in `validators.ts` header comment |

**Score:** 4/4 truths verified

---

### Required Artifacts

#### Plan 17-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/server/error-sanitizer.ts` | Dual-envelope type guard and extraction | VERIFIED | Contains `isNewEnvelope` (line 38) and `extractBackendError` (line 54); `sanitizeError` calls `extractBackendError` at line 132 |
| `src/lib/api-error.ts` | Client-side error extraction; exports `parseApiError` | VERIFIED | Exports `parseApiError`; reads `.error` field; strips HTML tags |
| `src/lib/fetch-with-retry.ts` | Dual-code lookup and CSRF cookie rename | VERIFIED | `extractErrorCode` at line 119; `getCsrfToken()` reads `csrf_token=` at line 134; all CSRF/unverified_email checks use `extractErrorCode(body)` |
| `src/proxy.ts` | CSRF cookie name alignment | VERIFIED | `setCsrfCookie()` uses `'csrf_token'` (line 105); validation reads `'csrf_token'` (line 131); `refreshTokensFromMiddleware()` reads `'csrf_token'` (line 70) |

#### Plan 17-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/use-alerts.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 6; used in 4 mutation locations |
| `src/hooks/use-email-alerts.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 6; used in 4 mutation locations |
| `src/hooks/use-guilds.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 8; used in 3 mutation locations |
| `src/hooks/use-tracking.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 5; used in 3 mutation locations |
| `src/hooks/use-bulk-operations.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 6; used in 2 mutation locations |
| `src/hooks/use-import.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 7; used in 2 mutation locations |
| `src/hooks/use-exports.ts` | `parseApiError` used for error extraction | VERIFIED | Imported at line 7; used in 1 location |
| `src/lib/validators.ts` | Zod v4-native shared validators; contains `z.email` | VERIFIED | Exists; exports `emailSchema` (`z.email`), `uuidSchema` (`z.uuid`), `urlSchema` (`z.url`), `guildIdSchema`, `nonEmptyString`, `formatZodErrors`; uses `.issues` not deprecated `.errors` |
| `src/app/providers.tsx` | Toast auto-dismiss at `duration: 5000` | VERIFIED | `duration: 5000` found at line 89 of `providers.tsx` |

#### Retry Button Artifacts (Plan 17-02 Task 3)

| Component | Status | Evidence |
|-----------|--------|---------|
| `src/app/(dashboard)/guilds/page.tsx` | VERIFIED | `refetch` destructured from `useGuilds()`; "Try again" button at line 21 |
| `src/app/(dashboard)/guilds/[guildId]/brands/page.tsx` | VERIFIED | "Try again" at line 61; `refetch` destructured |
| `src/app/(dashboard)/guilds/[guildId]/posts/page.tsx` | VERIFIED | "Try again" at line 239; `refetch` destructured |
| `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` | VERIFIED | "Try again" at line 245; `refetch` destructured |
| `src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx` | VERIFIED | "Try again" at line 212; `refetch` destructured |
| `src/components/audit/audit-log-table.tsx` | VERIFIED | `refetch` destructured at line 21; `onClick={() => refetch()}` at line 64 |
| `src/components/bonus/results-tab.tsx` | VERIFIED | `refetch` destructured at line 33; `onClick={() => refetch()}` at line 74 |
| `src/components/import-export/export-history-list.tsx` | VERIFIED | `refetch` destructured at line 138; `onClick={() => refetch()}` at line 156 |
| `src/components/alerts/email-config-section.tsx` | VERIFIED | `refetch` destructured at line 52; `onClick={() => refetch()}` at line 146 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/server/error-sanitizer.ts` | API proxy routes | `extractBackendError` called inside `sanitizeError` | VERIFIED | `sanitizeError` is the public export; `extractBackendError` is called at line 132; all proxy route handlers that call `sanitizeError` benefit automatically |
| `src/lib/fetch-with-retry.ts` | `src/proxy.ts` | CSRF cookie name must match between reader and writer | VERIFIED | Both use `csrf_token`; `proxy.ts` writes it via `setCsrfCookie()`; `fetch-with-retry.ts` reads it via `getCsrfToken()`; zero `_csrf_token` references remain |
| `src/hooks/*.ts` | `src/lib/api-error.ts` | `import { parseApiError }` | VERIFIED | All 7 hook files import from `@/lib/api-error` |
| `src/hooks/*.ts` | Toast notifications | `throw new Error(parseApiError(body, fallback))` propagates to `onError` toast | VERIFIED | Every hook follows the pattern: `const body = await response.json(); throw new Error(parseApiError(body, fallback))` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ERR-01 | 17-01 and 17-02 | Dashboard error sanitizer detects both old and new envelope shapes; hooks display actual error messages | SATISFIED | `isNewEnvelope` + `extractBackendError` in `error-sanitizer.ts`; `parseApiError` in all 7 hooks |
| ERR-02 | 17-01 | `fetchWithRetry` `unverified_email` code lookup works with both envelope shapes | SATISFIED | `extractErrorCode(body) === 'unverified_email'` at line 309 of `fetch-with-retry.ts` |
| ERR-03 | 17-01 | CSRF cookie name aligned from `_csrf_token` to `csrf_token` | SATISFIED | Zero `_csrf_token` references in `src/`; all three call sites in `proxy.ts` and `fetch-with-retry.ts` use `csrf_token` |
| ERR-04 | 17-02 | Zod v4 patterns audited; deprecated v3 methods replaced with v4 equivalents | SATISFIED | Zero deprecated patterns found; `validators.ts` uses v4-native `z.email()`, `z.uuid()`, `z.url()`, `.check(ctx)`, `.issues` |

All four phase requirement IDs (ERR-01 through ERR-04) are accounted for and satisfied. No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/fetch-with-retry.ts` | 117 | `// TODO(v1.3): Remove old envelope support (body?.code path)` | Info | Planned cleanup comment — not a blocker; dual-envelope support is intentional during migration |
| `src/lib/server/error-sanitizer.ts` | 15 | `// TODO(v1.3): Remove old envelope support after backend fully migrates` | Info | Planned cleanup comment — not a blocker; intentional |

No blocker or warning anti-patterns found. Both TODOs are intentional migration breadcrumbs, not incomplete implementations.

---

### Human Verification Required

The following behaviors can only be confirmed by running the application:

#### 1. Toast Message Content

**Test:** Trigger a mutation error (e.g., try to delete an account while offline or with a forced 500 response from the backend).
**Expected:** Toast shows the actual backend error message string, not `[object Object]`, `undefined`, or the fallback text when a real message is available.
**Why human:** Cannot verify toast rendering or message content from static analysis.

#### 2. Email Verification Redirect Flow

**Test:** With an account whose email is unverified, trigger any mutation (e.g., update settings). Observe the network response and browser navigation.
**Expected:** Browser navigates to `/auth/unverified-email` when the backend returns `{ code: 'unverified_email' }` in either envelope shape.
**Why human:** The redirect is triggered by `window.location.replace()` which requires a running browser context.

#### 3. CSRF Cookie Visible to JavaScript

**Test:** Open browser devtools → Application → Cookies. After page load, confirm a cookie named `csrf_token` (not `_csrf_token`) is present with `HttpOnly: false`.
**Expected:** Cookie named `csrf_token` is present and readable by JavaScript.
**Why human:** Cookie presence and `HttpOnly` flag require a running browser session.

---

### Commits Verified

All 5 phase commits exist in git history:

| Commit | Description |
|--------|-------------|
| `a6067a8` | feat(17-01): add dual-envelope parsing to error-sanitizer and parseApiError helper |
| `eab9814` | feat(17-01): add extractErrorCode helper and rename CSRF cookie to csrf_token |
| `1dfcabe` | feat(17-02): fix all hooks to use parseApiError for error extraction |
| `f5cdbf4` | feat(17-02): Zod v4 audit, shared validators, and toast auto-dismiss |
| `682f1ec` | feat(17-02): add Try again retry buttons to all inline error states |

---

## Summary

Phase 17 goal is fully achieved. All four success criteria are met:

1. **Error display (ERR-01):** The `sanitizeError` function normalizes both old `{ error: string, code? }` and new `{ error: { code, message } }` backend envelope shapes via `extractBackendError`. All 7 mutation hooks use `parseApiError` to read the `.error` field from proxy responses, ensuring actual backend messages reach toast notifications instead of `[object Object]` or silent fallbacks.

2. **Unverified email redirect (ERR-02):** `fetchWithRetry` uses `extractErrorCode(body) === 'unverified_email'` which handles both envelope shapes, triggering `window.location.replace('/auth/unverified-email')` correctly.

3. **CSRF cookie alignment (ERR-03):** Hard-renamed from `_csrf_token` to `csrf_token` across all four affected locations (`proxy.ts` setCsrfCookie, proxy.ts validation, proxy.ts refreshTokensFromMiddleware, auth/refresh/route.ts). Zero stale `_csrf_token` references remain in `src/`.

4. **Zod v4 audit (ERR-04):** Zero deprecated v3 patterns found in `src/` (outside `validators.ts` itself). Shared `validators.ts` file created with v4-native top-level validators (`z.email`, `z.uuid`, `z.url`) and custom `.check(ctx)` patterns using `.issues` instead of the deprecated `.errors` alias.

TypeScript compiles clean (`npx tsc --noEmit` exits 0). All 9 inline error states have "Try again" retry buttons wired to `refetch()`. Toast auto-dismiss set to 5 seconds globally.

---

_Verified: 2026-02-23_
_Verifier: Claude (gsd-verifier)_
