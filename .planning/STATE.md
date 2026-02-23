# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.
**Current focus:** v1.2 Security Audit & Optimization — Phase 21 CSRF HMAC Signing

## Current Position

Phase: 21 of 23 (CSRF HMAC Signing) — IN PROGRESS
Plan: 1 of 1 in current phase — COMPLETE
Status: Phase 21 Plan 01 complete — HMAC-signed CSRF tokens via crypto.subtle in proxy.ts; TypeScript clean
Last activity: 2026-02-23 — Phase 21 Plan 01 complete (generateHmacCsrfToken, extractJtiFromAuthToken, CSRF_HMAC_SECRET constant; CSRF call site wired to HMAC generation)

Progress: [██░░░░░░░░] 23% (v1.2) — 77/83 total plans complete across all milestones

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
| Phase 18 P01 | 116s | 2 tasks | 3 files |
| Phase 18 P02 | 30s | 1 task | 1 file |
| Phase 19 P01 | 37s | 1 task | 1 file |
| Phase 19 P02 | 418s | 2 tasks | 11 files |
| Phase 19 P03 | 51s | 2 tasks | 2 files |
| Phase 20 P01 | 4m 1s | 2 tasks | 7 files |
| Phase 20 P02 | 2m 14s | 2 tasks | 5 files |
| Phase 21 P01 | 1m 3s | 2 tasks | 1 file |

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
- [Phase 18]: HEARTBEAT_TIMEOUT = 45s; HIDE_GRACE_MS = 15s (locked); HEARTBEAT_CHECK_INTERVAL = 5s
- [Phase 18]: 'reconnecting' state set only on heartbeat-triggered reconnects, not initial connects
- [Phase 18]: isClickable includes 'reconnecting' — force reconnect available during stall recovery
- [Phase 18]: BotStatus healthy prop made optional — always renders on guild page even before SSE data
- [Phase 18]: refetchInterval gates on connectionState === 'error' only — not on !isSSEConnected boolean; prevents polling during transient reconnects
- [Phase 19]: backendFetch uses dynamic import try/catch for next/headers — defensive pattern even though file is server-only (imports crypto)
- [Phase 19]: backendFetch is forward-only (no expiry check) — proxy.ts middleware proactively refreshes auth_token before SSR page requests land
- [Phase 19]: !headers.has('Authorization') guard on auto-forwarding — backward-compatible with all existing routes that set Authorization explicitly
- [Phase 19 P02]: Split globalRateLimitUntil into pollingRateLimitUntil + mutationRateLimitUntil — prevents polling 429 from blocking user mutations
- [Phase 19 P02]: pollingRateLimitUntil persisted to sessionStorage; rate-limit-updated custom event dispatched on each write for reactive RateLimitBanner
- [Phase 19 P02]: MUTATION_MAX_RETRIES=5 for 503 retries; didRetryRef pattern prevents 'Changes saved' toast on non-retry success paths
- [Phase 19 P02]: ConnectionIssuesBanner gates on isError && hasData — distinguishes polling failures from initial load failures
- [Phase 19]: Mutation 503 retry uses self-contained inner loop with mutationAttempt counter (1..5), independent of outer DEFAULT_MAX_RETRIES=3 bound
- [Phase 19]: Early return narrowed from 'isError' to 'isError && !data' — polling failures fall through to ConnectionIssuesBanner inline render
- [Phase 20]: resetQueries used for all infinite list mutations (accounts, posts) to prevent mixed-shape cache pages with stale cursors; invalidateQueries kept for non-infinite queries
- [Phase 20]: No success toast for normal add/delete account operations — optimistic list update IS the feedback per locked decision
- [Phase 21]: CSRF_HMAC_SECRET falls back to INTERNAL_API_SECRET — single env var covers both internal auth and CSRF HMAC
- [Phase 21]: Per-request crypto.subtle.importKey — no module-scope CryptoKey caching (avoids secret rotation issues)
- [Phase 21]: Double-submit cookie check preserved alongside HMAC — belt-and-suspenders, middleware fast-fails tampered requests
- [Phase 21]: Silent fallback to plain 64-char hex token when jti or CSRF_HMAC_SECRET absent — graceful degradation for local dev

### Pending Todos

None.

### Blockers/Concerns

- Phase 21 (CSRF HMAC): Dashboard HMAC generation is complete — backend Phase 37 dual-check mode must be confirmed live before production deployment
- Open question: Which of backend Phases 35-39 are already live? (confirm before starting next cursor-dependent work)

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 21-01-PLAN.md
Resume file: .planning/ (next: Phase 22 or remaining Phase 21 verification)

---
*Last updated: 2026-02-23 (Phase 21 Plan 01 complete — HMAC-signed CSRF tokens via crypto.subtle in proxy.ts; generateHmacCsrfToken, extractJtiFromAuthToken, CSRF_HMAC_SECRET with fallback chain)*
