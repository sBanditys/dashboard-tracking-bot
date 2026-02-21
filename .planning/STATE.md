# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.
**Current focus:** Phase 12 - Bonus System

## Current Position

Phase: 12 of 13 (Bonus System)
Plan: 4 of 4 completed in current phase (Plans 02, 03, 04 run as Wave 2)
Status: In Progress
Last activity: 2026-02-21 — Completed 12-04-PLAN.md (Bonus Leaderboard Tab)

Progress: [█████████░░░░░░░░░░░] 60/TBD (Phase 1-8 complete from v1.0, Phase 9: 3/3 plans complete, Phase 10: 3/3 plans complete, Phase 11: 2/2 plans complete, Phase 12: 1/4 plans complete, Phase 13: 5/5 plans complete)

## Performance Metrics

**Velocity (v1.0 only):**
- Total plans completed: 47
- Average duration: 2m 02s
- Total execution time: ~89m 43s

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | 17m 25s | 4m 26s |
| 02 | 2 | 1m 35s | 48s |
| 03 | 5 | 10m 44s | 2m 09s |
| 04 | 3 | 4m 24s | 1m 28s |
| 05 | 6 | 13m 04s | 2m 11s |
| 06 | 5 | 7m 38s | 1m 32s |
| 07 | 9 | 15m 30s | 1m 43s |
| 08 | 7 | 16m 25s | 2m 21s |

**v1.1 Status:**
- Phase 9 complete (3 of 3 plans completed)
- Plan velocity tracking started

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 13-01 | 3m 49s | 3 | 16 |
| 11-02 | 1m 38s | 2 | 3 |
| 11-01 | 2m 14s | 2 | 7 |
| 10-03 | 3m 15s | 2 | 3 |
| 10-02 | 5m 37s | 2 | 25 |
| 10-01 | 2m 30s | 2 | 4 |
| 09-03 | 3m 11s | 2 | 5 |
| 09-02 | 2m 33s | 2 | 2 |
| 09-01 | 6m 6s | 2 | 7 |
| 13-02 | 3m | 2 | 7 |
| 13-05 | 2m 59s | 2 | 5 |
| 13-03 | 3m | 3 | 6 |
| 13-04 | 2min | 2 | 4 |
| 13-06 | 2m 42s | 2 | 4 |
| Phase 12-bonus-system P01 | 4m 7s | 2 tasks | 8 files |
| Phase 12-bonus-system P03 | 3m 37s | 2 tasks | 2 files |
| Phase 12-bonus-system P04 | 3m 20s | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **v1.0 Architecture**: Dashboard acts as middleware proxy to backend API at ~/Desktop/Tracking Data Bot/
- **v1.0 Security**: Multi-tenant isolation enforced at API layer, dashboard validates JWT guild access
- **v1.1 Focus**: Security hardening FIRST (AUTH requirements in Phases 9-10) before feature work
- **10-03 (CSP Headers)**: Content-Security-Policy with nonce-based script-src and strict-dynamic, style-src unsafe-inline for NProgress/inline styles, img-src includes cdn.discordapp.com, full security headers suite (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- **10-02 (Error Sanitization)**: Contextual error messages (e.g., "Failed to load accounts") instead of generic "something went wrong", preserve error codes for client logic, block stack traces/file paths/Prisma errors via regex detection
- **10-01 (CSRF Protection)**: Per-session CSRF tokens via @edge-csrf/nextjs, silent retry on validation failure, auth routes exempt
- **09-03 (Auth UX)**: sessionStorage for callbackUrl through OAuth flow, 2.5s toast delay, dedicated unverified-email page
- **09-02 (SQL Injection)**: All raw SQL queries confirmed safe - use Prisma.sql template tags for parameterization
- **09-01 (Verified Email)**: Email verification enforced via JWT email_verified claim, backward compatible migration (60min expiry)
- **11-01 (Session Management Data Layer)**: Server-side UA parsing for device detection, IP prefix matching for current session, React Query hooks with 30s staleTime and 60s refetch
- [Phase 11]: Always show revoke button even for current session - dialog warns user they'll be logged out
- [Phase 11]: Trigger fade/scale animation immediately on revoke for responsive feel
- **13-01 (Alert & Import Data Layer)**: Platform enum cast via Object.values(Platform) validation before Prisma where clause; SSE streaming proxy uses new NextResponse(response.body); multipart upload uses arrayBuffer() + original Content-Type header; CSV template preserves Content-Disposition from backend
- [Phase 13]: 13-02: useConfirmImport uses fetch + ReadableStream (not EventSource) for POST-SSE streaming; ManageLayout is client component for useUser() permission check; no optimistic update for useToggleThreshold
- **13-05 (Import UI)**: ImportTab uses 8-state flow machine; 409 conflict detected via error message string matching; ImportHistory shows stub when no entries; data page uses local useState for tab switching
- **13-03 (Alert Thresholds UI)**: Non-optimistic toggle with spinner; page-level TypeToConfirmModal with removingId fade-out animation; groups list derived from loaded threshold data; duplicate detection warns but does not block submission
- [Phase 13]: 13-04: activeAction prop on ThresholdBulkBar shows spinner only on triggered button; EmailConfigSection uses confirm() for remove; AlertSettingsPanel tracks pendingField for per-toggle spinners; selection clears on filter change
- **13-06 (Export Tab UI)**: Client-side SSE cancel via EventSource.close() in ref; context-aware filters per export type; quota estimated from today's history count; ProgressSection sub-component consumes useExportProgress internally to avoid parent re-renders on SSE ticks
- [Phase 12-bonus-system]: Week start confirmed as Sunday (weekBoundary.ts dayOfWeek=0); date-fns default weekStartsOn:0 matches — no override needed
- [Phase 12-bonus-system]: Leaderboard All time uses weeks=52 (backend leaderboardQuerySchema max is 52)
- [Phase 12-bonus-system]: All time preset uses weeks=52 (not 9999) per backend leaderboardQuerySchema max constraint
- [Phase 12-bonus-system]: LeaderboardTab createModalOpen state pre-declared in page.tsx so Plan 03 activation only requires uncommenting import+JSX

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 9 (Backend Security):** ✅ COMPLETE
- ✅ AUTH-01 (refresh token) - Already implemented with rotate-every-use + transaction-based claim
- ✅ AUTH-02 (verified email) - Completed in 09-01 (OAuth scope check + JWT middleware enforcement)
- ✅ AUTH-03 (dashboard UX) - Completed in 09-03 (graceful session expiry + return URL + unverified email page)
- ✅ AUTH-06 (SQL injection audit) - Completed in 09-02 (all queries use Prisma.sql parameterization)

**Phase 10 (Frontend Security):** ✅ COMPLETE
- ✅ AUTH-03 (CSRF) - Completed in 10-01 (double-submit cookie pattern with silent retry)
- ✅ AUTH-04 (CSP headers) - Completed in 10-03 (nonce-based script-src with strict-dynamic, enforced immediately)
- ✅ AUTH-05 (information disclosure) - Completed in 10-02 (error sanitization blocks stack traces/file paths/internal details)

## Session Continuity

Last session: 2026-02-21 (execute-phase)
Stopped at: Completed 12-04-PLAN.md (Bonus Leaderboard Tab)
Resume file: Phase 12 complete (all 4 plans done)

---
*Last updated: 2026-02-21*
