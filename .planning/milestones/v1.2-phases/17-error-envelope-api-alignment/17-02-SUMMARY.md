---
phase: 17-error-envelope-api-alignment
plan: 02
subsystem: client-hooks
tags: [error-handling, toast, zod, retry-buttons, typescript, react-query]

# Dependency graph
requires:
  - 17-01 (parseApiError helper from api-error.ts)
provides:
  - All 7 mutation hooks use parseApiError for error extraction
  - Shared Zod v4-native validators file (src/lib/validators.ts)
  - Zod v4 audit documented (zero deprecated v3 patterns in src/)
  - Toast auto-dismiss at 5 seconds globally
  - Retry buttons on all 9 inline data-loading error states
affects:
  - All mutation hooks: toast notifications now show actual backend error messages
  - All inline error states: users can retry without page reload

# Tech tracking
tech-stack:
  added: []
  patterns:
    - parseApiError used in all mutation error blocks (const body = await response.json(); throw new Error(parseApiError(body, fallback)))
    - Zod v4 .check(ctx) pattern with ctx.value and ctx.issues for custom validation
    - Retry button pattern with refetch() wired to React Query refetch

key-files:
  created:
    - src/lib/validators.ts
  modified:
    - src/hooks/use-alerts.ts
    - src/hooks/use-email-alerts.ts
    - src/hooks/use-guilds.ts
    - src/hooks/use-tracking.ts
    - src/hooks/use-bulk-operations.ts
    - src/hooks/use-import.ts
    - src/hooks/use-exports.ts
    - src/app/providers.tsx
    - src/app/(dashboard)/guilds/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/brands/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/posts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
    - src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx
    - src/components/audit/audit-log-table.tsx
    - src/components/bonus/results-tab.tsx
    - src/components/import-export/export-history-list.tsx
    - src/components/alerts/email-config-section.tsx

key-decisions:
  - "parseApiError reads .error field from proxy SanitizedError shape — used via const body = await response.json(); throw new Error(parseApiError(body, fallback))"
  - "Zod v4 .check() uses ctx.value/ctx.issues pattern (not simple predicate) — fixed from plan spec"
  - "Toast auto-dismiss at 5000ms globally in providers.tsx toastOptions"
  - "Retry buttons use refetch() from React Query hook — wired directly, no page reload"

requirements-completed:
  - ERR-01
  - ERR-04

# Metrics
duration: 5min 11s
completed: 2026-02-23
---

# Phase 17 Plan 02: Hook Error Extraction, Zod Audit, Toast Duration, and Retry Buttons Summary

**All 7 mutation hooks fixed to use parseApiError for error extraction, Zod v4 audit complete with shared validators file, toast auto-dismiss set to 5s, and retry buttons added to all 9 inline error states**

## Performance

- **Duration:** 5 min 11s
- **Started:** 2026-02-23T00:18:09Z
- **Completed:** 2026-02-23T00:23:20Z
- **Tasks:** 3
- **Files modified:** 17 (7 hooks + 1 new validator file + 1 provider + 9 pages/components)

## Accomplishments

- Fixed all 7 mutation hook files (use-alerts, use-email-alerts, use-guilds, use-tracking, use-bulk-operations, use-import, use-exports) to use `parseApiError(body, fallback)` instead of `error.message || fallback` — backend error messages now propagate correctly to toast notifications
- Changed variable name from `error` to `body` in all error blocks to avoid shadowing catch parameters
- Created `src/lib/validators.ts` with Zod v4-native schemas: `emailSchema` (z.email), `uuidSchema` (z.uuid), `urlSchema` (z.url), `guildIdSchema` (custom .check(ctx)), `nonEmptyString` (custom .check(ctx)), and `formatZodErrors` helper using v4 `.issues`
- Documented Zod v4 audit: zero deprecated v3 patterns found in src/ as of 2026-02-23
- Configured toast auto-dismiss to 5 seconds via `duration: 5000` in providers.tsx `toastOptions`
- Added "Try again" retry buttons (wired to `refetch()`) to all 9 inline data-loading error states across pages and components

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix all hooks to use parseApiError helper for error extraction** - `1dfcabe` (feat)
2. **Task 2: Complete Zod v4 audit, create shared validators, and configure toast duration** - `f5cdbf4` (feat)
3. **Task 3: Add retry buttons to all inline error states missing them** - `682f1ec` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified

**Created:**
- `src/lib/validators.ts` — Zod v4-native shared validators with email, UUID, URL, guildId, nonEmptyString schemas and formatZodErrors helper

**Modified (hooks):**
- `src/hooks/use-alerts.ts` — Added parseApiError import; fixed 4 error extraction locations
- `src/hooks/use-email-alerts.ts` — Added parseApiError import; fixed 4 error extraction locations
- `src/hooks/use-guilds.ts` — Added parseApiError import; fixed 3 error extraction locations
- `src/hooks/use-tracking.ts` — Added parseApiError import; fixed 3 error extraction locations (useDeleteAccount, useAddAccount, useAddBrand)
- `src/hooks/use-bulk-operations.ts` — Added parseApiError import; fixed 2 error extraction locations
- `src/hooks/use-import.ts` — Added parseApiError import; fixed 2 error extraction locations (including useConfirmImport's cast pattern)
- `src/hooks/use-exports.ts` — Added parseApiError import; normalized 1 location (was already reading .error but also trying .message)

**Modified (provider):**
- `src/app/providers.tsx` — Added `duration: 5000` to ThemedToaster toastOptions

**Modified (pages and components with retry buttons):**
- `src/app/(dashboard)/guilds/page.tsx` — Destructure refetch from useGuilds(); add retry button
- `src/app/(dashboard)/guilds/[guildId]/brands/page.tsx` — Destructure refetch from useBrands(); add retry button
- `src/app/(dashboard)/guilds/[guildId]/posts/page.tsx` — Destructure refetch from usePostsInfinite(); add retry button
- `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx` — Destructure refetch from useAccountsInfinite(); add retry button
- `src/app/(dashboard)/guilds/[guildId]/manage/alerts/page.tsx` — Destructure refetch from useAlertThresholds(); add retry button
- `src/components/audit/audit-log-table.tsx` — Destructure refetch from useAuditLog(); add retry button
- `src/components/bonus/results-tab.tsx` — Destructure refetch from useBonusResults(); add retry button
- `src/components/import-export/export-history-list.tsx` — Destructure refetch from useExportHistory(); add retry button
- `src/components/alerts/email-config-section.tsx` — Destructure refetch from useEmailConfig(); add compact retry button (xs size, inline with error text)

## Decisions Made

- `parseApiError` reads `.error` field — this is the proxy SanitizedError shape `{ error: string, code? }`, confirmed in Plan 01
- Variable renamed from `error` to `body` in all error blocks — avoids shadowing the `error` parameter in outer catch blocks
- Zod v4 `.check()` uses `ctx` payload with `ctx.value` and `ctx.issues` (not a simple predicate returning boolean) — plan spec had the old signature; auto-fixed during Task 2 execution
- Toast duration of 5 seconds applied globally via `toastOptions.duration` — individual toasts can still override
- Retry buttons use `refetch()` directly from the React Query hook, not `window.location.reload()` — more targeted and consistent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect Zod v4 .check() API signature in validators.ts**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** The plan spec used `.check((val) => /regex/.test(val), 'message')` which is not the Zod v4.3.6 API. Zod v4's `.check()` takes a single function with a `ctx` parameter that has `ctx.value` (the string to test) and `ctx.issues` (array to push custom issues into). The return type must be `void`, not `boolean`.
- **Fix:** Updated guildIdSchema and nonEmptyString to use `(ctx) => { if (!test) ctx.issues.push({ code: 'custom', message: '...', input: ctx.value }) }` pattern
- **Files modified:** src/lib/validators.ts
- **Verification:** npx tsc --noEmit passes
- **Committed in:** f5cdbf4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect Zod v4 API signature)
**Impact on plan:** Critical fix — the plan's .check() signature was written for a different API. Using the correct ctx pattern produces identical runtime behavior.

## Issues Encountered

None beyond the auto-fixed Zod API deviation. All tasks completed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 17 is now complete — all error paths from backend to toast notification work correctly
- ERR-01 (hooks use parseApiError), ERR-02 (dual envelope parsing), ERR-03 (CSRF rename), ERR-04 (Zod audit) all marked complete
- The error envelope infrastructure is production-ready for v1.2

---
*Phase: 17-error-envelope-api-alignment*
*Completed: 2026-02-23*
