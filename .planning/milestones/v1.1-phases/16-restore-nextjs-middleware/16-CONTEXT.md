# Phase 16: Restore Next.js Middleware (Undo Regression) - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Undo the regression from commit `2feb03e` which renamed `middleware.ts` to `proxy.ts` and changed the export from `middleware` to `proxy`. Next.js requires exactly `src/middleware.ts` with `export async function middleware` to activate middleware. The rename broke CSRF cookie issuance, CSP header injection, and auth redirects at the SSR level.

</domain>

<decisions>
## Implementation Decisions

### Regression fix approach
- Rename `src/proxy.ts` back to `src/middleware.ts`
- Rename `export async function proxy` to `export async function middleware`
- No logic changes needed — the existing code already implements all required functionality
- Verify Next.js middleware activates by checking CSRF cookie, CSP header, and auth redirects

### Claude's Discretion
- Whether to consolidate any repetitive header-setting patterns during the rename (minor cleanup only)
- Verification approach (manual checks vs automated tests)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — this is a straightforward restoration of previously working functionality.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-restore-nextjs-middleware*
*Context gathered: 2026-02-22*
