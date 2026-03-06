# Phase 21: CSRF HMAC Signing - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current random-UUID CSRF tokens with HMAC-signed tokens that the backend can cryptographically verify. The proxy middleware (`proxy.ts`) currently generates `crypto.randomUUID()` and validates via simple double-submit cookie check. This phase upgrades to HMAC signing using `crypto.subtle` and `INTERNAL_API_SECRET`, matching backend Phase 37 HMAC validation. No new npm dependencies.

</domain>

<decisions>
## Implementation Decisions

### Token rotation
- Regenerate HMAC token on every request (matches current per-request UUID behavior)
- Maximum freshness, minimal replay window
- Middleware continues to set a new CSRF cookie on every response

### Middleware validation
- Keep the existing double-submit cookie check in middleware (belt-and-suspenders)
- Middleware fast-fails tampered requests before they hit the backend
- Backend independently validates the HMAC signature

### CSRF failure UX
- On 403 CSRF error: silently auto-retry once with a fresh CSRF token
- No toast or indicator during the retry — seamless for the common stale-token case
- If retry also fails: show persistent error toast (user must refresh and try again)
- 1 retry maximum — covers stale-token without masking real issues

### Deploy coordination
- Ship HMAC tokens immediately — no feature flag or env toggle
- Backend's dual-check mode accepts both old (UUID) and new (HMAC) tokens during transition
- Once backend drops old token support, dashboard is already ready

### Backend forwarding
- API route handlers forward the HMAC-signed token in `X-CSRF-Token` header when proxying to backend
- Applies to all routes that currently forward the plain CSRF token (e.g. refresh endpoint in proxy.ts)

### Missing secret fallback
- If `INTERNAL_API_SECRET` is not set (e.g. local dev), fall back to plain UUID tokens (current behavior)
- Backend dual-check accepts both, so development works without extra config
- No warning or failure — graceful degradation

### Logging
- Silent operation — no logging for normal HMAC generation
- Only log on actual errors (e.g. signing failure)

### Claude's Discretion
- Token expiry window (whether to embed timestamp, and if so, what TTL)
- Session binding strategy (whether to include user/session data in the signed payload or just sign a random nonce)
- Error message wording for persistent CSRF failure toast (match existing app toast patterns)
- HMAC algorithm choice and token format

</decisions>

<specifics>
## Specific Ideas

- Current CSRF flow is in `proxy.ts` lines 100-140 — `setCsrfCookie()` sets the cookie, mutation check validates cookie === header
- `INTERNAL_SECRET` is already available in `proxy.ts` line 9 as `process.env.INTERNAL_API_SECRET`
- Success criteria specify `crypto.subtle` — Web Crypto API, no Node.js crypto module
- Backend Phase 37 defines the HMAC validation contract the dashboard must match

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-csrf-hmac-signing*
*Context gathered: 2026-02-23*
