# Milestones

## v1.2 Security Audit & Optimization (Shipped: 2026-03-06)

**Phases completed:** 7 phases, 14 plans
**Timeline:** 11 days (2026-02-22 → 2026-03-04)
**Codebase:** 27,231 LOC TypeScript, 98 files modified (+12,090 / -588)

**Delivered:** Security hardening, backend v2.6 API alignment, performance optimization, and comprehensive security audit — no new user-facing features, purely hardening and alignment.

**Key accomplishments:**
1. Dual-envelope error parsing aligned with backend v2.6 error shape migration
2. SSE lifecycle hardened with heartbeat timeout, generation counter, and tab-switch race prevention
3. Auth resilience with SSR cookie forwarding, mutation 503 retry, and split rate limit buckets
4. Cursor-based pagination migration with optimistic mutations and resetQueries
5. HMAC-signed CSRF tokens via Web Crypto API matching backend Phase 37 validation
6. Performance optimization with optimizePackageImports, staleTime normalization, and dynamic imports
7. Comprehensive OWASP/CWE security audit report with risk scoring and fix plans

**Known Tech Debt:**
- `TODO(v1.3)`: Remove old envelope support in fetch-with-retry.ts and error-sanitizer.ts
- validators.ts dead code (created for future use, never imported)
- ConnectionIssuesBanner not wired to posts page
- use-email-alerts.ts staleTime at 60s (not normalized to 2min)

**Audit:** 19/19 requirements satisfied, 5/5 E2E flows verified, tech debt only
**Git range:** `feat(17-01)` → `feat(23-01)`
**Archive:** `milestones/v1.2-ROADMAP.md`, `milestones/v1.2-REQUIREMENTS.md`, `milestones/v1.2-MILESTONE-AUDIT.md`

---

## v1.0 MVP (Shipped: 2026-02-16)

**Phases completed:** 8 phases, 47 plans
**Timeline:** 22 days (2026-01-24 → 2026-02-14)
**Codebase:** 15,260 LOC TypeScript, 296 files

**Delivered:** A complete web dashboard for Discord server admins to view, manage, and export their tracking bot data — independent of bot uptime.

**Key accomplishments:**
1. Discord OAuth authentication with persistent sessions, responsive dark mode dashboard, and legal pages
2. Guild management with permission-enforced list, detail pages, and multi-tenant guild switcher
3. Tracking data display with card grids, infinite scroll, and filters (search, platform, status, date range)
4. Real-time bot status via SSE with 5-second polling, last-seen timestamp, and graceful fallback
5. Full CRUD for accounts and brands with modals, confirmation flows, audit log, and guild settings
6. Analytics dashboard with counter cards, time-series charts, leaderboard, and activity timeline
7. Data management with exports (CSV/JSON/XLSX), bulk operations (delete/reassign), and trash with restore
8. Polish with error boundaries, offline detection, keyboard shortcuts, optimistic updates, and code splitting

**Git range:** `feat(01-01)` → `feat(08-08)`
**Archive:** `milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`

---


## v1.1 Security Hardening & Backend Alignment (Shipped: 2026-02-22)

**Phases completed:** 8 phases, 22 plans
**Timeline:** 7 days (2026-02-16 → 2026-02-22)
**Codebase:** 25,476 LOC TypeScript, 334 files modified (+32,143 / -6,726)

**Delivered:** Security hardening across auth, CSRF, CSP, and error sanitization layers, plus complete UI for bonus system, alert management, session management, and account import/export.

**Key accomplishments:**
1. JWT refresh token persistence with verified email enforcement and SQL injection audit
2. CSRF double-submit cookie protection, backend error sanitization, and Content-Security-Policy headers
3. Session management UI with device listing, individual revocation, and logout-all
4. Complete bonus system with rounds, payments, results, creation wizard, and leaderboard
5. Alert threshold management and CSV account import/export with SSE progress
6. Next.js middleware activation with security headers, CSRF cookies, and auth redirects

**Audit:** 24/24 requirements satisfied, tech debt only (no critical blockers)
**Git range:** `feat(09-01)` → `feat(16-01)`
**Archive:** `milestones/v1.1-ROADMAP.md`, `milestones/v1.1-REQUIREMENTS.md`, `milestones/v1.1-MILESTONE-AUDIT.md`

---

