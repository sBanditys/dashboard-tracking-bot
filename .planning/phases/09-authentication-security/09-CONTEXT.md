# Phase 9: Authentication Security - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden backend authentication with refresh token persistence, verified email enforcement, and SQL injection audit. Users get seamless session continuation, clear rejection for unverified emails, and all dashboard backend routes are protected against SQL injection. No new auth features — this hardens what exists.

</domain>

<decisions>
## Implementation Decisions

### Refresh Token Flow
- Silent background refresh — user never sees token expiry during normal use
- On refresh failure: show "Session expired, please log in again" toast, then redirect to login after 2-3 seconds
- Refresh token TTL: 30 days before requiring full re-login
- Return URL preserved: after re-login, redirect back to the page user was on

### Unverified Email Rejection
- Dedicated error page (not a banner on login page) when unverified email detected
- Page includes step-by-step instructions: open Discord settings → Account → verify email
- Enforcement applies to existing sessions too — unverified users are forced out on every request, not just new logins
- Check runs on every authenticated request, not just login

### Auth Failure Experience
- On 401: silently attempt token refresh first, then retry the original request. Only surface error if refresh also fails
- After final auth failure: toast notification + redirect to login with return URL saved
- No form data preservation on session expiry — redirect to login directly (30-day refresh tokens make this rare)

### Claude's Discretion
- Refresh token rotation strategy (rotate every use vs grace period for concurrent tabs)
- Retry button vs login link on unverified email page (pick best CTA)
- Whether to differentiate error UI by type (401 expired vs 403 permission denied) or use consistent pattern
- SQL injection audit scope and parameterization approach (purely technical)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the security implementation. Key UX moments are: silent refresh should be invisible, email verification page should be helpful not punitive, and auth failures should feel graceful (toast + redirect, not jarring).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-authentication-security*
*Context gathered: 2026-02-16*
