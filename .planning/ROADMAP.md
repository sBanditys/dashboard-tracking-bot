# Roadmap: Tracking Dashboard

## Overview

This roadmap transforms an API-backed Discord tracking bot into a standalone web dashboard. The journey starts with authentication foundations, progresses through guild management and data display, adds real-time updates and configuration capabilities, then layers on analytics and data management features. Each phase delivers a coherent, independently verifiable capability that builds toward a complete SaaS dashboard independent of bot uptime.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Authentication** - Secure login, session management, base UI structure
- [ ] **Phase 2: Guild Management** - Guild list, detail views, multi-tenant data model
- [ ] **Phase 3: Tracking Data Display** - View tracked accounts, posts, brands with pagination
- [ ] **Phase 4: Real-Time Updates** - Bot status indicators with live updates
- [ ] **Phase 5: Configuration & Mutations** - Add/edit/remove tracked items and settings
- [ ] **Phase 6: Analytics** - Counters, time-series graphs, activity timelines
- [ ] **Phase 7: Data Management** - Exports and bulk operations
- [ ] **Phase 8: Polish & Optimization** - Performance tuning, edge cases, production readiness

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: Users can securely access the dashboard with persistent sessions
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, UX-01, UX-02, LEGAL-01, LEGAL-02
**Success Criteria** (what must be TRUE):
  1. User can log in via Discord OAuth and see their username/avatar
  2. User session persists across browser refresh without re-login
  3. User can log out from any page and is redirected to login
  4. Dashboard displays in dark mode with responsive layout on mobile devices
  5. Terms of service and privacy policy pages are accessible
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Project setup with Next.js, Tailwind, React Query, and theme providers
- [x] 01-02-PLAN.md — Terms of Service and Privacy Policy pages
- [x] 01-03-PLAN.md — Discord OAuth authentication flow with persistent sessions
- [x] 01-04-PLAN.md — Dashboard shell with sidebar, topbar, mobile drawer, and theme toggle
- [x] 01-05-PLAN.md — Visual and functional verification checkpoint

### Phase 2: Guild Management
**Goal**: Users can view and switch between their accessible Discord guilds
**Depends on**: Phase 1
**Requirements**: GUILD-01, GUILD-02, GUILD-03
**Success Criteria** (what must be TRUE):
  1. User sees a list of guilds where they have manage permissions
  2. User can select a guild and view its details (settings, usage stats)
  3. User can switch between guilds via a guild switcher without page reload
  4. Guild list shows only guilds user currently has access to (no stale permissions)
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Guild switcher component with Headless UI integration
- [ ] 02-02-PLAN.md — Visual and functional verification checkpoint

### Phase 3: Tracking Data Display
**Goal**: Users can view all tracked content within their selected guild
**Depends on**: Phase 2
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04
**Success Criteria** (what must be TRUE):
  1. User can view tracked accounts with pagination (50 per page)
  2. User can view tracked posts with pagination (50 per page)
  3. User can view brands configured within the guild
  4. User can search and filter tracked items by name, platform, or date
  5. Empty states guide users to add their first tracked item
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 4: Real-Time Updates
**Goal**: Users can see bot health status that updates automatically
**Depends on**: Phase 2
**Requirements**: GUILD-04
**Success Criteria** (what must be TRUE):
  1. User sees bot online/offline status indicator that updates in real-time
  2. Bot status changes reflect within 5 seconds without manual refresh
  3. User sees last seen timestamp when bot is offline
  4. Dashboard remains functional when bot is down (independent uptime)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 5: Configuration & Mutations
**Goal**: Users can modify guild settings and manage tracked items
**Depends on**: Phase 3
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05
**Success Criteria** (what must be TRUE):
  1. User can edit guild settings and see changes reflected immediately
  2. User can add new tracked accounts/brands and see them in the list
  3. User can remove tracked items with confirmation dialog
  4. User can select Discord channels for notifications via dropdown
  5. User can view audit log showing who changed what and when
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 6: Analytics
**Goal**: Users can see usage metrics and activity insights
**Depends on**: Phase 3
**Requirements**: ANAL-01, ANAL-02, ANAL-03
**Success Criteria** (what must be TRUE):
  1. User sees basic counters (total tracked accounts, total posts captured)
  2. User sees time-series graph of posts per day/week over last 30 days
  3. User sees activity timeline of recent events (posts added, settings changed)
  4. Graphs render correctly with zero data (empty state message)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 7: Data Management
**Goal**: Users can export and bulk-manage their tracking data
**Depends on**: Phase 5
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. User can request and download data exports (CSV/JSON format)
  2. User can select multiple items and perform bulk operations (add/remove)
  3. Export includes all tracked accounts, posts, and configuration
  4. Bulk operations show confirmation with count of affected items
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 8: Polish & Optimization
**Goal**: Dashboard performs well under real-world usage patterns
**Depends on**: Phase 7
**Requirements**: None (derived from research pitfalls and production testing)
**Success Criteria** (what must be TRUE):
  1. Dashboard initial load completes within 2 seconds on 3G connection
  2. Page transitions feel instant (under 100ms perceived latency)
  3. Large guilds (1000+ tracked items) render without performance degradation
  4. Error boundaries gracefully handle API failures with actionable messages
  5. All edge cases (empty states, network errors, permission changes) have clear UX
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 5/5 | ✓ Complete | 2026-01-29 |
| 2. Guild Management | 0/2 | In Progress | - |
| 3. Tracking Data Display | 0/TBD | Not started | - |
| 4. Real-Time Updates | 0/TBD | Not started | - |
| 5. Configuration & Mutations | 0/TBD | Not started | - |
| 6. Analytics | 0/TBD | Not started | - |
| 7. Data Management | 0/TBD | Not started | - |
| 8. Polish & Optimization | 0/TBD | Not started | - |

---
*Created: 2026-01-24*
*Last updated: 2026-01-29*
