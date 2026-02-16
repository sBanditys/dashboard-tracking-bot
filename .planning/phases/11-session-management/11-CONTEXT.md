# Phase 11: Session Management - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can view their active sessions and revoke access from specific devices. Includes session list, individual session revocation, and "logout all devices" functionality. Creating new session types, changing authentication flows, or adding 2FA are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Session list display
- Card-based layout — each session rendered as an individual card
- Full detail per card: device type, browser, OS, masked IP, last active timestamp, location (if available)
- Device icons shown alongside text labels (Desktop, Mobile, Tablet icons)
- Header with session count and description (e.g., "Active Sessions (3)")

### Revocation behavior
- Confirmation dialog (modal) before revoking a single session — shows device details
- Revoked session card animates out with smooth transition
- "Logout all devices" revokes ALL sessions including current — redirects user to login page
- "Logout all devices" uses same confirmation dialog style as single revoke (no extra warning)

### Device identification
- Masked IP display (e.g., 192.168.xxx.xxx) for privacy
- Device icons for Desktop, Mobile, Tablet alongside text labels

### Page location & layout
- "Logout all devices" button placed at bottom of the session list (less prominent)
- Header shows "Active Sessions (X)" with brief description

### Claude's Discretion
- Current session indicator style (badge, highlight, pinned position)
- Session list sort order
- Device parsing depth (rich vs basic user agent parsing)
- Unknown/unrecognizable device fallback display
- Page location within dashboard (settings tab, standalone page, or profile dropdown)
- Single-session edge case (whether to show/hide "Logout all" when only one session exists)
- Exact card spacing, typography, and animation timing

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-session-management*
*Context gathered: 2026-02-16*
