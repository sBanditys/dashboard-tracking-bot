# Roadmap: Tracking Dashboard

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-16)
- ✅ **v1.1 Security Hardening & Backend Alignment** — Phases 9-16 (shipped 2026-02-22)
- 🚧 **v1.2 Security Audit & Optimization** — Phases 17-23 (in progress)

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

### 🚧 v1.2 Security Audit & Optimization (In Progress)

**Milestone Goal:** Align dashboard with backend v2.6 changes, harden security posture, optimize performance, and produce a comprehensive security audit report. No new user-facing features — hardening and alignment only.

- [x] **Phase 17: Error Envelope & API Alignment** - Dual-parse both error shapes so all API errors display correctly (completed 2026-02-22)
- [ ] **Phase 18: SSE Lifecycle Hardening** - Close stalled connections, prevent dual instances, and reset exhausted retries
- [ ] **Phase 19: Auth Hardening & Resilience** - SSR cookie forwarding, 503 retry handling, and rate limit isolation
- [ ] **Phase 20: Cursor Pagination Migration** - Migrate accounts and posts hooks to cursor-based infinite scroll
- [ ] **Phase 21: CSRF HMAC Signing** - Generate HMAC-signed CSRF tokens matching backend Phase 37 validation
- [ ] **Phase 22: Performance Optimization** - Optimize bundle imports, React Query stale times, and cold start contributors
- [ ] **Phase 23: Security Audit Report** - Comprehensive OWASP/CWE audit report covering hardened codebase

## Phase Details

### Phase 17: Error Envelope & API Alignment
**Goal**: All API errors display correctly regardless of envelope shape, and CSRF cookie name is aligned with backend
**Depends on**: Phase 16 (v1.1 complete)
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04
**Success Criteria** (what must be TRUE):
  1. A backend error from any route displays a readable message in the UI — never `[object Object]`
  2. An `unverified_email` error triggers the email-verification redirect under both old and new envelope shapes
  3. The CSRF cookie the dashboard reads is named `csrf_token`, matching the backend's cookie name
  4. Any deprecated Zod v3 validation patterns (`z.string().email()`, `error.errors`) have been replaced with v4 equivalents
**Plans**: 2 plans

Plans:
- [ ] 17-01-PLAN.md — Dual-parse error envelope in sanitizer + fetchWithRetry, CSRF cookie rename, parseApiError helper
- [ ] 17-02-PLAN.md — Fix all hooks to use parseApiError, Zod v4 audit + shared validators, toast duration

### Phase 18: SSE Lifecycle Hardening
**Goal**: SSE connections recover automatically from stalls and tab-switch races without requiring page reload
**Depends on**: Phase 17
**Requirements**: SSE-01, SSE-02, SSE-03, SSE-04
**Success Criteria** (what must be TRUE):
  1. A connection that stops sending events for 45 seconds automatically closes and reconnects without user action
  2. Rapidly hiding and showing the browser tab does not produce two simultaneous EventSource connections
  3. Resuming a tab where retries were exhausted while hidden reconnects the SSE stream rather than staying permanently disconnected
  4. Navigating between pages does not trigger redundant API polling while the SSE connection is healthy
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Heartbeat timeout, generation counter, grace period, retry reset, reconnecting state in useSSE + always-visible BotStatus
- [ ] 18-02-PLAN.md — Gate refetchInterval on connectionState === 'error' only

### Phase 19: Auth Hardening & Resilience
**Goal**: Server-rendered pages authenticate correctly against the backend, and transient backend failures no longer block users from saving changes
**Depends on**: Phase 17
**Requirements**: AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A server-rendered page that calls the backend returns the user's authenticated data rather than a 401 or empty response
  2. A mutation attempted when the backend returns 503 shows a retry toast instead of silently failing
  3. Background polling hitting a rate limit does not prevent a user from submitting a settings save or other mutation for up to 15 minutes
**Plans**: TBD

Plans:
- [ ] 19-01: Forward auth_token cookie as Authorization header in SSR route handlers
- [ ] 19-02: Handle 503 with retry toast and separate global rate limit cooldown for mutations vs reads

### Phase 20: Cursor Pagination Migration
**Goal**: Accounts and posts infinite scroll works correctly against the backend's cursor-based pagination API
**Depends on**: Phase 19 (and backend Phase 39 deploy)
**Requirements**: PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. Scrolling to the bottom of the accounts list loads the next page of results using a cursor, not an offset page number
  2. Scrolling to the bottom of the posts list loads the next page of results using a cursor
  3. Adding or removing a tracked account resets the list from the beginning — no mixed-shape cache pages appear
  4. TypeScript types for pagination accept both cursor-shape and offset-shape responses without compilation errors
**Plans**: TBD

Plans:
- [ ] 20-01: Migrate accounts and posts hooks to cursor pagination with dual-shape TypeScript types
- [ ] 20-02: Replace invalidateQueries with resetQueries for infinite scroll mutation cache management

### Phase 21: CSRF HMAC Signing
**Goal**: Server-to-server mutations send cryptographically signed CSRF tokens that the backend can verify with HMAC
**Depends on**: Phase 17 (and backend Phase 37 dual-check deploy window)
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):
  1. A mutation submitted through the proxy layer succeeds when the backend has HMAC validation enabled
  2. The HMAC token is generated using `crypto.subtle` and `INTERNAL_API_SECRET` without any new npm dependencies
**Plans**: TBD

Plans:
- [ ] 21-01: Implement HMAC-signed CSRF token generation in proxy.ts using crypto.subtle

### Phase 22: Performance Optimization
**Goal**: Dashboard cold starts faster and navigation triggers fewer redundant API requests
**Depends on**: Phase 18 (SSE improvements complete)
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. The Next.js dev server and production build import `lucide-react` as ~333 modules instead of ~1583
  2. Navigating between dashboard pages does not trigger a visible refetch waterfall on data that was recently loaded
  3. A bundle analysis report exists identifying the top cold-start contributors, with dynamic imports applied to the heaviest client components
**Plans**: TBD

Plans:
- [ ] 22-01: Configure optimizePackageImports for lucide-react and recharts in next.config
- [ ] 22-02: Normalize staleTime across all React Query hooks
- [ ] 22-03: Run bundle analysis and apply dynamic imports to top cold-start contributors

### Phase 23: Security Audit Report
**Goal**: A documented audit report exists covering the full security and performance posture of the hardened codebase
**Depends on**: Phases 17-22 (all hardening complete)
**Requirements**: AUDIT-01
**Success Criteria** (what must be TRUE):
  1. The audit report exists at a known path and covers OWASP Top 10, CWE classification, and Node.js/Next.js performance findings
  2. Every finding in the report has a risk score and a documented fix plan or accepted-risk justification
  3. The report reflects the post-hardening state (Phases 17-22 complete) — not the pre-v1.2 state
**Plans**: TBD

Plans:
- [ ] 23-01: Generate comprehensive security and performance audit report

## Progress

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
| 17. Error Envelope & API Alignment | 2/2 | Complete    | 2026-02-22 | - |
| 18. SSE Lifecycle Hardening | 1/2 | In Progress|  | - |
| 19. Auth Hardening & Resilience | v1.2 | 0/2 | Not started | - |
| 20. Cursor Pagination Migration | v1.2 | 0/2 | Not started | - |
| 21. CSRF HMAC Signing | v1.2 | 0/1 | Not started | - |
| 22. Performance Optimization | v1.2 | 0/3 | Not started | - |
| 23. Security Audit Report | v1.2 | 0/1 | Not started | - |

---
*Created: 2026-01-24*
*Last updated: 2026-02-22 after v1.2 roadmap created*
