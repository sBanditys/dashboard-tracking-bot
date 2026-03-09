---
phase: 25-campaign-types-proxy-routes-hooks
plan: 01
subsystem: api
tags: [campaigns, proxy-routes, typescript, zod, next-api-routes]

requires:
  - phase: 24-tech-debt-shared-utilities
    provides: shared centsToDisplay utility, clean error envelope pattern
provides:
  - Campaign TypeScript types and Zod schemas for all 12 endpoint response shapes
  - 9 proxy route files covering 12 campaign endpoints (list, CRUD, analytics, payouts, export)
  - ConflictError class for 409 optimistic-lock handling
affects: [25-02-hooks, 26-campaign-list, 27-campaign-detail, 28-campaign-payouts, 29-campaign-export]

tech-stack:
  added: []
  patterns:
    - "camelCase campaign types matching backend wire format (differs from bonus/tracking snake_case)"
    - "204 No Content DELETE handling without response.json() call"
    - "Status code forwarding for 201/202 responses"

key-files:
  created:
    - src/types/campaign.ts
    - src/app/api/guilds/[guildId]/campaigns/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/analytics/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/route.ts
    - src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]/route.ts
  modified: []

key-decisions:
  - "camelCase field naming in campaign types to match backend wire format (not snake_case like bonus/tracking)"

patterns-established:
  - "Campaign proxy routes follow identical pattern to accounts/brands routes with backendFetch + sanitizeError"
  - "DELETE routes check for 204 before calling response.json()"
  - "POST/export routes forward backend status codes (201, 202) to preserve semantics"

requirements-completed: [CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08, CAMP-09, ANAL-01, ANAL-02, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, EXP-01, EXP-02]

duration: 2min
completed: 2026-03-09
---

# Phase 25 Plan 01: Campaign Types & Proxy Routes Summary

**Campaign TypeScript types with Zod validation schemas and 9 proxy route files covering all 12 campaign API endpoints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T17:20:35Z
- **Completed:** 2026-03-09T17:22:20Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Complete campaign type system with 16 interfaces/types covering all backend response shapes
- Zod schemas for create and update campaign request validation with sensible defaults
- ConflictError class for 409 optimistic-lock handling in future hooks
- 9 proxy route files with proper error sanitization, status code forwarding (201/202/204)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create campaign TypeScript types, enums, Zod schemas, and ConflictError** - `c4213f6` (feat)
2. **Task 2: Create all 9 campaign proxy route files** - `e8c76b7` (feat)

## Files Created/Modified
- `src/types/campaign.ts` - All campaign domain types, Zod schemas, ConflictError class (212 lines)
- `src/app/api/guilds/[guildId]/campaigns/route.ts` - Campaign list GET + create POST
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/route.ts` - Campaign detail GET + update PATCH + DELETE
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/analytics/route.ts` - Analytics GET with cursor pagination
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/route.ts` - Payouts list GET
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/history/route.ts` - Payout history GET
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/mark-paid/route.ts` - Mark single paid POST
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/payouts/bulk/route.ts` - Bulk mark paid POST
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/route.ts` - Trigger export POST (202)
- `src/app/api/guilds/[guildId]/campaigns/[campaignId]/export/[exportId]/route.ts` - Export status GET

## Decisions Made
- camelCase field naming in campaign types to match backend wire format (not snake_case like bonus/tracking)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All types and proxy routes ready for Plan 02 (React Query hooks layer)
- ConflictError class ready for optimistic-lock retry logic in useCampaignMutations hook

## Self-Check: PASSED

All 10 files verified present. Both task commits (c4213f6, e8c76b7) verified in git log.

---
*Phase: 25-campaign-types-proxy-routes-hooks*
*Completed: 2026-03-09*
