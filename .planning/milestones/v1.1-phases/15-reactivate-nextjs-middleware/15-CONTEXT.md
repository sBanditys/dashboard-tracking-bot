# Phase 15: Reactivate Next.js Middleware - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Reactivate Next.js middleware to restore CSRF cookie issuance, CSP header injection, and auth redirects for all routes. This closes the root cause gap from the v1.1 audit (middleware was inactive). No new security features — restoring what should already be active.

</domain>

<decisions>
## Implementation Decisions

### CSP Policy Rules
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

### Security Header Suite
- Full security header suite alongside CSP:
  - Strict-Transport-Security: max-age=31536000; includeSubDomains (1 year + subdomains)
  - Referrer-Policy: strict-origin-when-cross-origin
  - X-Content-Type-Options: nosniff
  - X-Frame-Options (Claude picks appropriate value)
  - Permissions-Policy (Claude determines which features to restrict)

### CSP Violation Reporting
- Webhook endpoint via CSP_REPORT_URI env var
- Claude decides: proxy through API route vs direct, report-to vs report-uri, report deduplication, payload enrichment
- Rate limiting on reports is required

### CSP Testing
- Automated E2E tests to verify CSP doesn't break functionality
- Tests should cover all routes in the app
- Claude picks the E2E framework and test depth

### Auth Redirect Behavior
- Unauthenticated users redirect to / (landing page)
- Preserve return URL: redirect to /?returnTo=/original/path so users land back after login
- Protected routes: everything except / and /login
- Auth detection method: Claude checks existing auth setup and uses whatever pattern is in place
- API route auth handling: Claude determines best approach

### CSRF Token Scope
- _csrf_token cookie set on all page routes
- Token generation method: Claude picks best approach
- Cookie accessibility (HttpOnly vs JS-readable): Claude decides based on existing frontend patterns
- Token rotation strategy: Claude decides
- CSRF validation applies to all state-changing methods: POST, PUT, DELETE, PATCH
- CSRF exemptions: Claude determines necessary exemptions (e.g., OAuth callback)

### Route Matching & Middleware Behavior
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

</decisions>

<specifics>
## Specific Ideas

- CSP violation webhook URL should come from CSP_REPORT_URI environment variable
- HSTS with 1 year max-age and includeSubDomains — standard production setting
- Referrer-Policy: strict-origin-when-cross-origin — balanced approach
- Cache-Control: no-store on authenticated pages to prevent caching sensitive data
- X-Request-ID for cross-service tracing between Next.js and Express backend
- Google Fonts allowed (fonts.gstatic.com)
- Discord CDN + data: URIs for images
- WebSocket connections must be allowed in CSP
- E2E tests should cover all routes, not just critical ones

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-reactivate-nextjs-middleware*
*Context gathered: 2026-02-22*
