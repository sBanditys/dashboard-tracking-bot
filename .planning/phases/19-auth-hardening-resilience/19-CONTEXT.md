# Phase 19: Auth Hardening & Resilience - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-rendered pages authenticate correctly against the backend, and transient backend failures (503, 429) no longer block users from saving changes. Covers SSR auth cookie forwarding, mutation retry with user feedback, and separating polling rate limits from mutation rate limits.

</domain>

<decisions>
## Implementation Decisions

### Mutation retry (503 handling)
- Auto-retry mutations with toast notification (not manual retry)
- 5 retry attempts with exponential backoff before showing final failure
- Generic "Retrying..." message in toast (no attempt count, no countdown)
- Blocking overlay on the form/section during retries — user cannot edit while retrying
- Edits blocked during retry (consistent with blocking overlay)
- On successful retry after failures, show a "Changes saved" success toast
- If user navigates away during retry, retry continues in background and toast follows to new page
- Cancel button on overlay and mutation type differentiation: Claude's discretion
- Overlay visual style (dimmed section vs full overlay): Claude's discretion
- Final failure state after 5 attempts exhausted: Claude's discretion
- Backoff timing visibility (countdown vs generic): Claude's discretion
- Network errors (backend unreachable) vs 503: Claude's discretion
- Mutation queuing strategy (queue vs latest-wins): Claude's discretion

### Read retry (503 handling)
- Reads (polling, page loads) that get 503 show a subtle indicator — small banner at top of section: "Connection issues — retrying..."
- Banner auto-dismisses when reads start succeeding again
- Reads retry silently in background behind the banner

### Rate limit feedback (429 handling)
- Show subtle indicator when background polling hits 429: banner with countdown ("Data updates paused — resuming in Xm")
- Use Retry-After header value from backend to set cooldown duration
- Cooldown persists across page refresh (sessionStorage)
- Mutations and polling should have separate rate limit tracking so polling 429s don't block user saves (separation strategy: Claude's discretion)
- Rate limit banner style (same as 503 or distinct): Claude's discretion
- Banner auto-dismiss behavior when cooldown expires: Claude's discretion

### SSR auth failure
- 401 or missing/expired cookie during SSR: redirect to login page
- After re-login, redirect user back to the page they were originally trying to access (return URL)
- Show explanation on login page: "Your session expired — please log in again"
- Token validation strategy (forward-only vs check-expiry-first): Claude picks best approach for security and preventing abuse
- SSR 503 handling (loading shell vs server-side retry): Claude's discretion

### Client-side auth failure
- Client-side requests that return 401 also redirect to login (consistent with SSR behavior)
- Handling of unsaved changes during 401 redirect: Claude's discretion
- Global vs per-component 401 interceptor architecture: Claude's discretion

</decisions>

<specifics>
## Specific Ideas

- Token validation approach should prioritize security and preventing attacks/abuse over convenience
- Retry toast should feel non-anxious — generic "Retrying..." is intentional to avoid stressing users with attempt counts
- Rate limit banner should show countdown to recovery so users know when fresh data returns
- The blocking overlay during mutation retry is preferred to avoid conflicting edits

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-auth-hardening-resilience*
*Context gathered: 2026-02-23*
