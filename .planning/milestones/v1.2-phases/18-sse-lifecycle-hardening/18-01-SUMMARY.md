---
phase: 18-sse-lifecycle-hardening
plan: "01"
subsystem: sse-hooks
tags: [sse, react-hooks, reliability, connection-state, ui]
dependency_graph:
  requires: []
  provides: [hardened-sse-hook, reconnecting-state, always-visible-bot-status]
  affects: [use-guilds.ts]
tech_stack:
  added: []
  patterns: [generation-counter, heartbeat-silence-timer, tab-visibility-grace-period]
key_files:
  created: []
  modified:
    - src/hooks/use-sse.ts
    - src/components/bot-status.tsx
    - src/app/(dashboard)/guilds/[guildId]/page.tsx
decisions:
  - "heartbeat-timeout: 45s silence threshold — safe margin above 30s server keepalive interval"
  - "HEARTBEAT_CHECK_INTERVAL: 5s polling — matches data event frequency, low overhead"
  - "HIDE_GRACE_MS: 15s — locked user decision from CONTEXT.md"
  - "reconnecting state only on heartbeat-triggered reconnects, not initial connects"
  - "isClickable includes reconnecting state — force reconnect available during stall recovery"
metrics:
  duration: "1m 56s"
  completed: "2026-02-23"
  tasks: 2
  files: 3
---

# Phase 18 Plan 01: SSE Lifecycle Hardening Summary

**One-liner:** Hardened SSE hook with 45s heartbeat stall detection, generation-counter race prevention, 15s tab-hide grace period, retry reset on tab return, plus `'reconnecting'` state added to `BotStatus` with always-visible rendering on guild detail page.

## What Was Built

### Task 1: Hardened `useSSE` Hook (`src/hooks/use-sse.ts`)

Added the following to the existing hook while preserving the existing API surface (`url`, `options`, returns `{ connectionState, reconnect }`):

**New `ConnectionState` type:**
```typescript
export type ConnectionState = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error'
```

**New refs:**
- `connectGenerationRef = useRef<number>(0)` — generation counter for stale-closure prevention (SSE-02)
- `lastEventTimeRef = useRef<number>(Date.now())` — last data event timestamp for heartbeat (SSE-01)
- `heartbeatCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)` — heartbeat polling interval
- `hideGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` — tab-hide grace timer

**Constants:**
- `HEARTBEAT_TIMEOUT = 45_000` — 45s silence before declaring stall
- `HEARTBEAT_CHECK_INTERVAL = 5_000` — poll every 5s
- `HIDE_GRACE_MS = 15_000` — 15s before disconnecting on tab hide

**Heartbeat logic:**
- `clearHeartbeat()` helper clears the interval and sets ref to null
- `startHeartbeat(generation)` captures generation at call time, starts polling interval
- If stall detected AND generation matches: close, set `'reconnecting'`, call `connect()`
- If stall detected but generation is stale: clear interval (newer connection owns the heartbeat)

**Generation counter in `connect()`:**
- Increments `connectGenerationRef.current` at the top of every `connect()` call
- `es.onopen`, `es.onmessage`, `es.onerror` each check `connectGenerationRef.current !== generation` — stale closures call `es.close()` and return immediately

**Tab visibility handler (rewritten):**
- On hide: clear pending retry timeout, start 15s grace timer
- On show within grace: `clearTimeout`, set ref to null, keep existing connection
- On show after grace (ref is null): reset `retryCountRef.current = 0`, call `connect()` (SSE-03)
- Effect cleanup: removes event listener AND clears hideGraceTimerRef

### Task 2: BotStatus + Guild Detail Page

**`src/components/bot-status.tsx`:**
- `healthy` prop made optional (`healthy?: boolean`)
- Added `'reconnecting'` case: yellow pulsing dot (`bg-yellow-500 animate-pulse`) + "Reconnecting..." text
- Added `'disconnected'` case: gray dot (`bg-gray-400`) + "Disconnected" text
- Added `healthy === undefined` case in connected state: green pulsing dot + "Connected" text
- `isClickable` extended to cover `connectionState === 'reconnecting'` — allows force reconnect during stall recovery

**`src/app/(dashboard)/guilds/[guildId]/page.tsx`:**
- Removed `{status && <BotStatus .../>}` guard — `BotStatus` always renders
- All status props use optional chaining (`status?.bot_healthy`, `status?.bot?.last_heartbeat`, etc.)
- Shows connection state immediately on page load, before SSE data arrives

## Verification Results

1. `npx tsc --noEmit` — PASS (zero errors)
2. `ConnectionState` includes all 5 states: connecting, reconnecting, connected, disconnected, error — PASS
3. All 4 new refs present in `useSSE` — PASS
4. `HEARTBEAT_TIMEOUT = 45_000`, `HIDE_GRACE_MS = 15_000` — PASS
5. Grace period uses `setTimeout(HIDE_GRACE_MS)` not immediate close — PASS
6. Generation checks in `es.onopen`, `es.onmessage`, `es.onerror` (+ heartbeat callback = 4 total) — PASS
7. `retryCountRef.current = 0` only when grace period has expired — PASS
8. Guild detail page renders BotStatus without `{status && ...}` guard — PASS
9. BotStatus has yellow pulsing dot + "Reconnecting..." for `'reconnecting'` state — PASS

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | b7855f4 | feat(18-01): harden useSSE with heartbeat timeout, generation counter, grace period, retry reset |
| Task 2 | 39d9a91 | feat(18-01): add reconnecting state to BotStatus, make indicator always visible |

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **Heartbeat resets on `onopen` and `onmessage`** — `lastEventTimeRef` reset in `es.onopen` as well as `es.onmessage`. Per research, the backend sends keepalives every 30s but browser EventSource does not fire `onmessage` for comment frames. Resetting on `onopen` means the 45s timer starts from connection establishment, which gives a clean baseline.

2. **`'reconnecting'` state only for heartbeat-triggered reconnects** — Not set on initial connect or manual reconnect. This preserves the semantic distinction: `'connecting'` = first attempt, `'reconnecting'` = recovery from a previously established connection.

3. **`isClickable` includes `'reconnecting'`** — During stall recovery the user can click the indicator to force an immediate reconnect rather than waiting for the heartbeat loop. This was confirmed as "Claude's discretion" in research.

## Self-Check: PASSED

Files verified:
- FOUND: src/hooks/use-sse.ts
- FOUND: src/components/bot-status.tsx
- FOUND: src/app/(dashboard)/guilds/[guildId]/page.tsx

Commits verified:
- FOUND: b7855f4 (Task 1)
- FOUND: 39d9a91 (Task 2)
