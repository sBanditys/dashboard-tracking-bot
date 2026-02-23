---
phase: 19-auth-hardening-resilience
plan: 02
subsystem: frontend-resilience
tags: [rate-limiting, retry, ux, error-handling, fetch, hooks]
depends-on: []
provides: [mutation-503-retry, split-rate-limit-buckets, rate-limit-banner, connection-issues-banner, isRetrying-hooks]
affects: [fetch-with-retry, mutation-hooks, guild-settings-form, dashboard-layout, accounts-page]
tech-stack:
  added: []
  patterns: [useState-isRetrying, useRef-didRetry, onRetry-callback, sessionStorage-persistence, custom-event-dispatch]
key-files:
  created:
    - src/components/rate-limit-banner.tsx
    - src/components/connection-issues-banner.tsx
  modified:
    - src/lib/fetch-with-retry.ts
    - src/hooks/use-guilds.ts
    - src/hooks/use-tracking.ts
    - src/hooks/use-alerts.ts
    - src/hooks/use-email-alerts.ts
    - src/hooks/use-bulk-operations.ts
    - src/hooks/use-import.ts
    - src/hooks/use-exports.ts
    - src/components/forms/guild-settings-form.tsx
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
decisions:
  - "Split globalRateLimitUntil into pollingRateLimitUntil + mutationRateLimitUntil — prevents polling 429 from blocking user-initiated mutations"
  - "sessionStorage persists polling rate limit cooldown across page refreshes; dispatches rate-limit-updated custom event for reactive banner"
  - "MUTATION_MAX_RETRIES=5 for 503 retries; existing GET retry behavior unchanged (additive block)"
  - "didRetryRef pattern prevents 'Changes saved' toast on non-retry successes — normal success toasts already handle the baseline case"
  - "ConnectionIssuesBanner uses isError && hasData gate — distinguishes polling failures from initial load failures"
  - "RateLimitBanner is inline (not fixed banner) in main content area; uses amber color to distinguish from OfflineBanner red"
metrics:
  duration: "418s"
  completed: "2026-02-23"
  tasks: 2
  files: 11
requirements:
  - AUTH-03
  - AUTH-04
---

# Phase 19 Plan 02: Mutation Retry, Rate Limit Split, and Resilience Banners Summary

Mutation 503 retry with blocking UI overlay, split polling/mutation rate limit buckets with sessionStorage persistence, and user-facing banners for 429 cooldowns and 503 polling errors.

## What Was Built

### Task 1: fetchWithRetry Hardening

Modified `src/lib/fetch-with-retry.ts` with three additive changes:

**Split rate limit buckets:**
- Replaced single `globalRateLimitUntil` with `pollingRateLimitUntil` (GET/HEAD/OPTIONS) and `mutationRateLimitUntil` (POST/PUT/PATCH/DELETE)
- `getRateLimitRemainingMs(isMutation)` and `setRateLimitCooldown(ms, isMutation)` now route to correct bucket
- Background polling 429 no longer blocks user-initiated mutations

**sessionStorage persistence:**
- `pollingRateLimitUntil` written to `sessionStorage` as `polling_rate_limit_until` on each 429
- Restored on module load (survives page refresh)
- `rate-limit-updated` custom event dispatched after write (reactive banner trigger)

**Mutation 503 retry:**
- New `MUTATION_MAX_RETRIES = 5` constant
- New block after the existing GET retry block: retries mutation 503s with exponential backoff
- `onRetry(attempt, maxAttempts)` and `onRetrySettled()` callbacks added to config type
- Network error catch block also fires `onRetry` for mutations

### Task 2: Hook, Overlay, and Banner Integration

**14 mutation hooks across 7 files updated** with `isRetrying` state:
- `use-guilds.ts`: `useUpdateGuildSettings`, `useDeleteAccount`, `useDeleteBrand`
- `use-tracking.ts`: `useDeleteAccount`, `useAddAccount`, `useAddBrand`
- `use-alerts.ts`: `useCreateThreshold`, `useDeleteThreshold`, `useToggleThreshold`, `useUpdateAlertSettings`, `useBulkToggleThresholds`, `useBulkDeleteThresholds`
- `use-email-alerts.ts`: `useUpdateEmailConfig`, `useAddRecipient`, `useRemoveRecipient`, `useResendVerification`
- `use-bulk-operations.ts`: `useBulkDelete`, `useBulkReassign`
- `use-import.ts`: `useImportPreview`
- `use-exports.ts`: `useCreateExport`

Each hook uses the pattern:
- `useState<boolean>(false)` for `isRetrying`
- `useRef(false)` for `didRetryRef` (prevents "Changes saved" on non-retry successes)
- `onRetry`: sets `isRetrying=true`, `didRetryRef=true`, shows `toast.loading('Retrying...', { id: 'mutation-retry', duration: Infinity })` on first retry
- `onRetrySettled`: sets `isRetrying=false`
- `onSuccess`/`onError`: dismisses `mutation-retry` toast only when `didRetryRef.current` is true

**GuildSettingsForm overlay:**
- Imports `Loader2` from lucide-react
- Added `relative` to outer div
- Renders `isRetrying && <div className="absolute inset-0 z-10 ...">` with spinner

**RateLimitBanner** (`src/components/rate-limit-banner.tsx`):
- Reads `polling_rate_limit_until` from sessionStorage on mount
- Listens for `rate-limit-updated` custom event for reactive display
- 1-second countdown interval: shows `"Data updates paused — resuming in Xm Xs"`
- Auto-hides and cleans sessionStorage when countdown reaches 0
- Rendered in `src/app/(dashboard)/layout.tsx` after `<Breadcrumbs />`

**ConnectionIssuesBanner** (`src/components/connection-issues-banner.tsx`):
- Props: `{ isError: boolean; hasData: boolean }`
- Only shows when `isError && hasData` (polling failure after previous success)
- Inline amber banner with `AlertCircle` icon: `"Connection issues — retrying..."`
- Wired into `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`

## Decisions Made

1. **Split rate limit buckets**: `pollingRateLimitUntil` and `mutationRateLimitUntil` are independent — a background polling 429 no longer prevents the user from saving settings.

2. **sessionStorage for polling cooldown**: Survives page refresh, enabling the RateLimitBanner to show on remount. Mutation cooldowns are in-memory only (transient by nature).

3. **MUTATION_MAX_RETRIES=5**: Consistent with plan spec. The existing GET retry loop uses `maxRetries` (default 3); the mutation 503 block uses its own cap of 5 to allow more recovery attempts.

4. **didRetryRef pattern**: `useRef` tracks whether a retry occurred per mutation invocation. Resets to `false` after `onSuccess`/`onError`. Prevents spurious "Changes saved" toasts on normal operations.

5. **ConnectionIssuesBanner gate (isError && hasData)**: Distinguishes polling failures from initial load failures. Without `hasData` guard, the banner would flash on every fresh page load when there's a temporary error.

6. **RateLimitBanner inline placement**: Rendered inside `<main>` after `<Breadcrumbs />`, not as a fixed banner — distinct from the existing `OfflineBanner` which is fixed to the top. Inline placement scrolls with content and avoids z-index conflicts.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist:
- [ ] `src/components/rate-limit-banner.tsx` — check below
- [ ] `src/components/connection-issues-banner.tsx` — check below

### Commits exist:
- 28cabf4: feat(19-02): split rate limit buckets and add mutation 503 retry with onRetry callback
- d9e96e8: feat(19-02): add isRetrying to mutation hooks, blocking overlay, rate limit and connection banners
