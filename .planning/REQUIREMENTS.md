# Requirements: Tracking Dashboard

**Defined:** 2025-01-24
**Core Value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can log in via Discord OAuth through existing API
- [ ] **AUTH-02**: User session persists across browser refresh (HttpOnly cookies)
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User only sees guilds where they have manage permissions

### Guild Management

- [x] **GUILD-01**: User can see list of their accessible guilds with status indicators
- [x] **GUILD-02**: User can view guild details (settings, usage stats, bot health)
- [x] **GUILD-03**: User can switch between guilds quickly via guild switcher
- [ ] **GUILD-04**: Bot status updates in real-time via SSE

### Tracking Data

- [ ] **TRACK-01**: User can view tracked accounts with pagination
- [ ] **TRACK-02**: User can view tracked posts with pagination
- [ ] **TRACK-03**: User can view brands within a guild
- [ ] **TRACK-04**: User can search and filter tracked items

### Configuration

- [ ] **CONF-01**: User can edit guild settings
- [ ] **CONF-02**: User can add new tracked items
- [ ] **CONF-03**: User can remove tracked items
- [ ] **CONF-04**: User can select notification channels
- [ ] **CONF-05**: User can view audit log of configuration changes

### Analytics

- [ ] **ANAL-01**: User can see basic counters (total tracked accounts, total posts)
- [ ] **ANAL-02**: User can see time-series graphs (posts per day/week)
- [ ] **ANAL-03**: User can see activity timeline of recent events

### Data Management

- [ ] **DATA-01**: User can request and download data exports
- [ ] **DATA-02**: User can perform bulk operations (add/remove multiple items)

### UX & Compliance

- [ ] **UX-01**: Dashboard has dark mode (Discord-style theme)
- [ ] **UX-02**: Dashboard is fully responsive on mobile devices
- [ ] **LEGAL-01**: Terms of service page exists
- [ ] **LEGAL-02**: Privacy policy page exists

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Multi-server overview (aggregate view across all guilds)
- **ADV-02**: Post content preview in dashboard
- **ADV-03**: Undo/redo for configuration changes
- **ADV-04**: Import/export configuration between guilds
- **ADV-05**: Keyboard shortcuts for power users

### Collaboration

- **COLLAB-01**: Team roles with granular permissions
- **COLLAB-02**: Detailed change history with diff view
- **COLLAB-03**: Notes/annotations on tracked items

### Integrations

- **INT-01**: Webhook notifications to external services
- **INT-02**: API access for custom integrations
- **INT-03**: RSS feed of tracked posts

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Post management/editing | Dashboard is read-only for external content; links to original |
| Built-in chat/communication | Discord handles communication; dashboard is data/controls only |
| Bot infrastructure controls | Security risk; bot infra managed separately |
| Custom theme uploads | XSS risk; built-in light/dark mode sufficient |
| AI-powered summarization | High cost, unreliable; users want raw data |
| Social features (profiles, following) | Not a social network; data is private per guild |
| Mobile native app | Web responsive covers mobile use cases |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| GUILD-01 | Phase 2 | Complete |
| GUILD-02 | Phase 2 | Complete |
| GUILD-03 | Phase 2 | Complete |
| GUILD-04 | Phase 4 | Pending |
| TRACK-01 | Phase 3 | Pending |
| TRACK-02 | Phase 3 | Pending |
| TRACK-03 | Phase 3 | Pending |
| TRACK-04 | Phase 3 | Pending |
| CONF-01 | Phase 5 | Pending |
| CONF-02 | Phase 5 | Pending |
| CONF-03 | Phase 5 | Pending |
| CONF-04 | Phase 5 | Pending |
| CONF-05 | Phase 5 | Pending |
| ANAL-01 | Phase 6 | Pending |
| ANAL-02 | Phase 6 | Pending |
| ANAL-03 | Phase 6 | Pending |
| DATA-01 | Phase 7 | Pending |
| DATA-02 | Phase 7 | Pending |
| UX-01 | Phase 1 | Complete |
| UX-02 | Phase 1 | Complete |
| LEGAL-01 | Phase 1 | Complete |
| LEGAL-02 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2025-01-24*
*Last updated: 2026-01-30 after Phase 2 completion*
