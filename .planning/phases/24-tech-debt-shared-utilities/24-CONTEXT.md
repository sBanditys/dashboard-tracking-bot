# Phase 24: Tech Debt & Shared Utilities - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean slate for campaign work — remove dead code, fix a security issue (open redirect), wire an existing component to the posts page, and extract a shared utility. No new features; all items are cleanup or extraction of existing code.

</domain>

<decisions>
## Implementation Decisions

### validators.ts (DEBT-04)
- Delete the entire file — all 6 exports (emailSchema, uuidSchema, urlSchema, guildIdSchema, nonEmptyString, formatZodErrors) are dead code with 0 imports
- Campaign forms in Phase 27 will define their own Zod schemas; no need to preserve anything

### formatCents extraction
- Move `centsToDisplay` from `src/hooks/use-bonus.ts` to new `src/lib/format.ts`
- Keep the name `centsToDisplay` — no rename
- Update all 5 bonus component imports directly to `@/lib/format` — no re-export indirection in use-bonus.ts
- Only `centsToDisplay` in format.ts — no speculative helpers. Campaign phases add more as needed

### Error envelope cleanup (DEBT-01)
- Strip old flat envelope paths only — do not simplify/inline the remaining new-envelope logic
- Remove `b.code` fallback in `extractErrorCode()` (fetch-with-retry.ts lines 129-143)
- Remove `BackendError` interface and flat-shape fallback in `extractBackendError()` (error-sanitizer.ts)
- Remove all `TODO(v1.3)` comments and update JSDoc to describe only the new envelope shape

### Callback redirect fix (DEBT-02)
- Relative paths only — callbackUrl must start with `/` to be accepted
- If validation fails, silently redirect to `/` (dashboard home) — no toast or error message
- No same-origin URL check needed; all legitimate callbacks in this app use relative paths

### Claude's Discretion
- ConnectionIssuesBanner placement on posts page (DEBT-03) — straightforward wiring, same pattern as accounts page
- Exact ordering of cleanup tasks within plans
- Whether to split into one or multiple plans

</decisions>

<specifics>
## Specific Ideas

No specific requirements — all items have clear success criteria in the roadmap. Implementation follows existing patterns established in prior milestones.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ConnectionIssuesBanner` component (`src/components/connection-issues-banner.tsx`, 31 lines) — already used on accounts page, needs wiring to posts page
- `centsToDisplay` function (`src/hooks/use-bonus.ts` lines 37-42) — extraction target, used by 5 bonus components

### Established Patterns
- Error sanitizer uses new Stripe-inspired envelope: `{ error: { code, message, requestId } }`
- `extractErrorCode()` in fetch-with-retry.ts used at 3 call sites (CSRF checking, unverified email redirect)
- ConnectionIssuesBanner takes `isError` and `hasData` props, placed after GuildTabs in page layout

### Integration Points
- `src/lib/fetch-with-retry.ts` (469 lines) — extractErrorCode at lines 129-143, used at lines 308, 329, 345
- `src/lib/server/error-sanitizer.ts` (175 lines) — dual envelope support at lines 14-64
- `src/app/auth/callback/page.tsx` (164 lines) — callbackUrl redirect at lines 123-133
- `src/app/(dashboard)/guilds/[guildId]/posts/page.tsx` (424 lines) — missing ConnectionIssuesBanner
- 5 bonus components importing centsToDisplay from use-bonus.ts: leaderboard-tab, create-round-modal, payments-tab, results-tab, round-card

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-tech-debt-shared-utilities*
*Context gathered: 2026-03-09*
