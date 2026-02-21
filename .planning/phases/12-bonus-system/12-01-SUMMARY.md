---
phase: 12-bonus-system
plan: 01
subsystem: bonus-data-layer
tags: [typescript, react-query, proxy-routes, bonus, data-layer]
dependency_graph:
  requires: []
  provides:
    - src/types/bonus.ts
    - src/hooks/use-bonus.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/results/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/[paymentId]/route.ts
    - src/app/api/guilds/[guildId]/bonus/leaderboard/route.ts
  affects:
    - phase 12 plans 02-04 (all UI plans consume this data layer)
tech_stack:
  added: []
  patterns:
    - Load More pagination with accumulated state (not useInfiniteQuery)
    - Optimistic payment toggle with onMutate snapshot + onError revert
    - Sonner undo toast for payment reversal (5s duration)
    - Query key factory for cache consistency across mutations
    - Notes auto-save sends full paid+notes payload to avoid race conditions
key_files:
  created:
    - src/types/bonus.ts
    - src/hooks/use-bonus.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/results/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk/route.ts
    - src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/[paymentId]/route.ts
    - src/app/api/guilds/[guildId]/bonus/leaderboard/route.ts
  modified: []
decisions:
  - "Week start: Sunday (verified from backend weekBoundary.ts getWeekStart uses dayOfWeek=0); date-fns default weekStartsOn:0 matches"
  - "Leaderboard All time: use weeks=52 (backend leaderboardQuerySchema max is 52, not 9999)"
  - "useBonusRounds uses accumulated useState pattern (not useInfiniteQuery) per Load More UX decision"
  - "useUpdatePaymentNotes sends full paid+notes payload to avoid concurrent-request race condition (Pitfall 4)"
  - "Static /payments/bulk/ route in separate directory from dynamic /payments/[paymentId]/ — Next.js resolves static first automatically"
metrics:
  duration: "4m 7s"
  completed: "2026-02-21"
  tasks: 2
  files: 8
---

# Phase 12 Plan 01: Bonus Data Layer Summary

Complete data layer for bonus system — TypeScript types, 6 proxy API routes, and 8 React Query hooks with optimistic payment updates and Load More pagination.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Bonus TypeScript types and API proxy routes | eaf0c87 | src/types/bonus.ts + 6 route files |
| 2 | React Query hooks for all bonus operations | 764ffbb | src/hooks/use-bonus.ts |

## What Was Built

### src/types/bonus.ts

12 TypeScript exports covering all bonus domain entities:

- `RoundFilter` — `'all' | 'evaluated' | 'pending'` filter type
- `BonusTarget` — target within a round (id, group, target_views, actual_views, achieved, delta)
- `BonusPayment` — payment within a round (id, group, amount_cents, paid, paid_at, paid_by, notes)
- `BonusRound` — list item shape from GET /bonus/rounds (includes targets array)
- `BonusRoundDetail` — extends BonusRound with evaluated_by + payments array
- `BonusRoundsResponse` — `{ rounds, next_cursor, has_more }` cursor pagination
- `BonusRoundDetailResponse` — `{ round: BonusRoundDetail }`
- `BonusResultTarget` — result row with brand_label, delta_percent, near_miss, payment ref
- `BonusResultsResponse` — `{ round, summary, results }` with full stats
- `BonusLeaderboardEntry` — leaderboard row with hit_rate_percent, total_paid_cents
- `BonusLeaderboardResponse` — `{ leaderboard, meta }` with weeks/since/totals
- `CreateBonusRoundRequest` — POST body shape

### 6 API Proxy Routes

All follow established pattern: `backendFetch` + `sanitizeError`/`internalError` + `Cache-Control: no-store` on GETs.

| Route | Methods | Backend Endpoint |
|-------|---------|-----------------|
| `/api/guilds/[guildId]/bonus/rounds` | GET, POST | `/api/v1/guilds/:guildId/bonus/rounds` |
| `/api/guilds/[guildId]/bonus/rounds/[roundId]` | GET | `/api/v1/guilds/:guildId/bonus/rounds/:roundId` |
| `/api/guilds/[guildId]/bonus/rounds/[roundId]/results` | GET | `/api/v1/.../results` |
| `/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk` | PATCH | `/api/v1/.../payments/bulk` |
| `/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/[paymentId]` | PATCH | `/api/v1/.../payments/:paymentId` |
| `/api/guilds/[guildId]/bonus/leaderboard` | GET | `/api/v1/guilds/:guildId/bonus/leaderboard` |

Static `payments/bulk/` directory takes precedence over dynamic `payments/[paymentId]/` in Next.js App Router automatically.

### src/hooks/use-bonus.ts

10 exports:

- `bonusKeys` — query key factory (prevents cache key mismatch across mutations)
- `centsToDisplay(cents)` — formats cents as `$X.XX`
- `useBonusRounds(guildId, filter)` — Load More pagination with accumulated state; resets on filter change
- `useBonusRoundDetail(guildId, roundId, enabled)` — lazy fetch with staleTime 30s
- `useBonusResults(guildId, roundId, enabled)` — lazy fetch, only when Results tab active + evaluated
- `useBonusLeaderboard(guildId, weeks)` — staleTime 30s; weeks=52 = All time
- `useCreateBonusRound(guildId)` — POST with rounds invalidation + success toast
- `useUpdatePayment(guildId)` — optimistic toggle (onMutate snapshot + onError revert); undo warning toast for unpay
- `useBulkUpdatePayments(guildId)` — PATCH bulk with roundDetail invalidation + success toast
- `useUpdatePaymentNotes(guildId)` — notes auto-save sends paid+notes together (race condition prevention)

## Key Discoveries

**Week start confirmed as Sunday.** Backend `weekBoundary.ts` uses `dayOfWeek = date.getDay()` with `daysToSubtract = dayOfWeek`, which means Sunday (day 0) = week start. `date-fns` default `weekStartsOn: 0` matches — no override needed in UI plans.

**Leaderboard max weeks = 52.** Backend `leaderboardQuerySchema` has `.max(52)`. "All time" preset should use `weeks=52`, not 9999.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created

- FOUND: src/types/bonus.ts
- FOUND: src/hooks/use-bonus.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/rounds/route.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/route.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/results/route.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/bulk/route.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/rounds/[roundId]/payments/[paymentId]/route.ts
- FOUND: src/app/api/guilds/[guildId]/bonus/leaderboard/route.ts

### Commits

- FOUND: eaf0c87 (feat(12-01): add bonus TypeScript types and API proxy routes)
- FOUND: 764ffbb (feat(12-01): add React Query hooks for all bonus operations)

### TypeScript

- Only pre-existing error in .next/dev/types/validator.ts (unrelated exports/page.js reference)
- All bonus files compile without errors

## Self-Check: PASSED
