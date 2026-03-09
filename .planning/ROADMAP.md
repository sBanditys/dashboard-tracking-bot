# Roadmap: Tracking Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-16)
- ✅ **v1.1 Security Hardening & Backend Alignment** — Phases 9-16 (shipped 2026-02-22)
- ✅ **v1.2 Security Audit & Optimization** — Phases 17-23 (shipped 2026-03-06)
- 🚧 **v1.3 Campaign System & Tech Debt** — Phases 24-29 (in progress)

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

<details>
<summary>✅ v1.1 Security Hardening & Backend Alignment (Phases 9-16) — SHIPPED 2026-02-22</summary>

- [x] Phase 9: Authentication Security (3/3 plans) — completed 2026-02-16
- [x] Phase 10: Frontend Security Hardening (3/3 plans) — completed 2026-02-16
- [x] Phase 11: Session Management (2/2 plans) — completed 2026-02-22
- [x] Phase 12: Bonus System (4/4 plans) — completed 2026-02-21
- [x] Phase 13: Alert & Import Management (6/6 plans) — completed 2026-02-17
- [x] Phase 14: Fix Import Confirm CSRF Bypass (1/1 plan) — completed 2026-02-22
- [x] Phase 15: Reactivate Next.js Middleware (2/2 plans) — completed 2026-02-22
- [x] Phase 16: Restore Next.js Middleware (1/1 plan) — completed 2026-02-22

Full details: `milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Security Audit & Optimization (Phases 17-23) — SHIPPED 2026-03-06</summary>

- [x] Phase 17: Error Envelope & API Alignment (2/2 plans) — completed 2026-02-22
- [x] Phase 18: SSE Lifecycle Hardening (2/2 plans) — completed 2026-02-23
- [x] Phase 19: Auth Hardening & Resilience (3/3 plans) — completed 2026-02-23
- [x] Phase 20: Cursor Pagination Migration (2/2 plans) — completed 2026-02-23
- [x] Phase 21: CSRF HMAC Signing (1/1 plan) — completed 2026-02-23
- [x] Phase 22: Performance Optimization (3/3 plans) — completed 2026-03-04
- [x] Phase 23: Security Audit Report (1/1 plan) — completed 2026-03-04

Full details: `milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 Campaign System & Tech Debt (In Progress)

**Milestone Goal:** Build the complete campaign management frontend consuming backend v2.7 campaign REST API (12 endpoints), and close all carried-forward tech debt from v1.2.

- [x] **Phase 24: Tech Debt & Shared Utilities** - Close v1.2 tech debt and extract shared utilities needed by campaign work (completed 2026-03-09)
- [x] **Phase 25: Campaign Types, Proxy Routes & Hooks** - Data layer foundation: TypeScript types, 12 proxy routes, React Query hooks (completed 2026-03-09)
- [ ] **Phase 26: Campaign List & Detail** - Read-only campaign UI with cursor pagination, status filtering, and detail view
- [ ] **Phase 27: Campaign Mutations** - Create, edit, and delete campaign forms with validation and status guards
- [ ] **Phase 28: Analytics & Payouts** - Participant earnings table, payout management with mark-paid and bulk operations
- [ ] **Phase 29: Campaign Export** - Campaign data export with format/scope selection and SSE progress tracking

## Phase Details

### Phase 24: Tech Debt & Shared Utilities
**Goal**: Clean slate for campaign work -- remove dead code, fix security issues, and extract shared utilities
**Depends on**: Nothing (independent of campaign work)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Success Criteria** (what must be TRUE):
  1. Old error envelope parsing code is removed from fetch-with-retry.ts and error-sanitizer.ts without breaking any existing error handling
  2. Navigating to /auth/callback with a malicious callbackUrl redirects to the dashboard home instead of the external site
  3. Posts page shows the ConnectionIssuesBanner when SSE connection is degraded
  4. validators.ts no longer exists in the codebase (or all dead exports are removed)
  5. A shared `formatCents()` utility exists in src/lib/format.ts and is importable by both bonus and campaign modules
**Plans**: 2 plans
Plans:
- [ ] 24-01-PLAN.md — Error envelope cleanup and callback redirect security fix
- [ ] 24-02-PLAN.md — Dead code removal, banner wiring, and formatCents extraction

### Phase 25: Campaign Types, Proxy Routes & Hooks
**Goal**: Complete data layer so campaign UI phases can consume ready-made hooks without touching API plumbing
**Depends on**: Phase 24 (shared formatCents utility)
**Requirements**: (infrastructure supporting CAMP-01 through CAMP-09, ANAL-01, ANAL-02, PAY-01 through PAY-05, EXP-01, EXP-02)
**Success Criteria** (what must be TRUE):
  1. All 12 campaign proxy routes return sanitized errors (no Prisma stack traces leak) when called with invalid guild IDs
  2. Campaign TypeScript types cover all backend response shapes (list, detail, analytics, payouts, payout history, export)
  3. A `campaignKeys` query key factory exists with narrow invalidation scopes (no cross-contamination with bonus or tracking caches)
  4. Cursor-based hooks (campaign list, analytics) and offset-based hooks (payouts, history) both return data when called against real backend endpoints
**Plans**: 2 plans
Plans:
- [ ] 25-01-PLAN.md — Campaign types, Zod schemas, and 9 proxy route files
- [ ] 25-02-PLAN.md — Campaign hooks file with query key factory and 12 hooks

### Phase 26: Campaign List & Detail
**Goal**: Users can browse and inspect campaigns with full read-only visibility into status, budget, rates, and participant counts
**Depends on**: Phase 25 (types, proxy routes, hooks)
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-08, CAMP-09
**Success Criteria** (what must be TRUE):
  1. User can scroll through campaigns with infinite scroll loading more results as they reach the bottom
  2. User can filter the campaign list by status (Draft, Active, Paused, SubmissionsClosed, Completed) and the list updates immediately
  3. User can click a campaign to see detail view with summary counters (total earned, participants, posts, budget remaining)
  4. Campaign status is displayed as a color-coded badge on both list cards and detail view (Draft=gray, Active=green, Paused=yellow, SubmissionsClosed=orange, Completed=blue)
  5. Campaign detail shows platform rate cards with icons and a budget utilization progress bar with color thresholds
**Plans**: 2 plans
Plans:
- [ ] 26-01-PLAN.md — Shared campaign components, status filter, and list page with infinite scroll
- [ ] 26-02-PLAN.md — Campaign detail page with counters, budget bar, rate cards, and settings

### Phase 27: Campaign Mutations
**Goal**: Admins can create, configure, and clean up campaigns through the dashboard
**Depends on**: Phase 26 (campaign detail view for edit/delete context)
**Requirements**: CAMP-05, CAMP-06, CAMP-07
**Success Criteria** (what must be TRUE):
  1. Admin can create a campaign by filling in name, budget, per-user cap, and at least one platform rate, and the new campaign appears in the list
  2. Admin can edit any of the 14 optional campaign fields and see changes reflected after save, with a toast on 409 conflict prompting refresh
  3. Admin can delete a Draft or Completed campaign with a confirmation dialog, and attempting to delete an Active/Paused campaign shows an explanation why it is not allowed
  4. Non-admin users do not see create, edit, or delete buttons
**Plans**: TBD

### Phase 28: Analytics & Payouts
**Goal**: Users can view campaign performance data and admins can manage participant payments
**Depends on**: Phase 26 (campaign detail view as host for analytics/payout tabs)
**Requirements**: ANAL-01, ANAL-02, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05
**Success Criteria** (what must be TRUE):
  1. User can view a cursor-paginated participant earnings table showing each participant's total earned and post count
  2. User can search participants by userId in the analytics and payouts views and results filter in real time
  3. Admin can mark a single participant as paid with a confirmation dialog, and the UI updates optimistically (rolling back on error)
  4. Admin can select up to 50 participants via checkboxes and bulk mark them as paid, with a success toast showing paid count and total amount
  5. User can view an offset-paginated payout history audit trail showing who marked whom as paid, when, and for how much
**Plans**: TBD

### Phase 29: Campaign Export
**Goal**: Admins can export campaign data for external reporting and accounting
**Depends on**: Phase 26 (campaign detail view as host for export action)
**Requirements**: EXP-01, EXP-02
**Success Criteria** (what must be TRUE):
  1. Admin can trigger a campaign export by selecting format (CSV/XLSX) and scope (payment/full), receiving a queued confirmation
  2. User can see export progress via SSE updates and receives a download link when the export completes
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 24 → 25 → 26 → 27 → 28 → 29

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
| 9. Authentication Security | v1.1 | 3/3 | Complete | 2026-02-16 |
| 10. Frontend Security Hardening | v1.1 | 3/3 | Complete | 2026-02-16 |
| 11. Session Management | v1.1 | 2/2 | Complete | 2026-02-22 |
| 12. Bonus System | v1.1 | 4/4 | Complete | 2026-02-21 |
| 13. Alert & Import Management | v1.1 | 6/6 | Complete | 2026-02-17 |
| 14. Fix Import Confirm CSRF Bypass | v1.1 | 1/1 | Complete | 2026-02-22 |
| 15. Reactivate Next.js Middleware | v1.1 | 2/2 | Complete | 2026-02-22 |
| 16. Restore Next.js Middleware | v1.1 | 1/1 | Complete | 2026-02-22 |
| 17. Error Envelope & API Alignment | v1.2 | 2/2 | Complete | 2026-02-22 |
| 18. SSE Lifecycle Hardening | v1.2 | 2/2 | Complete | 2026-02-23 |
| 19. Auth Hardening & Resilience | v1.2 | 3/3 | Complete | 2026-02-23 |
| 20. Cursor Pagination Migration | v1.2 | 2/2 | Complete | 2026-02-23 |
| 21. CSRF HMAC Signing | v1.2 | 1/1 | Complete | 2026-02-23 |
| 22. Performance Optimization | v1.2 | 3/3 | Complete | 2026-03-04 |
| 23. Security Audit Report | v1.2 | 1/1 | Complete | 2026-03-04 |
| 24. Tech Debt & Shared Utilities | 2/2 | Complete    | 2026-03-09 | - |
| 25. Campaign Types, Proxy Routes & Hooks | 2/2 | Complete    | 2026-03-09 | - |
| 26. Campaign List & Detail | 1/2 | In Progress|  | - |
| 27. Campaign Mutations | v1.3 | 0/0 | Not started | - |
| 28. Analytics & Payouts | v1.3 | 0/0 | Not started | - |
| 29. Campaign Export | v1.3 | 0/0 | Not started | - |

---
*Created: 2026-01-24*
*Last updated: 2026-03-09 after Phase 26 planning*
