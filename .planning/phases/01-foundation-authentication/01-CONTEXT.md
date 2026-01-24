# Phase 1: Foundation & Authentication - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Secure login via Discord OAuth with persistent sessions, base dashboard UI structure (sidebar + top bar, dark mode, responsive), and legal pages (ToS, Privacy). Users can log in, stay logged in, log out, and see the shell structure. Guild management and actual content display are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Login Experience
- Full-screen branded login page with logo, tagline, prominent Discord button
- No feature preview or screenshots — clean, discovery happens after login
- Progress steps during OAuth: Connecting → Authorizing → Loading profile
- Login errors shown as error card replacing login card with retry button

### Session Handling
- Sessions last 30 days before requiring re-login
- Session expiry: silent redirect to login, return to original page after re-auth
- Logout requires quick confirmation dropdown before executing
- Claude's Discretion: post-logout landing (login page vs goodbye page)

### Dashboard Shell
- Sidebar + top bar layout
- Sidebar: always expanded (not collapsible to icons), main navigation
- Top bar: minimal — logo/title left, user avatar/menu right
- Mobile: slide-out drawer from hamburger menu
- Guild switcher: separate page (not in sidebar dropdown)
- First login: welcome message guiding to guild selection
- Breadcrumbs show navigation path (Home > Guild > Page)
- Page transitions: full page skeleton loading state

### Visual Foundation
- Soft dark mode (dark gray backgrounds #1a1a1a-#2d2d2d range)
- Accent color: Purple (#8B5CF6)
- Component style: sharp & minimal (small/no radius, flat design)
- Theme: dark default with toggle to switch to light mode

### Claude's Discretion
- Exact loading skeleton designs
- Typography and spacing details
- Light mode color palette (when implemented)
- Specific error message wording
- Toast/notification positioning

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches following the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-authentication*
*Context gathered: 2026-01-24*
