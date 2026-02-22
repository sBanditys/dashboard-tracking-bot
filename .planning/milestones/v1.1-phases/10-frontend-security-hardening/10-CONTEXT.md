# Phase 10: Frontend Security Hardening - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement CSRF protection, Content-Security-Policy headers, and backend error sanitization in the dashboard frontend. All mutation requests include CSRF tokens, CSP prevents inline script execution, and no stack traces or internal paths leak to the client. Users see contextual, user-friendly error messages.

</domain>

<decisions>
## Implementation Decisions

### Error presentation
- Contextual error messages that describe WHAT failed (e.g., "Failed to load tracking data", "Could not save settings") — not generic "something went wrong"
- Display location depends on context: toast for background/fetch failures, inline at the component for user-initiated actions (form submit, button click)
- No stack traces, internal paths, or technical details exposed to the client

### CSP policy scope
- Enforce CSP immediately (no report-only warm-up period)
- Claude audits codebase to discover any third-party resources (fonts, CDNs) and includes them in the allowlist
- Full security headers suite beyond CSP: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

### Security failure UX
- CSRF failure: silent retry with a fresh token — user never sees the initial failure
- Persistent CSRF failure escalation: Claude's discretion on whether to show error toast or force re-login
- 403 forbidden: inline permission message in-place ("You don't have permission to view this") with link back to guild overview
- Security error logging: Claude's discretion on which security events are worth logging to audit trail vs being noise

### CSRF token handling
- All state-changing requests require CSRF token: POST, PUT, PATCH, DELETE
- CSRF validation in both layers: dashboard proxy (Next.js) generates/validates AND backend double-checks (defense in depth)
- Token scope (per-session vs per-request): Claude's discretion based on security/complexity tradeoff
- Token transmission format (cookie + header vs cookie + form field): Claude's discretion based on SPA architecture fit

### Claude's Discretion
- CSP inline style handling (unsafe-inline vs nonces) — audit codebase to determine what's needed
- Retry button inclusion on transient errors vs keeping errors action-free
- 5xx server error handling (stay on page with toast vs error page for primary data failures)
- CSRF token scope (per-session vs per-request)
- CSRF transmission mechanism (likely cookie + custom header for SPA)
- Which security violations to log to DashboardAuditLog

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-frontend-security-hardening*
*Context gathered: 2026-02-16*
