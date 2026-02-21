# Requirements: Tracking Dashboard

**Defined:** 2026-02-16
**Core Value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.

## v1.1 Requirements

Requirements for security hardening and backend alignment. Each maps to roadmap phases.

### Authentication & Security

- [ ] **AUTH-01**: User session persists when access token expires (refresh token automatically rotates)
- [ ] **AUTH-02**: User with unverified Discord email cannot log in (backend rejects, dashboard shows clear error)
- [ ] **AUTH-03**: All frontend mutation requests include CSRF token via double-submit cookie pattern
- [ ] **AUTH-04**: Dashboard serves Content-Security-Policy headers preventing XSS vectors
- [ ] **AUTH-05**: Proxy layer sanitizes backend error messages (no stack traces or internal details leak to client)
- [ ] **AUTH-06**: All raw SQL queries in dashboard-related backend routes use parameterized `Prisma.sql` template tags

### Session Management

- [ ] **SESS-01**: User can view list of active sessions (device, masked IP, last activity)
- [ ] **SESS-02**: User can revoke an individual session from the sessions list
- [ ] **SESS-03**: User can logout from all devices at once

### Bonus System

- [x] **BONUS-01**: User can view paginated list of bonus rounds
- [x] **BONUS-02**: User can view bonus round details (targets, payment status)
- [x] **BONUS-03**: Admin can create a bonus round with targets and amount
- [x] **BONUS-04**: Admin can mark individual payments as paid/unpaid
- [x] **BONUS-05**: Admin can bulk-update all payments in a round
- [x] **BONUS-06**: User can view bonus round results with near-miss reporting
- [x] **BONUS-07**: User can view bonus achievement leaderboard

### Alert Management

- [ ] **ALERT-01**: User can view alert thresholds for an account group
- [ ] **ALERT-02**: Admin can create alert threshold (metric type, platform, value)
- [ ] **ALERT-03**: Admin can delete an alert threshold
- [ ] **ALERT-04**: Admin can update alert settings (streak, threshold, status alerts toggle)

### Account Import/Export

- [ ] **IMPEX-01**: Admin can export accounts to CSV with brand/group/platform filters
- [ ] **IMPEX-02**: User can download CSV import template
- [ ] **IMPEX-03**: Admin can upload CSV for import preview with validation
- [ ] **IMPEX-04**: Admin can confirm and execute import with progress indicator

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Performance

- **PERF-01**: Dashboard queries cached with TTL-based invalidation (Valkey)
- **PERF-02**: Rate limiting fail-closed with in-memory fallback when Valkey unavailable

### Backend Hardening

- **BACK-01**: API key scope enforcement set to "enforce" mode in production
- **BACK-02**: Staging environment enforces callback signatures
- **BACK-03**: Comprehensive integration tests for webhook, OAuth, and export flows

## Out of Scope

| Feature | Reason |
|---------|--------|
| Breaking up monolithic backend files (guilds.ts, index.ts) | Backend refactoring scope, not dashboard concern |
| Replacing 899 `any` types in backend | Backend tech debt, separate effort |
| Email alerting implementation | Backend feature, no dashboard UI needed |
| X/Twitter batch refresh fix | Backend/worker concern, not dashboard |
| Streaming exports for large datasets | Backend optimization, separate milestone |
| Real-time chat | High complexity, not core value |
| Mobile app | Web-first, responsive design sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 9 | Pending |
| AUTH-02 | Phase 9 | Pending |
| AUTH-06 | Phase 9 | Pending |
| AUTH-03 | Phase 10 | Pending |
| AUTH-04 | Phase 10 | Pending |
| AUTH-05 | Phase 10 | Pending |
| SESS-01 | Phase 11 | Pending |
| SESS-02 | Phase 11 | Pending |
| SESS-03 | Phase 11 | Pending |
| BONUS-01 | Phase 12 | Complete |
| BONUS-02 | Phase 12 | Complete |
| BONUS-03 | Phase 12 | Complete |
| BONUS-04 | Phase 12 | Complete |
| BONUS-05 | Phase 12 | Complete |
| BONUS-06 | Phase 12 | Complete |
| BONUS-07 | Phase 12 | Complete |
| ALERT-01 | Phase 13 | Pending |
| ALERT-02 | Phase 13 | Pending |
| ALERT-03 | Phase 13 | Pending |
| ALERT-04 | Phase 13 | Pending |
| IMPEX-01 | Phase 13 | Pending |
| IMPEX-02 | Phase 13 | Pending |
| IMPEX-03 | Phase 13 | Pending |
| IMPEX-04 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
