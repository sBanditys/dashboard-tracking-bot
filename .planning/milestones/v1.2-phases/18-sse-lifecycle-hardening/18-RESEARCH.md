# Phase 18: SSE Lifecycle Hardening - Research

**Researched:** 2026-02-23
**Domain:** React SSE lifecycle management, tab visibility API, TanStack Query conditional polling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Add a **15-second grace period** before closing the connection when the tab is hidden — quick tab switches should not cause a disconnect/reconnect cycle
- If user returns within the grace period, cancel the close timer and keep the existing connection
- Use generation counter (`connectGenerationRef`) to prevent dual EventSource instances from rapid visibility toggles
- Show a brief "Reconnecting..." state in the connection indicator during stall-triggered reconnects — not silent, but not intrusive
- **Always-visible** connection status indicator — shows state at all times, not just on errors
- Visual style: **colored dot + text label** (e.g., green dot "Live", yellow dot "Reconnecting", red dot "Disconnected")
- `refetchInterval` polling must only fire when `connectionState === 'error'` — investigate current codebase to confirm polling-as-fallback pattern exists and gate it accordingly

### Claude's Discretion
- Heartbeat detection mechanism (client-side silence vs server ping)
- Timeout threshold tuning
- Timer behavior during hidden tab state
- Grace period return: verify health or trust open connection
- Post-grace reconnect timing (instant vs cooldown)
- Retry counter reset strategy on tab return
- Max retry count adjustment
- Manual reconnect UX pattern
- Status indicator placement in the layout
- Reconnect action integration with status indicator

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SSE-01 | `useSSE` implements heartbeat timeout (45 seconds) that closes and reconnects stalled connections that stop sending events | Client-side silence timer using `useRef` + `setTimeout`; backend sends `: keepalive\n\n` comments every 30s and data every 5s — client needs to reset timer on ANY received event or keepalive |
| SSE-02 | `useSSE` uses generation counter (`connectGenerationRef`) to prevent dual EventSource instances when tab visibility changes rapidly within reconnect cooldown window | `connectGenerationRef.current++` before creating a new `EventSource`; each `es.onopen`/`es.onerror` closure captures its own generation snapshot and exits if stale |
| SSE-03 | `useSSE` resets `retryCountRef` on tab visibility restore so exhausted retries during hidden state do not permanently kill the connection | Set `retryCountRef.current = 0` in the visibility-restore handler before calling `connect()` |
| SSE-04 | `refetchInterval` only fires when `connectionState === 'error'` (retries exhausted), not during transient reconnects, preventing polling/SSE race conditions | Current code uses `isSSEConnected ? false : 60000` — must tighten to `connectionState === 'error' ? 60000 : false`; verified in `use-guilds.ts` line 122 |
</phase_requirements>

---

## Summary

Phase 18 is a targeted hardening of `useSSE` (`/src/hooks/use-sse.ts`) and the `refetchInterval` gate in `useGuildStatusRealtime` (`/src/hooks/use-guilds.ts`). No new endpoints are needed; all work is client-side React hook logic. The backend already provides the necessary infrastructure: the SSE stream endpoint sends `: keepalive\n\n` comments every 30 seconds and data events every 5 seconds, so a 45-second client-side silence timer is comfortably achievable. The existing `BotStatus` component already handles `connectionState` visually; Phase 18 adds a `'reconnecting'` state variant and ensures the indicator is always-visible regardless of guild/status data presence.

The two plans mirror the two requirement groups: Plan 18-01 adds heartbeat timeout, generation counter, and retry reset inside `useSSE`; Plan 18-02 tightens `refetchInterval` to fire only on `connectionState === 'error'`. Both changes are low surface area and carry minimal regression risk.

**Primary recommendation:** Implement a client-side heartbeat timer (`lastEventTimeRef` + `setTimeout`) that resets on every `onmessage` and on every SSE comment (parsed via `es.addEventListener('message', ...)` or `onmessage`). Since the browser's `onmessage` fires for `data:` frames only and NOT for `: comment` keepalive lines, use a raw `MessageEvent` via `es.addEventListener` for data events, and a separate `heartbeatResetInterval` that polls `Date.now() - lastEventTimeRef.current > heartbeatTimeout` instead of relying on browser comment delivery.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (built-in) | 19 (in use) | `useRef`, `useEffect`, `useCallback`, `useState` | All lifecycle management lives inside hooks |
| browser `EventSource` | Native Web API | SSE connection | Already in use; no wrapper library needed |
| browser `document.visibilityState` | Page Visibility API | Tab show/hide detection | Standard; supported in all modern browsers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@tanstack/react-query` | ^5.90.20 (in use) | `refetchInterval` conditional gate | SSE-04: gate polling to error state only |
| `sonner` | ^2.0.7 (in use) | Toast for "Reconnecting..." subtle feedback | Show transient reconnect state without modal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `useSSE` hook | `react-eventsource` npm package | Third-party package adds dependency; custom hook gives full control over generation counter and lifecycle — keep custom |
| Client-side silence timer | Server-side named heartbeat event | Server already sends `: keepalive` comments; browser EventSource does NOT fire `onmessage` for SSE comment lines — client-side timer is the only safe approach |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Structure

No structural changes. All modifications are within:
```
src/
├── hooks/
│   ├── use-sse.ts         # 18-01: heartbeat timer, generation counter, retry reset
│   └── use-guilds.ts      # 18-02: refetchInterval gate tightened to 'error' state
└── components/
    └── bot-status.tsx     # Minor: add 'reconnecting' visual state
```

### Pattern 1: Client-Side Heartbeat Silence Timer

**What:** Track `lastEventTimeRef = useRef(Date.now())`. Reset it in `es.onmessage`. A `setInterval` running every second checks if `Date.now() - lastEventTimeRef.current > heartbeatTimeout`. If elapsed, close and reconnect.

**Why client-side:** The backend sends `: keepalive\n\n` (SSE comment lines) every 30s. **Browser `EventSource.onmessage` does NOT fire for comment lines** — comments are spec-defined as connection keep-alive hints, not messages. A polling interval on the client is the correct pattern.

**When to use:** Any SSE hook where the server may silently stall without closing the TCP connection.

```typescript
// Source: Derived from MDN EventSource spec + React useRef patterns
const lastEventTimeRef = useRef<number>(Date.now())
const heartbeatCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

// Inside connect():
es.onopen = () => {
    lastEventTimeRef.current = Date.now()
    setConnectionState('connected')
    retryCountRef.current = 0
}

es.onmessage = (event) => {
    lastEventTimeRef.current = Date.now()  // Reset silence timer
    // ... parse and dispatch
}

// Start heartbeat check interval after connect
heartbeatCheckRef.current = setInterval(() => {
    if (Date.now() - lastEventTimeRef.current > heartbeatTimeout) {
        es.close()
        setConnectionState('connecting')  // show "Reconnecting..."
        connect()
    }
}, 5000) // check every 5s

// Cleanup: clear heartbeatCheckRef in teardown
```

**Confidence:** HIGH — client-side silence timer pattern is standard; verified against MDN EventSource spec behavior for comment lines.

### Pattern 2: Generation Counter for Race Condition Prevention

**What:** Increment `connectGenerationRef.current` before each `new EventSource(...)`. Capture the value at closure creation time. On any async callback (open, message, error), compare captured vs current — if stale, call `es.close()` and return.

**When to use:** Whenever visibility or URL changes can trigger multiple overlapping connect() calls before the previous EventSource has been closed and garbage collected.

```typescript
// Source: Standard "abort token" pattern adapted for EventSource
const connectGenerationRef = useRef<number>(0)

const connect = useCallback(() => {
    if (!url) { setConnectionState('disconnected'); return }

    // Increment generation — any previous in-flight connection is now stale
    const generation = ++connectGenerationRef.current

    // ... cooldown check ...

    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
        if (connectGenerationRef.current !== generation) {
            es.close(); return  // Stale — newer connection won
        }
        setConnectionState('connected')
        retryCountRef.current = 0
    }

    es.onerror = () => {
        if (connectGenerationRef.current !== generation) {
            es.close(); return  // Stale — ignore
        }
        // ... retry logic ...
    }
}, [url, ...])
```

**Confidence:** HIGH — this is the standard "AbortController token" / "ignore stale closure" pattern from the React docs on effect cleanup; applied here to EventSource.

### Pattern 3: Tab Visibility Grace Period

**What:** On `visibilitychange` → hidden, start a 15-second `hideGraceTimerRef` timeout. If visibility is restored before the timeout fires, cancel it and keep the existing connection. If the timeout fires, close the EventSource and set state to `'disconnected'`.

**Important nuance:** Clear `hideGraceTimerRef` in the effect cleanup (component unmount) to prevent firing on dead component.

```typescript
const hideGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const HIDE_GRACE_MS = 15_000

const handleVisibilityChange = () => {
    if (document.hidden) {
        // Start grace period — don't disconnect immediately
        hideGraceTimerRef.current = setTimeout(() => {
            eventSourceRef.current?.close()
            clearHeartbeatCheck()
            setConnectionState('disconnected')
        }, HIDE_GRACE_MS)
    } else {
        // Tab visible again
        if (hideGraceTimerRef.current) {
            // Within grace period — cancel disconnect, keep connection
            clearTimeout(hideGraceTimerRef.current)
            hideGraceTimerRef.current = null
            // Connection still open — no reconnect needed
        } else {
            // Grace period already fired (tab was hidden > 15s)
            retryCountRef.current = 0  // SSE-03: reset exhausted retries
            connect()
        }
    }
}
```

**Confidence:** HIGH — direct application of `setTimeout`/`clearTimeout` with refs; standard React pattern.

### Pattern 4: Retry Reset on Tab Return (SSE-03)

**What:** When tab becomes visible after grace period expiry, set `retryCountRef.current = 0` before calling `connect()`. This prevents a permanently disconnected state when retries exhausted while the tab was hidden.

**Confidence:** HIGH — simple ref reset; the `connect()` function already reads `retryCountRef.current < maxRetries`.

### Pattern 5: Tighten refetchInterval Gate (SSE-04)

**Current code** (`use-guilds.ts` line 122):
```typescript
refetchInterval: isSSEConnected ? false : 60 * 1000,
```
`isSSEConnected = connectionState === 'connected'` — this enables polling during `'connecting'`, `'disconnected'`, AND `'error'` states, which fires during transient reconnects.

**Required change:**
```typescript
// Source: TanStack Query v5 refetchInterval callback pattern
refetchInterval: connectionState === 'error' ? 60 * 1000 : false,
```

This ensures polling only activates when retries are exhausted (`connectionState === 'error'`), not during transient `'disconnected'` or `'connecting'` states.

**TanStack Query v5 callback form** (also valid if you need query data access):
```typescript
// Source: Context7 /tanstack/query - refetchInterval callback signature
refetchInterval: (query) => {
    return connectionState === 'error' ? 60_000 : false
}
```

**Confidence:** HIGH — verified against TanStack Query v5 docs via Context7; callback form confirmed as `(query: Query) => number | false | undefined`.

### Pattern 6: 'reconnecting' ConnectionState Variant

**Current `ConnectionState` type:** `'connecting' | 'connected' | 'disconnected' | 'error'`

The CONTEXT.md requires a visible "Reconnecting..." label during stall-triggered reconnects. Options:
1. Add `'reconnecting'` to the union type — cleaner; allows `BotStatus` to show distinct "Reconnecting..." without conflating with initial "Connecting..."
2. Reuse `'connecting'` — simpler but less precise; can't distinguish initial connect from reconnect in the UI

**Recommendation:** Add `'reconnecting'` to the `ConnectionState` union. Set it instead of `'connecting'` when a heartbeat timeout triggers a reconnect (the user has already been connected — this is recovery, not initial connection). Keep `'connecting'` for the initial connect path.

```typescript
export type ConnectionState = 'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'error'
```

Update `BotStatus` to handle `'reconnecting'`:
```typescript
if (connectionState === 'reconnecting') {
    return {
        dotClass: 'bg-yellow-500 animate-pulse',
        textClass: 'text-yellow-400',
        text: 'Reconnecting...',
        subtext: null,
    }
}
```

**Confidence:** MEDIUM — design choice; no external constraint. Recommended for clarity.

### Anti-Patterns to Avoid

- **Calling `connect()` directly from `visibilitychange` without checking grace period state:** Can trigger dual connections during rapid tab switches. Always go through the grace timer logic.
- **Listening for `: keepalive` comment lines via `onmessage`:** Browser EventSource spec: comment lines (`: ...`) are NOT dispatched as `message` events. Using `onmessage` to reset a heartbeat timer will ONLY reset on real data events — which is acceptable if data arrives at 5s intervals. Silence = 45s threshold = safe with 5s poll + 30s keepalive.
- **Resetting `retryCountRef` in `es.onopen` but NOT on tab return:** Retries exhausted while hidden will never reset without the explicit `retryCountRef.current = 0` in the visibility handler.
- **Using `isSSEConnected` (boolean) instead of full `connectionState`:** Loses precision — `!isSSEConnected` is true for all non-connected states, including transient reconnects.
- **Not clearing `hideGraceTimerRef` in the visibilitychange `useEffect` cleanup:** The timer will fire after component unmount and attempt state updates on a dead component.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Silence detection | Custom EventSource subclass | Client `setInterval` checking elapsed time on a ref | Browser EventSource is not subclassable safely across all environments |
| Cancellable async operations | Manual boolean flags | Generation counter (ref integer) | Integer increment is atomic in JS; no race between flag write and read |
| Conditional polling | Manual fetch loop | `refetchInterval: (query) => ...` in TanStack Query | Query already manages deduplication, background refetch, staleTime |

**Key insight:** All the machinery for safe timer management already exists as React patterns (`useRef` for timers, `useCallback` for stable references). No new library installs needed.

---

## Common Pitfalls

### Pitfall 1: Heartbeat Check Fires After Stale Connection Closed

**What goes wrong:** `heartbeatCheckRef` interval fires after a new generation's connection has already taken over, causing a spurious reconnect that kills the healthy new connection.

**Why it happens:** `setInterval` is stored in a ref, but the callback closes over a stale `es` reference or calls `connect()` unconditionally without checking generation.

**How to avoid:** Capture the generation number when starting `heartbeatCheckRef`. In the interval callback, check `connectGenerationRef.current !== capturedGeneration` before acting. Also clear `heartbeatCheckRef` at the top of `connect()` before creating the new EventSource.

**Warning signs:** Two simultaneous network requests to `/status/stream` visible in DevTools Network tab.

### Pitfall 2: Grace Period Timer Not Cleared on Unmount

**What goes wrong:** Component unmounts (navigation), 15s timer fires, attempts `setConnectionState()` on dead component → React warning, possible null-ref crash.

**Why it happens:** The `visibilitychange` useEffect cleanup removes the event listener but forgets to `clearTimeout(hideGraceTimerRef.current)`.

**How to avoid:** Return cleanup function from the `visibilitychange` useEffect that calls `clearTimeout(hideGraceTimerRef.current)` unconditionally.

**Warning signs:** "Can't perform a React state update on an unmounted component" warning in console.

### Pitfall 3: Retry Reset on Tab Return Causes Infinite Retry Loop

**What goes wrong:** Resetting `retryCountRef.current = 0` on EVERY tab return means a repeatedly-failing server will be retried endlessly whenever the user switches tabs.

**Why it happens:** The reset is unconditional rather than tied to the grace period / exhaustion state.

**How to avoid:** Only reset retries if the tab was hidden long enough for the grace period to expire (i.e., `hideGraceTimerRef.current` is null when tab becomes visible). If the connection is still healthy (within grace period), no retry reset is needed.

**Warning signs:** DevTools shows repeated rapid requests to `/status/stream` whenever tab is refocused.

### Pitfall 4: `refetchInterval` Uses Captured Closure State

**What goes wrong:** `connectionState` captured in the `useQuery` options object doesn't update when state changes because `useQuery` memoizes options.

**Why it happens:** If `refetchInterval` is expressed as a static value (`connectionState === 'error' ? 60000 : false`) computed at render time, TanStack Query re-evaluates it on re-render, so this is fine. But using the callback form `(query) => ...` that closes over `connectionState` from the render closure is also fine in TanStack v5 — options are re-evaluated on every render.

**How to avoid:** The simple inline expression `connectionState === 'error' ? 60_000 : false` works correctly in TanStack Query v5 because the `useQuery` call re-runs on every render when `connectionState` state changes. Verified behavior.

**Warning signs:** Polling continues after SSE reconnects successfully.

### Pitfall 5: Browser Timer Throttling in Hidden Tabs

**What goes wrong:** The 15-second grace timer is throttled by the browser when the tab is hidden, potentially extending the actual grace period to 30+ seconds.

**Why it happens:** Chrome and Firefox throttle `setTimeout`/`setInterval` in hidden tabs — timers with delay < 1 minute may fire after an extended delay once the budget is exhausted.

**How to avoid:** For the grace period, this is acceptable — a slightly longer grace period is safe (it just means the disconnect is deferred further). The heartbeat check interval should also be acceptable since it runs while the tab is visible. If precision matters, compare `Date.now()` against the hide timestamp rather than relying solely on the timer.

**Warning signs:** Disconnect happens 30s+ after tab is hidden instead of 15s.

---

## Code Examples

Verified patterns from codebase and official sources:

### Current `useSSE` hook state (baseline)
```typescript
// Source: /src/hooks/use-sse.ts (current)
// Existing refs already available:
const eventSourceRef = useRef<EventSource | null>(null)
const retryCountRef = useRef(0)
const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const lastConnectTimeRef = useRef<number>(0)

// Tab visibility handler (current — NO grace period, immediate close):
if (document.hidden) {
    eventSourceRef.current?.close()   // immediate close — problem
    setConnectionState('disconnected')
} else if (url) {
    connect()  // no retry reset — problem (SSE-03)
}
```

### New refs to add to `useSSE`
```typescript
const connectGenerationRef = useRef<number>(0)       // SSE-02
const hideGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)  // grace period
const lastEventTimeRef = useRef<number>(Date.now())  // SSE-01 heartbeat
const heartbeatCheckRef = useRef<ReturnType<typeof setInterval> | null>(null) // SSE-01 heartbeat
```

### TanStack Query v5 refetchInterval callback signature
```typescript
// Source: Context7 /tanstack/query - migrating-to-v5.md
refetchInterval: number | false | ((query: Query) => number | false | undefined)
```

### Current refetchInterval location in codebase
```typescript
// Source: /src/hooks/use-guilds.ts line 122
refetchInterval: isSSEConnected ? false : 60 * 1000,  // CURRENT — too broad

// Required fix (SSE-04):
refetchInterval: connectionState === 'error' ? 60 * 1000 : false,
```

---

## Backend Behavior (Critical Context)

From inspection of `/Tracking Data Bot/api/src/routes/dashboard/guilds/guildRead.ts`:

| Behavior | Interval | SSE Frame Type |
|----------|----------|---------------|
| Status data | Every 5 seconds (only if changed) | `data: {...}\n\n` |
| Keepalive | Every 30 seconds | `: keepalive\n\n` (comment line) |
| Max stream duration | Configured via lease | `closeStream('max_duration')` |

**Key fact:** Comment lines (`: keepalive`) are NOT dispatched to `EventSource.onmessage`. The browser treats them as transport-level pings. Therefore:
- If status does NOT change, `onmessage` fires at ≤ every 5 seconds (only on change)
- If no data changes for 45 seconds, the silence timer triggers a reconnect
- 45s is safe: if status is changing, onmessage fires within 5s. If status is stable, the only events are keepalives which onmessage ignores — so a 45s timeout will trigger false reconnects on healthy but stable-status connections

**Revised recommendation:** Set `heartbeatTimeout` to 45 seconds as specified. Since `onmessage` only fires on data changes, on a healthy stable-status connection, the last `onmessage` could have been up to 45s ago while keepalives are being sent. To account for this, the heartbeat timer should also reset on `es.onopen` (initial connect) and ideally on any SSE frame including keepalives.

**Workaround for keepalives:** Since the browser does not fire `onmessage` for comment frames, and the connection is NOT stalled when keepalives are being received, consider using the `lastConnectTimeRef` (already exists) as a secondary anchor: if `Date.now() - lastConnectTimeRef.current < heartbeatTimeout`, the connection is recent enough to be trusted even without a data event.

**Alternative pattern:** Use a separate heartbeat reset triggered by any network activity. This can be achieved by wrapping the `fetch` used by the proxy's streaming body reader — but this is complex. Simpler: just set heartbeatTimeout to 60 seconds (giving 30s beyond the keepalive interval) to ensure a real stall is detected but a healthy stable-status stream is not false-tripped. Or keep 45s and reset `lastEventTimeRef` in `es.onopen`.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Immediate tab-hide disconnect | 15s grace period + generation counter | Prevents disconnect/reconnect churn for brief tab switches |
| Retry exhaustion = permanent disconnect | Reset retries on tab return | Recovers from background retry exhaustion |
| Poll on any non-connected state | Poll only on error state | Prevents polling/SSE race |
| No stall detection | Heartbeat silence timer | Detects zombie connections |

---

## Open Questions

1. **Should heartbeat timer reset on `es.onopen` only or also track keepalive comments?**
   - What we know: Backend sends keepalives every 30s; browser EventSource does not dispatch these to `onmessage`
   - What's unclear: Whether resetting `lastEventTimeRef` only on `onmessage` causes false timeouts on healthy zero-change connections
   - Recommendation: Reset `lastEventTimeRef` in `es.onopen` AND `es.onmessage`. For a 45s timeout with a 30s keepalive and 5s data poll, a healthy zero-change connection would have `onopen` as the last reset event. If the connection was opened > 45s ago with no data changes, it *might* be stalled OR the bot status is simply unchanged. Given the 30s keepalive from the server, if the TCP connection is alive, `onopen` happened recently enough. Consider: set `heartbeatTimeout = 60s` (giving 30s beyond keepalive) to avoid false reconnects on valid zero-change streams. This is Claude's discretion per CONTEXT.md.
   - Confidence: MEDIUM

2. **Should `reconnect` (manual) button be integrated into `BotStatus` or remain a separate element?**
   - What we know: CONTEXT.md marks this as Claude's discretion. Current `BotStatus` already conditionally renders as a `<button>` when `connectionState === 'error'`.
   - Recommendation: Integrate into `BotStatus` — extend the button pattern to also cover `'reconnecting'` state (show a clickable "Reconnecting... click to force" variant). This minimizes new UI surface.
   - Confidence: MEDIUM

3. **Where to place the always-visible connection indicator?**
   - What we know: Current `BotStatus` is only rendered inside the guild detail page when `status` data is available (`{status && <BotStatus .../>}`). The requirement says "always visible."
   - What's unclear: Should it be in the topbar (global) or remain in the guild page but always render (even without bot status data)?
   - Recommendation: For Phase 18 scope (no new features), change the conditional from `{status && <BotStatus .../>}` to always render `<BotStatus>` on the guild detail page, passing the `connectionState` even when `status` is undefined. The indicator can show "Connecting..." while data loads. This avoids modifying the topbar layout.
   - Confidence: MEDIUM

---

## Sources

### Primary (HIGH confidence)
- `/tanstack/query` Context7 — `refetchInterval` callback signature, conditional polling patterns
- `/websites/react_dev` Context7 — `useRef`/`useEffect` cleanup patterns, `clearTimeout` in effects
- Backend source: `/Tracking Data Bot/api/src/routes/dashboard/guilds/guildRead.ts` — confirmed keepalive interval (30s), data poll interval (5s)
- Codebase source: `/src/hooks/use-sse.ts` — existing hook implementation (baseline for changes)
- Codebase source: `/src/hooks/use-guilds.ts` — current `refetchInterval` gate location (line 122)

### Secondary (MEDIUM confidence)
- [MDN - Server-sent events: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — confirmed comment line behavior (not dispatched to onmessage)
- [MDN - Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — confirmed timer throttling behavior in hidden tabs
- [TanStack Query v4 auto-refetching example](https://tanstack.com/query/v4/docs/framework/react/examples/auto-refetching) — conditional refetch pattern

### Tertiary (LOW confidence)
- WebSearch results on SSE heartbeat patterns — general ecosystem validation only; not used for specific API claims

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all APIs confirmed in codebase and MDN
- Architecture: HIGH — generation counter, grace period, and retry reset are direct applications of standard React ref patterns
- Pitfalls: HIGH — derived from code inspection + confirmed behavioral specs (EventSource comments, React cleanup)
- refetchInterval gate: HIGH — verified TanStack Query v5 API via Context7 + current codebase line confirmed

**Research date:** 2026-02-23
**Valid until:** 2026-03-25 (stable APIs; 30-day window)
