---
phase: 19-auth-hardening-resilience
plan: "03"
subsystem: fetch-resilience
tags: [mutation-retry, connection-banner, 503-retry, gap-closure]
dependency_graph:
  requires: [19-02]
  provides: [mutation-503-retry-5x, connection-issues-banner-reachable]
  affects: [fetch-with-retry, accounts-page]
tech_stack:
  added: []
  patterns: [inner-loop-retry, dedicated-counter, narrowed-early-return]
key_files:
  modified:
    - src/lib/fetch-with-retry.ts
    - src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx
decisions:
  - "Mutation 503 retry uses self-contained inner loop with mutationAttempt counter (1..5), fully independent of outer DEFAULT_MAX_RETRIES=3 bound"
  - "Early return narrowed from 'isError' to 'isError && !data' — polling failures fall through to ConnectionIssuesBanner inline render"
metrics:
  duration: 51s
  completed_date: "2026-02-23"
  tasks_completed: 2
  files_modified: 2
---

# Phase 19 Plan 03: Gap Closure — Mutation Retry Count and ConnectionIssuesBanner Reachability Summary

**One-liner:** Dedicated inner loop for mutation 503 retries reaching exactly 5 attempts, and narrowed early-return guard making ConnectionIssuesBanner reachable on polling failures.

## What Was Built

Two targeted source file fixes that close the two remaining verification gaps from Phase 19:

### Gap 1 Closed: Mutation 503 Retry Inner Loop

**File:** `src/lib/fetch-with-retry.ts`

The original mutation 503 block used `attempt < MUTATION_MAX_RETRIES` where `attempt` came from the outer for-loop bounded by `DEFAULT_MAX_RETRIES=3`. This meant mutation 503 retries were effectively capped at 3, not the intended 5.

The fix replaces the outer-loop-dependent `continue` with a self-contained inner loop:

```typescript
if (!canRetryRequest && response.status === 503) {
  for (let mutationAttempt = 1; mutationAttempt <= MUTATION_MAX_RETRIES; mutationAttempt++) {
    // ... retry with CSRF re-injection
  }
  return response; // All 5 retries exhausted
}
```

Key properties:
- `mutationAttempt` counter is independent — runs 1..5 regardless of `DEFAULT_MAX_RETRIES`
- `calculateBackoff(mutationAttempt - 1)` preserves 0-indexed exponential backoff calculation
- Each retry re-injects CSRF token (same pattern as outer loop)
- Non-503 retry response returns immediately
- Network errors during retry continue the loop unless all retries exhausted
- After all 5 retries fail with 503, the original 503 response is returned to caller

### Gap 2 Closed: ConnectionIssuesBanner Reachability

**File:** `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`

The original early return `if (isError) { return <full-page error UI> }` fired for ALL error states, preventing execution from reaching `ConnectionIssuesBanner` at line 273.

The fix narrows the condition to `if (isError && !data)`:

- `isError && !data` (initial load failure): early return fires, full-page error UI shown — correct behavior
- `isError && !!data` (polling failure after prior success): early return skipped, normal render path runs, `ConnectionIssuesBanner` renders inline with stale data visible underneath

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Fix mutation 503 retry to use dedicated counter reaching 5 retries | 162438d | src/lib/fetch-with-retry.ts |
| 2 | Make ConnectionIssuesBanner reachable by restructuring error early return | 8a7a3bd | src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx |

## Verification Results

1. TypeScript compilation: `npx tsc --noEmit` passes cleanly after both changes
2. Gap 1 closed: `MUTATION_MAX_RETRIES=5` is the binding constraint via dedicated inner loop; old `attempt < MUTATION_MAX_RETRIES` pattern removed
3. Gap 2 closed: `ConnectionIssuesBanner` at line 273 is structurally reachable when `isError=true && data` is truthy
4. No regressions: initial load error still shows full-page error UI; GET retry behavior unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/lib/fetch-with-retry.ts: FOUND
- src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx: FOUND
- 19-03-SUMMARY.md: FOUND
- Commit 162438d: FOUND
- Commit 8a7a3bd: FOUND
