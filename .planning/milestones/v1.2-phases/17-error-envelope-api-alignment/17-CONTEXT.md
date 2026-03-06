# Phase 17: Error Envelope & API Alignment - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

All API errors display correctly regardless of envelope shape (old `{ error: string }` vs new `{ error: { code, message } }`), CSRF cookie name aligned with backend (`csrf_token`), and deprecated Zod v3 patterns replaced with v4 equivalents across the full codebase. No new user-facing features — error handling infrastructure and code modernization only.

</domain>

<decisions>
## Implementation Decisions

### Error Message Display
- **Display location:** Toasts for mutation errors, inline for data-loading errors
- **Detail level:** Show backend's human-readable message when available, fall back to generic "An unexpected error occurred. Please try again later." for unparseable responses
- **Unverified email redirect:** Brief toast ("Please verify your email") then redirect after 1-2 seconds
- **Toast behavior:** Dismissible + auto-dismiss after 5s (user can click X or wait)
- **Inline errors:** Always show a "Try again" retry button in error state
- **Rate limit (429):** Show countdown with specific timing (e.g., "Too many requests. Please wait 30 seconds.")
- **Auth errors (401/403):** Toast "Session expired" then redirect to login
- **Network errors:** Distinct message — "Unable to connect. Check your internet connection."
- **HTML safety:** Strip HTML tags from error messages before displaying
- **Validation errors:** Show all field errors at once (not one at a time)
- **Error styling:** Same style for all error types (no visual distinction between client/server errors)
- **Console logging:** Log full error details in development only, silent in production

### Backward Compatibility Window
- **Dual-parse lifespan:** Transitional — support both envelope shapes now, add TODO comments for old-shape removal in v1.3
- **CSRF cookie name:** Hard switch to `csrf_token` — no fallback to old `_csrf_token` name
- **TypeScript approach:** Typed discriminated union (`OldErrorEnvelope | NewErrorEnvelope`) with type guards
- **TODO tracking:** Code comments (`// TODO(v1.3): Remove old envelope support`) AND deferred requirement in REQUIREMENTS.md
- **Testing:** Dedicated unit tests for both envelope shapes; tests removed when old shape support is removed in v1.3

### Zod v4 Audit
- **Scope:** Full codebase sweep — find and replace every deprecated Zod v3 pattern
- **Organization:** Extract common validators (email, UUID, etc.) to a shared validation utils file with user-friendly custom error messages
- **Edge cases:** Fix everything now, including complex cases — no TODOs for later
- **v4 adoption:** Use Zod v4's `.check()` and other new patterns where they improve readability, not just minimal replacements
- **Verification:** Runtime tests to verify key schemas still parse correctly after migration
- **Reporting:** Brief changelog of what patterns were replaced and where, documented in the commit/PR
- **Shared file location:** Claude's discretion based on project structure conventions

### Claude's Discretion
- Toast stacking behavior (stack vs replace)
- Error message max length / truncation
- Mutation retry button inclusion (case-by-case)
- Dual-parse priority order (new vs old shape first)
- Code organization of parse logic (centralized vs per-site)
- Shared validators file path

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Remove old error envelope shape support — v1.3 (after backend fully migrates to new shape)
- Full Zod v4 rewrite beyond pattern replacement — already noted as out of scope in REQUIREMENTS.md

</deferred>

---

*Phase: 17-error-envelope-api-alignment*
*Context gathered: 2026-02-22*
