---
phase: 22-performance-optimization
plan: "01"
subsystem: build-config, react-query
tags: [performance, next-config, stale-time, react-query]
dependency_graph:
  requires: []
  provides: [optimizePackageImports config, normalized staleTime across hooks]
  affects: [next.config.mjs, 4 hook files]
tech_stack:
  added: []
  patterns: [experimental.optimizePackageImports, staleTime 2min for non-polling queries]
key_files:
  created: []
  modified:
    - next.config.mjs
    - src/hooks/use-audit-log.ts
    - src/hooks/use-bonus.ts
    - src/hooks/use-exports.ts
    - src/hooks/use-alerts.ts
decisions:
  - "Hooks with refetchInterval (use-guilds status queries, use-sessions) retain 30s staleTime unchanged — background freshness intentional"
  - "use-alerts.ts staleTime raised despite refetchOnWindowFocus:true — window focus refetch is opt-in user action, not a polling loop"
metrics:
  duration: "61s"
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_modified: 5
---

# Phase 22 Plan 01: Package Import Optimization and staleTime Normalization Summary

**One-liner:** Adds experimental.optimizePackageImports for lucide-react and recharts, and raises staleTime from 30s to 2min on 7 non-polling React Query list queries across 4 hook files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add optimizePackageImports to next.config.mjs | 6604f18 | next.config.mjs |
| 2 | Normalize staleTime across React Query hooks | efdaab2 | use-audit-log.ts, use-bonus.ts, use-exports.ts, use-alerts.ts |

## What Was Built

### Task 1: next.config.mjs — optimizePackageImports
Added `experimental.optimizePackageImports: ['lucide-react', 'recharts']` as the first property in `nextConfig`. The existing `withBundleAnalyzer` wrapper, `images`, and `headers` configs were left untouched. Both packages appear on Next.js 16's default optimization list, but explicit config satisfies PERF-01 and makes the setting auditable.

### Task 2: staleTime Normalization
Raised `staleTime: 30 * 1000` to `staleTime: 2 * 60 * 1000` on 7 queries in 4 files:

- **use-audit-log.ts** (1 query): audit log list — entries are historical, not real-time
- **use-bonus.ts** (4 queries): rounds list, round detail, results, leaderboard — all infrequently changing data
- **use-exports.ts** (1 query): export history pagination — historical records
- **use-alerts.ts** (1 query): alert thresholds infinite query — configuration data

Hooks intentionally left unchanged (have `refetchInterval`):
- `use-guilds.ts` line 64: `useGuildStatus` — 30s staleTime + 60s refetchInterval
- `use-guilds.ts` line 118: `useGuildStatusRealtime` — 30s staleTime + conditional refetchInterval
- `use-sessions.ts` line 27: `useSessions` — 30s staleTime + 60s refetchInterval

## Verification Results

1. `grep -q "optimizePackageImports" next.config.mjs` — PASS
2. Remaining 30s staleTime locations: only use-guilds.ts (lines 64, 118) and use-sessions.ts (line 27) — all have refetchInterval — PASS
3. `npm run build` — completed without errors — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files created/modified
- [x] next.config.mjs — FOUND
- [x] src/hooks/use-audit-log.ts — FOUND
- [x] src/hooks/use-bonus.ts — FOUND
- [x] src/hooks/use-exports.ts — FOUND
- [x] src/hooks/use-alerts.ts — FOUND

### Commits
- [x] 6604f18 — chore(22-01): add optimizePackageImports for lucide-react and recharts
- [x] efdaab2 — perf(22-01): raise staleTime from 30s to 2min on non-polling hooks

## Self-Check: PASSED
