# Phase 18: SSE Lifecycle Hardening - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the existing `useSSE` hook so SSE connections self-heal from stalls, tab-switch races, and exhausted retries without requiring a page reload. Gate fallback polling to error state only. No new SSE features or endpoints — this phase improves reliability of the existing real-time pipeline.

</domain>

<decisions>
## Implementation Decisions

### Heartbeat & stall detection
- Claude's discretion on detection approach (client-side silence timer vs server heartbeat — investigate what backend currently sends)
- Claude's discretion on timeout threshold (roadmap says 45s — adjust if analysis suggests otherwise)
- On stall-triggered reconnect, show a brief "Reconnecting..." state in the connection indicator — not silent, but not intrusive
- Claude's discretion on whether heartbeat timer runs while tab is hidden (depends on tab-visibility close behavior)

### Tab-switch reconnect behavior
- Add a **15-second grace period** before closing the connection when the tab is hidden — quick tab switches should not cause a disconnect/reconnect cycle
- If user returns within the grace period, cancel the close timer and keep the existing connection
- Claude's discretion on whether to verify connection health on grace-period return or trust the open connection
- Claude's discretion on whether post-grace reconnect is instant or respects cooldown (balance responsiveness vs race condition safety)
- Use generation counter (`connectGenerationRef`) to prevent dual EventSource instances from rapid visibility toggles

### Retry exhaustion & recovery
- Claude's discretion on retry reset strategy when tab returns after exhaustion (full reset vs single attempt)
- Claude's discretion on max retry count (currently 3 — may increase for long-running dashboard sessions)
- Claude's discretion on manual reconnect UX (button placement and integration with status indicator)
- `refetchInterval` polling must only fire when `connectionState === 'error'` — investigate current codebase to confirm polling-as-fallback pattern exists and gate it accordingly

### Connection health feedback
- **Always-visible** connection status indicator — shows state at all times, not just on errors
- Visual style: **colored dot + text label** (e.g., green dot "Live", yellow dot "Reconnecting", red dot "Disconnected")
- Claude's discretion on placement (header/navbar vs inline near SSE-powered content)
- Claude's discretion on whether reconnect action is integrated into the indicator or a separate button

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

</decisions>

<specifics>
## Specific Ideas

- User wants the connection status to be always visible — not hidden-until-broken. Colored dot + label style (like "Live", "Reconnecting", "Disconnected")
- Stall reconnects should show a subtle "Reconnecting..." indicator — the user should notice but not be interrupted
- 15-second grace period on tab hide was specifically requested to support multi-tab workflows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-sse-lifecycle-hardening*
*Context gathered: 2026-02-23*
