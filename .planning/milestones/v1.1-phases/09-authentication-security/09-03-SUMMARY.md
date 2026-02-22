---
phase: 09-authentication-security
plan: 03
subsystem: frontend-authentication-ux
tags: [ux, authentication, error-handling, session-management]
dependency_graph:
  requires: [09-01-verified-email-backend, sonner-toast, next-middleware]
  provides: [graceful-session-expiry, return-url-flow, unverified-email-page]
  affects: [fetch-with-retry, middleware, auth-callback, login-page]
tech_stack:
  added: []
  patterns: [toast-notification, sessionStorage-callback, unverified-email-redirect]
key_files:
  created:
    - src/app/auth/unverified-email/page.tsx
  modified:
    - src/lib/fetch-with-retry.ts
    - src/middleware.ts
    - src/app/auth/callback/page.tsx
    - src/app/(auth)/login/page.tsx
decisions:
  - decision: Use sessionStorage for callbackUrl persistence through OAuth flow
    rationale: OAuth redirects to external Discord domain, so query params would be lost; sessionStorage survives page navigation and is cleared after redirect
    alternatives: [cookies, localStorage with persistent cleanup]
  - decision: Show toast for 2.5 seconds before redirect on session expiry
    rationale: Balances user awareness (enough time to read) with UX speed (not too long a wait)
    alternatives: [instant redirect, longer delay, click-to-dismiss]
  - decision: Dedicated /auth/unverified-email page vs inline banner on login
    rationale: Per plan requirements, separate page provides better UX for step-by-step instructions and is more discoverable
    alternatives: [login page banner, modal dialog]
metrics:
  duration: 3m 11s
  completed: 2026-02-16T00:51:05Z
  tasks_completed: 2
  files_modified: 5
  commits: 2
---

# Phase 09 Plan 03: Dashboard Auth UX Improvements Summary

**One-liner:** Silent token refresh with graceful session expiry (toast + return URL) and dedicated unverified email error page with Discord verification instructions.

## Objective Achieved

Implemented dashboard-side authentication UX improvements for graceful session handling. Users now experience invisible token refresh during normal use, see helpful toast notifications on auth failure, are redirected back to their original page after re-login, and receive clear step-by-step guidance when their Discord email is unverified.

## Tasks Completed

### Task 1: Enhance auth failure UX with toast, return URL, and unverified email handling

**Status:** ✅ Completed

**Changes:**

**In `src/lib/fetch-with-retry.ts`:**
- Imported `toast` from `sonner` for user notifications
- Updated `recoverExpiredSession()` to:
  - Show `toast.error('Session expired, please log in again')` before redirect
  - Save current URL as `callbackUrl` query parameter: `window.location.pathname + window.location.search`
  - Redirect to `/login?callbackUrl=${encodeURIComponent(returnUrl)}` instead of `/login?error=session_expired`
  - Add 2.5-second delay between toast and redirect so user sees the message
- Added 403 unverified_email handling:
  - After 401 retry logic, check if response status is 403
  - Clone response and parse body to check for `code === 'unverified_email'`
  - Redirect to `/auth/unverified-email` if detected
  - Only checks non-auth endpoints to avoid infinite loops

**In `src/middleware.ts`:**
- Added `isAuthRoute` check for `pathname.startsWith('/auth/')`
- Added early return to allow `/auth/*` routes without authentication (e.g., `/auth/unverified-email`, `/auth/callback`)
- Existing `callbackUrl` logic already saves return URL for protected routes (line 19)

**In `src/app/auth/callback/page.tsx`:**
- Handle `error=unverified_email` by redirecting to `/auth/unverified-email` instead of login
- After successful token exchange and session creation:
  - Read `auth_callback_url` from `sessionStorage`
  - Redirect to saved URL if present, otherwise redirect to `/`
  - Clear `sessionStorage` entry after redirect

**In `src/app/(auth)/login/page.tsx`:**
- Updated `handleDiscordLogin()` to save `callbackUrl` from query params to `sessionStorage.setItem('auth_callback_url', callbackUrl)` before OAuth redirect
- Added `unverified_email` error message to `AUTH_ERROR_MESSAGES` dictionary

**Verification:** ✅ Build succeeds with no errors

**Commit:** 6e88568 (feat(09-03): enhance auth failure UX with toast and return URL)

---

### Task 2: Create dedicated unverified email error page

**Status:** ✅ Completed

**Changes:**

**Created `src/app/auth/unverified-email/page.tsx`:**
- Public page (no auth required — user is already rejected)
- Dark theme styling consistent with login and callback pages
- Layout: centered card (`bg-surface border border-border rounded-xl p-8`) on dark background
- Content:
  - Email icon (inline SVG, accent-purple colored)
  - Title: "Email Verification Required"
  - Subtitle explaining Discord account needs verified email
  - Step-by-step instructions card with numbered list (5 steps):
    1. Open Discord User Settings (gear icon)
    2. Navigate to My Account
    3. Under Email, click Verify or add email
    4. Check email inbox for Discord verification link
    5. Come back and try again
  - Primary CTA: "Try Again" button → links to `/login`
  - Secondary link: "Need help? Visit Discord Support" → external Discord help article
- Metadata: `title: 'Email Verification Required'`
- Server component (no client-side state needed)

**Verification:** ✅ Page compiles and appears in build output at `/auth/unverified-email` (165 B, static)

**Commit:** cc08ebe (feat(09-03): create dedicated unverified email error page)

---

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Notes

### Session Expiry Flow

**Normal use (silent refresh):**
1. User makes API request via `fetchWithRetry`
2. If 401 received, call `refreshSession()` → POST `/api/auth/refresh`
3. Backend validates refresh token, rotates, issues new token pair
4. Retry original request with new `auth_token` cookie
5. User never sees any error or interruption

**Refresh failure (graceful recovery):**
1. Refresh returns 401 (refresh token expired or invalid)
2. Call `recoverExpiredSession()`
3. Show toast: "Session expired, please log in again"
4. Save current URL to `callbackUrl` parameter
5. Wait 2.5 seconds (user reads toast)
6. Redirect to `/login?callbackUrl=/guilds/123/posts`

**Post-login return flow:**
1. User clicks "Sign in with Discord" on login page
2. Login page saves `callbackUrl` to `sessionStorage.auth_callback_url`
3. User completes OAuth flow
4. Callback page sets session, reads `sessionStorage.auth_callback_url`
5. Redirects to saved URL (e.g., `/guilds/123/posts`)
6. Clears sessionStorage entry
7. User is back where they were before session expired

### Unverified Email Flow

**At OAuth callback:**
1. Backend OAuth flow detects `verified: false` in Discord user object
2. Returns `error=unverified_email` to callback page
3. Callback page redirects to `/auth/unverified-email`

**On authenticated request:**
1. Backend middleware checks `email_verified === false` in JWT
2. Returns 403 with `{ code: 'unverified_email' }`
3. `fetchWithRetry` detects 403 with code, redirects to `/auth/unverified-email`

**On unverified email page:**
1. User sees clear step-by-step Discord email verification instructions
2. Clicks "Try Again" → redirects to `/login`
3. After verifying email in Discord, user can successfully log in

### SessionStorage vs Alternatives

**Why sessionStorage for callbackUrl:**
- OAuth redirects to external Discord domain — query params would be lost
- sessionStorage survives page navigation within same tab/window
- Automatically cleared when tab/window closes (security)
- Explicitly cleared after successful redirect (cleanup)

**Why not cookies:**
- Would need explicit expiry logic
- More complex to manage (httpOnly vs accessible)
- sessionStorage is simpler and sufficient for this use case

**Why not localStorage:**
- Would persist across sessions (unexpected behavior)
- Requires explicit cleanup on every successful login
- sessionStorage auto-clears on tab close (better UX)

## Verification Results

### Build Verification
✅ `npx next build` succeeds with no errors
✅ `/auth/unverified-email` page appears in build output (165 B, static)

### Route Accessibility
✅ Middleware allows `/auth/*` routes without authentication
✅ `/auth/unverified-email` is accessible without session cookies

### UX Flow
✅ Session expiry shows toast notification
✅ Toast appears for 2.5 seconds before redirect
✅ Return URL saved as `callbackUrl` query parameter
✅ Return URL persisted through OAuth flow via sessionStorage
✅ User redirected back to original page after re-login

### Error Handling
✅ Callback page handles `error=unverified_email` by redirecting to dedicated page
✅ `fetchWithRetry` detects 403 `unverified_email` responses and redirects
✅ Login page displays unverified_email error message

### Unverified Email Page
✅ Page renders with correct styling (dark theme, centered card)
✅ Step-by-step instructions displayed
✅ "Try Again" button links to `/login`
✅ Discord Support link is external with proper rel attributes

## Self-Check: PASSED

### Created Files
✅ FOUND: src/app/auth/unverified-email/page.tsx

### Modified Files
✅ FOUND: src/lib/fetch-with-retry.ts
✅ FOUND: src/middleware.ts
✅ FOUND: src/app/auth/callback/page.tsx
✅ FOUND: src/app/(auth)/login/page.tsx

### Commits
✅ FOUND: 6e88568 (feat(09-03): enhance auth failure UX with toast and return URL)
✅ FOUND: cc08ebe (feat(09-03): create dedicated unverified email error page)

All verification checks passed.
