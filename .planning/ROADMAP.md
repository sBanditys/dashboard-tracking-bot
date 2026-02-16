# Roadmap: Tracking Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-16)
- 🚧 **v1.1 Security Hardening & Backend Alignment** — Phases 9-13 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Foundation & Authentication (5/5 plans) — completed 2026-01-29
- [x] Phase 2: Guild Management (2/2 plans) — completed 2026-01-30
- [x] Phase 3: Tracking Data Display (6/6 plans) — completed 2026-02-01
- [x] Phase 4: Real-Time Updates (3/3 plans) — completed 2026-02-03
- [x] Phase 5: Configuration & Mutations (7/7 plans) — completed 2026-02-05
- [x] Phase 6: Analytics (6/6 plans) — completed 2026-02-07
- [x] Phase 7: Data Management (9/9 plans) — completed 2026-02-07
- [x] Phase 8: Polish & Optimization (9/9 plans) — completed 2026-02-14

Full details: `milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Security Hardening & Backend Alignment (In Progress)

**Milestone Goal:** Harden authentication and security layers, fix session persistence, block unverified accounts, and deliver complete UI for bonus system, alert management, session management, and account import/export.

- [ ] **Phase 9: Authentication Security** - Backend security fixes (refresh tokens, verified email, SQL injection audit)
- [ ] **Phase 10: Frontend Security Hardening** - CSRF protection, CSP headers, error sanitization
- [ ] **Phase 11: Session Management** - View and revoke active sessions
- [ ] **Phase 12: Bonus System** - Complete bonus rounds UI with payments and leaderboard
- [ ] **Phase 13: Alert & Import Management** - Alert thresholds and CSV import/export

## Phase Details

### Phase 9: Authentication Security
**Goal**: Backend authentication is hardened with refresh token persistence, verified email enforcement, and SQL injection protection
**Depends on**: Nothing (milestone start)
**Requirements**: AUTH-01, AUTH-02, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User session persists beyond access token expiry without re-login (refresh token auto-rotates)
  2. User with unverified Discord email receives clear rejection message when attempting login
  3. All dashboard-related backend routes using raw SQL have been audited and converted to parameterized queries
  4. Dashboard displays clear error when login fails due to unverified email
**Plans**: TBD

### Phase 10: Frontend Security Hardening
**Goal**: Dashboard frontend implements CSRF protection, serves CSP headers, and sanitizes backend errors
**Depends on**: Phase 9
**Requirements**: AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. All mutation requests include CSRF token via double-submit cookie pattern
  2. Dashboard serves Content-Security-Policy headers that prevent inline script execution
  3. Backend error responses are sanitized in proxy layer (no stack traces or internal paths leak to client)
  4. User sees user-friendly error messages instead of raw backend errors
**Plans**: TBD

### Phase 11: Session Management
**Goal**: Users can view their active sessions and revoke access from specific devices
**Depends on**: Phase 10
**Requirements**: SESS-01, SESS-02, SESS-03
**Success Criteria** (what must be TRUE):
  1. User can view list of active sessions showing device type, masked IP, and last activity timestamp
  2. User can revoke an individual session and see it removed from list immediately
  3. User can click "logout all devices" and all sessions are terminated (requires re-login)
  4. Revoked session cannot access protected routes (returns 401)
**Plans**: TBD

### Phase 12: Bonus System
**Goal**: Users can view bonus rounds, payments, and results; admins can create rounds and manage payments
**Depends on**: Phase 11
**Requirements**: BONUS-01, BONUS-02, BONUS-03, BONUS-04, BONUS-05, BONUS-06, BONUS-07
**Success Criteria** (what must be TRUE):
  1. User can view paginated list of bonus rounds with status indicators
  2. User can view bonus round details showing all targets and their payment status
  3. Admin can create a new bonus round with target accounts and payout amount
  4. Admin can mark individual payments as paid or unpaid with confirmation
  5. Admin can bulk-update all payments in a round (mark all paid/unpaid)
  6. User can view bonus results page showing near-miss reporting (accounts close to threshold)
  7. User can view bonus leaderboard showing achievement rankings across all rounds
**Plans**: TBD

### Phase 13: Alert & Import Management
**Goal**: Admins can manage alert thresholds and import/export accounts via CSV
**Depends on**: Phase 12
**Requirements**: ALERT-01, ALERT-02, ALERT-03, ALERT-04, IMPEX-01, IMPEX-02, IMPEX-03, IMPEX-04
**Success Criteria** (what must be TRUE):
  1. User can view alert thresholds configured for an account group (metric type, platform, value)
  2. Admin can create new alert threshold with validation
  3. Admin can delete alert threshold with confirmation
  4. Admin can update alert settings (streak alerts, threshold alerts, status alerts toggle)
  5. Admin can export accounts to CSV with filters (brand, group, platform)
  6. User can download CSV import template with correct column headers
  7. Admin can upload CSV for import, see validation preview with error highlighting
  8. Admin can confirm import after preview and see progress indicator during execution
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10 → 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Authentication | v1.0 | 5/5 | Complete | 2026-01-29 |
| 2. Guild Management | v1.0 | 2/2 | Complete | 2026-01-30 |
| 3. Tracking Data Display | v1.0 | 6/6 | Complete | 2026-02-01 |
| 4. Real-Time Updates | v1.0 | 3/3 | Complete | 2026-02-03 |
| 5. Configuration & Mutations | v1.0 | 7/7 | Complete | 2026-02-05 |
| 6. Analytics | v1.0 | 6/6 | Complete | 2026-02-07 |
| 7. Data Management | v1.0 | 9/9 | Complete | 2026-02-07 |
| 8. Polish & Optimization | v1.0 | 9/9 | Complete | 2026-02-14 |
| 9. Authentication Security | v1.1 | 0/TBD | Not started | - |
| 10. Frontend Security Hardening | v1.1 | 0/TBD | Not started | - |
| 11. Session Management | v1.1 | 0/TBD | Not started | - |
| 12. Bonus System | v1.1 | 0/TBD | Not started | - |
| 13. Alert & Import Management | v1.1 | 0/TBD | Not started | - |

---
*Created: 2026-01-24*
*Last updated: 2026-02-16 after v1.1 roadmap creation*
