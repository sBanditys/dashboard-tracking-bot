---
phase: 18-sse-lifecycle-hardening
plan: "02"
subsystem: sse-hooks
tags: [sse, react-hooks, reliability, connection-state, tanstack-query]

requires:
  - phase: 18-01
    provides: hardened-sse-hook with ConnectionState including 'reconnecting' state
provides:
  - precise refetchInterval gate using connectionState === 'error' in useGuildStatusRealtime
affects: []

tech-stack:
  added: []
  patterns: [connectionState-guard-over-boolean-proxy, terminal-state-only-polling]

key-files:
  created: []
  modified:
    - src/hooks/use-guilds.ts

key-decisions:
  - "Gate refetchInterval on connectionState === 'error' not on !isSSEConnected — prevents polling during transient 'reconnecting' and 'disconnected' states"

patterns-established:
  - "Direct connectionState comparison for query options: use the full ConnectionState value, not a boolean proxy"

requirements-completed: [SSE-04]

duration: 30s
completed: 2026-02-23
---

# Phase 18 Plan 02: Polling Gate Tightening Summary

**Removed `isSSEConnected` boolean proxy in `useGuildStatusRealtime`, replacing `refetchInterval` gate with `connectionState === 'error' ? 60_000 : false` to prevent polling during transient reconnects.**

## Performance

- **Duration:** 30 seconds
- **Started:** 2026-02-23T00:09:27Z
- **Completed:** 2026-02-23T00:09:57Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed `isSSEConnected` boolean that incorrectly grouped all non-`'connected'` states together
- Polling now only activates in the terminal `'error'` state (all retries exhausted, SSE dead)
- `'connecting'`, `'reconnecting'`, `'connected'`, and `'disconnected'` states all suppress polling
- Eliminated SSE/polling race conditions during heartbeat-triggered reconnects introduced in Plan 18-01

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate refetchInterval on connectionState === 'error' and clean up isSSEConnected** - `5221ff9` (feat)

## Files Created/Modified

- `src/hooks/use-guilds.ts` - Removed `isSSEConnected` boolean (line 109), replaced `refetchInterval: isSSEConnected ? false : 60 * 1000` with `refetchInterval: connectionState === 'error' ? 60_000 : false`

## Decisions Made

- **Direct state comparison over boolean proxy:** The plan specified removing `isSSEConnected` in favor of `connectionState === 'error'` directly. This is more explicit and prevents the class of bugs where a derived boolean loses the precision of the underlying union type. Future polling gates should use the full `ConnectionState` value, not a boolean derived from it.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 18 is now complete — all SSE lifecycle hardening goals met (heartbeat timeout, generation counter, grace period, reconnecting state, precise polling gate)
- Ready to proceed to the next phase in the v1.2 roadmap

---
*Phase: 18-sse-lifecycle-hardening*
*Completed: 2026-02-23*

## Self-Check: PASSED

Files verified:
- FOUND: src/hooks/use-guilds.ts

Commits verified:
- FOUND: 5221ff9 (Task 1)
