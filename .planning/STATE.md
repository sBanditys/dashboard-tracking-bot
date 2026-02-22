# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.
**Current focus:** v1.2 Security Audit & Optimization — Phase 18 (next phase)

## Current Position

Phase: 17 of 23 (Error Envelope & API Alignment) — COMPLETE
Plan: 2 of 2 in current phase — COMPLETE
Status: Phase complete — ready for Phase 18
Last activity: 2026-02-23 — Phase 17 Plan 02 complete (hook error extraction, Zod audit, retry buttons)

Progress: [█░░░░░░░░░] 15% (v1.2) — 72/82 total plans complete across all milestones

## Milestones

- ✅ v1.0 MVP — 8 phases, 47 plans (shipped 2026-02-16)
- ✅ v1.1 Security Hardening — 8 phases, 22 plans (shipped 2026-02-22)
- 🚧 v1.2 Security Audit & Optimization — 7 phases, ~13 plans (in progress)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 47
- Average duration: 2m 02s
- Total execution time: ~89m 43s

**v1.1 Velocity:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| 09-01 | 6m 6s | 2 | 7 |
| 09-02 | 2m 33s | 2 | 2 |
| 09-03 | 3m 11s | 2 | 5 |
| 10-01 | 2m 30s | 2 | 4 |
| 10-02 | 5m 37s | 2 | 25 |
| 10-03 | 3m 15s | 2 | 3 |
| 11-01 | 2m 14s | 2 | 7 |
| 11-02 | 1m 38s | 2 | 3 |
| 12-01 | 4m 7s | 2 | 8 |
| 12-02 | 4m 22s | 2 | 11 |
| 12-03 | 3m 37s | 2 | 2 |
| 12-04 | 3m 20s | 2 | 2 |
| 13-01 | 3m 49s | 3 | 16 |
| 13-02 | 3m | 2 | 7 |
| 13-03 | 3m | 3 | 6 |
| 13-04 | 2m | 2 | 4 |
| 13-05 | 2m 59s | 2 | 5 |
| 13-06 | 2m 42s | 2 | 4 |
| 14-01 | 41s | 1 | 1 |
| 15-01 | 2m 37s | 2 | 5 |
| 15-02 | 58m | 2 | 6 |
| 16-01 | 1m | 2 | 2 |
| Phase 17 P01 | 2m 21s | 2 tasks | 5 files |
| Phase 17 P02 | 311s | 3 tasks | 17 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v1.2 work:
- Phase 21 (CSRF HMAC): Must coordinate with backend Phase 37 dual-check deploy window — ship after backend has dual-check mode enabled
- Phase 20 (Cursor pagination): Gated on backend Phase 39 shipping first — do not migrate hooks before backend is live
- Phase 17 first: Error envelope must ship before any other change — all error paths depend on readable errors
- [Phase 17]: Hard switch on CSRF cookie rename from _csrf_token to csrf_token — no fallback to old name
- [Phase 17]: parseApiError reads .error field (not .message) — proxy SanitizedError always outputs { error: string, code? }
- [Phase 17]: Proxy continues to output old envelope shape { error: string, code? } to clients — only consumes new shape from backend
- [Phase 17]: parseApiError reads .error field from proxy SanitizedError shape — used consistently in all mutation hooks via const body = await response.json(); throw new Error(parseApiError(body, fallback))
- [Phase 17]: Zod v4 .check() uses ctx.value/ctx.issues pattern (not simple predicate) — corrected from plan spec during execution
- [Phase 17]: Toast auto-dismiss at 5000ms globally in providers.tsx toastOptions
- [Phase 17]: Retry buttons use refetch() from React Query hook directly — not window.location.reload()

### Pending Todos

None.

### Blockers/Concerns

- Phase 20 (Cursor pagination): Blocked until backend Phase 39 is deployed
- Phase 21 (CSRF HMAC): Highest risk — requires coordinated deploy with backend Phase 37 dual-check window
- Open question: Does backend Phase 37 HMAC use `INTERNAL_API_SECRET` or a separate CSRF secret? (confirm before Phase 21)
- Open question: Which of backend Phases 35-39 are already live? (confirm before starting Phase 20)

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 17-02-PLAN.md
Resume file: .planning/ (next phase — Phase 18)

---
*Last updated: 2026-02-23 (Phase 17 complete — all 2 plans done)*
