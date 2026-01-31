# Phase 4: Real-Time Updates - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Display bot online/offline status that updates in real-time within 5 seconds. Dashboard remains fully functional when bot is down. No configuration, alerts, or history — just live status display.

</domain>

<decisions>
## Implementation Decisions

### Status Indicator Design
- **Placement:** Guild header area — near guild name/info at top of guild pages, contextual to selected guild
- **Online state:** Green dot with "Online" text, Discord-style appearance
- **Offline state:** Red dot with "Offline" text — clear error state
- **Animation:** Subtle pulse animation when online (breathing effect), static when offline

### Update Behavior
- **Delivery method:** SSE (Server-Sent Events) — server pushes updates, efficient and unidirectional
- **Latency target:** Under 5 seconds — matches success criteria
- **Change feedback:** Brief highlight/flash on the indicator when status changes
- **Initial state:** Show "Connecting..." (gray/neutral) until first status received

### Offline State Display
- **Information shown:** Last seen timestamp in relative format ("5 minutes ago")
- **Call-to-action:** "Check Discord" suggestion when bot is offline
- **Dashboard behavior:** Fully functional — all viewing/browsing works, only mutations would be disabled (when Phase 5 adds them)

### Connection Resilience
- **Connection drop:** Auto-reconnect silently with exponential backoff
- **Failure threshold:** After 3 failed attempts (~30 seconds), show warning
- **Failure notification:** Subtle inline warning near status indicator — non-disruptive
- **Manual retry:** Click the status indicator to trigger immediate reconnect attempt

### Claude's Discretion
- SSE implementation details (EventSource vs custom)
- Exact exponential backoff intervals
- Pulse animation keyframes/timing
- Reconnect logic state management

</decisions>

<specifics>
## Specific Ideas

- Discord-style green dot with pulsing animation for online state
- Status indicator lives in guild header, making it contextual to the selected guild
- "Check Discord" as the offline CTA — practical guidance since users can't fix bot issues from dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-real-time-updates*
*Context gathered: 2026-01-31*
