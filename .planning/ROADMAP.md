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
- [x] **Phase 10: Frontend Security Hardening** - CSRF protection, CSP headers, error sanitization (completed 2026-02-16)
- [x] **Phase 11: Session Management** - View and revoke active sessions (completed 2026-02-22)
- [x] **Phase 12: Bonus System** - Complete bonus rounds UI with payments and leaderboard (completed 2026-02-21)
- [x] **Phase 13: Alert & Import Management** - Alert thresholds and CSV import/export (completed 2026-02-17)
- [x] **Phase 14: Fix Import Confirm CSRF Bypass** - Gap closure: replace raw fetch() with fetchWithRetry() in useConfirmImport (completed 2026-02-22)
- [x] **Phase 15: Reactivate Next.js Middleware** - Gap closure: rename proxy.ts → middleware.ts to restore CSRF + CSP (completed 2026-02-22)

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
**Plans**: 3 plans
- [ ] 09-01-PLAN.md — Backend verified email enforcement (OAuth scope + JWT + middleware)
- [ ] 09-02-PLAN.md — SQL injection audit of all dashboard backend routes
- [ ] 09-03-PLAN.md — Dashboard auth failure UX (toast, return URL, unverified email page)

### Phase 10: Frontend Security Hardening
**Goal**: Dashboard frontend implements CSRF protection, serves CSP headers, and sanitizes backend errors
**Depends on**: Phase 9
**Requirements**: AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. All mutation requests include CSRF token via double-submit cookie pattern
  2. Dashboard serves Content-Security-Policy headers that prevent inline script execution
  3. Backend error responses are sanitized in proxy layer (no stack traces or internal paths leak to client)
  4. User sees user-friendly error messages instead of raw backend errors
**Plans**: 3 plans
- [ ] 10-01-PLAN.md — CSRF protection (double-submit cookie + fetchWithRetry integration)
- [ ] 10-02-PLAN.md — Backend error sanitization in proxy layer
- [ ] 10-03-PLAN.md — CSP headers and security headers suite

### Phase 11: Session Management
**Goal**: Users can view their active sessions and revoke access from specific devices
**Depends on**: Phase 10
**Requirements**: SESS-01, SESS-02, SESS-03
**Success Criteria** (what must be TRUE):
  1. User can view list of active sessions showing device type, masked IP, and last activity timestamp
  2. User can revoke an individual session and see it removed from list immediately
  3. User can click "logout all devices" and all sessions are terminated (requires re-login)
  4. Revoked session cannot access protected routes (returns 401)
**Plans**: 2 plans
- [ ] 11-01-PLAN.md — Session data layer (types, API proxy routes with UA parsing, React Query hooks)
- [ ] 11-02-PLAN.md — Session management UI (session cards, revoke dialog, sessions page)

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
**Plans**: 4 plans
Plans:
- [ ] 12-01-PLAN.md — Data layer (types, proxy routes, React Query hooks)
- [ ] 12-02-PLAN.md — Bonus page, rounds list, expanded round card with inner tabs (Targets, Payments, Results)
- [ ] 12-03-PLAN.md — Round creation form wizard (week picker, group selection, target views, review)
- [ ] 12-04-PLAN.md — Leaderboard tab (podium, ranked table, metric switching, time range filters)

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
**Plans**: 6 plans
Plans:
- [ ] 13-01-PLAN.md — Backend fixes + types + all proxy routes
- [ ] 13-02-PLAN.md — Hooks + manage section routing + admin guard + sidebar
- [ ] 13-03-PLAN.md — Alerts page core (cards, filters, infinite scroll, create, delete)
- [ ] 13-04-PLAN.md — Alerts page extended (bulk ops, email config, alert settings)
- [ ] 13-05-PLAN.md — Data page - Import tab (upload, validation, progress)
- [ ] 13-06-PLAN.md — Data page - Export tab (type selector, filters, history, GDPR)

### Phase 14: Fix Import Confirm CSRF Bypass
**Goal**: All mutation requests use fetchWithRetry for CSRF token injection — closing the import confirm gap
**Depends on**: Phase 13
**Requirements**: AUTH-03, IMPEX-04
**Gap Closure:** Closes gaps from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. `useConfirmImport` in `src/hooks/use-import.ts` uses `fetchWithRetry` instead of raw `fetch()`
  2. POST to `/api/guilds/[guildId]/accounts/import/confirm` includes `X-CSRF-Token` header
  3. Import confirm flow completes without 403 EBADCSRFTOKEN error
**Plans**: 1 plan
- [ ] 14-01-PLAN.md — Replace raw fetch() with fetchWithRetry() in useConfirmImport

### Phase 15: Reactivate Next.js Middleware
**Goal**: Next.js middleware is active, restoring CSRF cookie issuance and CSP header injection for all routes
**Depends on**: Phase 14
**Requirements**: AUTH-03, AUTH-04
**Gap Closure:** Closes gaps from v1.1 audit (middleware inactive root cause)
**Success Criteria** (what must be TRUE):
  1. `src/middleware.ts` exists with `export async function middleware` (not proxy.ts/proxy)
  2. `_csrf_token` cookie is set on page responses (CSRF double-submit pattern active)
  3. `Content-Security-Policy` header is present on all page responses
  4. Auth redirect happens at SSR level for unauthenticated requests to protected routes
**Plans**: 2 plans
Plans:
- [ ] 15-01-PLAN.md — Rename proxy.ts to middleware.ts, enhance security headers, CSP report route, auth redirect returnTo
- [ ] 15-02-PLAN.md — Playwright E2E tests for security headers, CSRF cookies, and auth redirects

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
| 9. Authentication Security | v1.1 | 0/3 | Not started | - |
| 10. Frontend Security Hardening | v1.1 | Complete    | 2026-02-16 | - |
| 11. Session Management | v1.1 | Complete    | 2026-02-22 | - |
| 12. Bonus System | 4/4 | Complete    | 2026-02-21 | - |
| 13. Alert & Import Management | v1.1 | Complete    | 2026-02-17 | - |
| 14. Fix Import Confirm CSRF Bypass | 1/1 | Complete    | 2026-02-22 | - |
| 15. Reactivate Next.js Middleware | 2/2 | Complete    | 2026-02-22 | - |

---
*Created: 2026-01-24*
*Last updated: 2026-02-16 after Phase 11 planning*
