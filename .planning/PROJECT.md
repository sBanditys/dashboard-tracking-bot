# Tracking Dashboard

## What This Is

A web dashboard for Discord server admins to view, manage, and export their tracking bot data. Separate from the main bot repository, it connects to the existing API and stays available even when the Discord bot is down. Features real-time bot status, analytics with charts, data exports, bulk operations, bonus system management, alert thresholds, account import/export, session management, and a security-hardened dark mode UI with CSRF HMAC signing, CSP headers, SSE lifecycle management, and cursor-based pagination.

## Core Value

Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.

## Requirements

### Validated

- ✓ User can log in via Discord OAuth — v1.0
- ✓ User session persists across browser refresh — v1.0
- ✓ User can log out from any page — v1.0
- ✓ Only guilds where user has access are shown — v1.0
- ✓ User can see list of their accessible guilds — v1.0
- ✓ User can view guild details (settings, usage stats) — v1.0
- ✓ User can see bot health status in real-time via SSE — v1.0
- ✓ User can edit guild settings — v1.0
- ✓ User can view audit log of changes — v1.0
- ✓ User can view tracked accounts with pagination and infinite scroll — v1.0
- ✓ User can view tracked posts with pagination and infinite scroll — v1.0
- ✓ User can view brands within a guild — v1.0
- ✓ User can search and filter tracked items — v1.0
- ✓ User can add and remove tracked accounts and brands — v1.0
- ✓ User can select notification channels — v1.0
- ✓ User can request data exports (CSV/JSON/XLSX) — v1.0
- ✓ User can perform bulk operations (delete/reassign) — v1.0
- ✓ User can see analytics counters, time-series charts, and activity timeline — v1.0
- ✓ Dashboard has dark mode (Discord-style theme) — v1.0
- ✓ Dashboard is fully responsive on mobile — v1.0
- ✓ Terms of service and privacy policy pages exist — v1.0
- ✓ Error boundaries gracefully handle API failures — v1.0
- ✓ Keyboard shortcuts (Ctrl+K search) — v1.0

- ✓ User session persists when access token expires (refresh token auto-rotates) — v1.1
- ✓ User with unverified Discord email cannot log in — v1.1
- ✓ All frontend mutation requests include CSRF token via double-submit cookie — v1.1
- ✓ Dashboard serves Content-Security-Policy headers preventing XSS — v1.1
- ✓ Proxy layer sanitizes backend error messages (no stack traces leak) — v1.1
- ✓ All raw SQL queries use parameterized Prisma.sql template tags — v1.1
- ✓ User can view active sessions (device, masked IP, last activity) — v1.1
- ✓ User can revoke individual sessions — v1.1
- ✓ User can logout from all devices at once — v1.1
- ✓ User can view paginated bonus rounds with status indicators — v1.1
- ✓ User can view bonus round details (targets, payment status) — v1.1
- ✓ Admin can create bonus round with targets and amount — v1.1
- ✓ Admin can mark individual payments as paid/unpaid — v1.1
- ✓ Admin can bulk-update all payments in a round — v1.1
- ✓ User can view bonus results with near-miss reporting — v1.1
- ✓ User can view bonus achievement leaderboard — v1.1
- ✓ User can view alert thresholds for account groups — v1.1
- ✓ Admin can create and delete alert thresholds — v1.1
- ✓ Admin can update alert settings (streak, threshold, status toggles) — v1.1
- ✓ Admin can export accounts to CSV with filters — v1.1
- ✓ User can download CSV import template — v1.1
- ✓ Admin can upload CSV for import with validation preview — v1.1
- ✓ Admin can confirm and execute import with progress indicator — v1.1

- ✓ Dashboard error sanitizer handles both old and new backend error envelopes — v1.2
- ✓ SSE connections auto-recover from stalls and tab-switch races — v1.2
- ✓ SSR pages authenticate correctly via cookie forwarding — v1.2
- ✓ Mutations retry on 503 with user-facing toast feedback — v1.2
- ✓ Rate limit buckets split so polling 429s don't block user mutations — v1.2
- ✓ Accounts and posts use cursor-based infinite scroll pagination — v1.2
- ✓ CSRF tokens are HMAC-signed matching backend validation — v1.2
- ✓ Bundle optimized with optimizePackageImports and dynamic imports — v1.2
- ✓ Comprehensive OWASP/CWE security audit report produced — v1.2

### Active

(None — planning next milestone)

### Out of Scope

- Billing/subscriptions — Not needed, users come from Discord bot
- Marketing/landing pages — Not needed, users come from Discord bot
- Mobile app — Web-first, responsive design covers mobile use cases
- Direct database access — All data flows through existing API
- Post management/editing — Dashboard is read-only for external content
- Bot infrastructure controls — Security risk; bot infra managed separately
- AI-powered summarization — High cost, unreliable; users want raw data
- Breaking up monolithic backend files — Backend refactoring scope, not dashboard concern
- Replacing 899 `any` types in backend — Backend tech debt, separate effort
- WebSocket migration — SSE is sufficient; WebSocket adds infrastructure complexity
- Full Zod v4 rewrite — Only deprecated patterns audited; complete rewrite deferred

## Context

Shipped v1.2 with 27,231 LOC TypeScript. v1.0 shipped 2026-02-14, v1.1 shipped 2026-02-22, v1.2 shipped 2026-03-06.
Tech stack: Next.js 14 (App Router), Tailwind CSS, React Query, Recharts, Headless UI, Playwright.
Total: 23 phases, 83 plans across 3 milestones.

**Security posture:** CSRF HMAC-signed tokens (Web Crypto API), CSP with nonce-based script-src, dual-envelope error sanitization across 36+ proxy routes, verified email enforcement, parameterized SQL queries, SSR cookie forwarding, split rate limit buckets, SSE heartbeat timeout with generation counter.

**Performance posture:** optimizePackageImports for lucide-react/recharts, normalized staleTime (2min non-polling), dynamic imports for heavy components (CreateRoundModal, LeaderboardTab, EmailConfigSection), refetchInterval gated on SSE error state only.

**Parent Project:** Tracking_Data_Bot monorepo (API, Bot, Worker, Notifier + shared library)

**Multi-tenancy Model:** Client <-> Guild (1:1) -> Brand -> AccountGroup -> ClientAccount. JWT contains guild permissions, all queries scoped by clientId.

**Architecture:**
```
┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │     │   Discord Bot   │
│  (Vercel)       │     │   (VPS/PM2)     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │ HTTPS + JWT           │ Direct DB
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│              API Server                  │
└────────────────────┬────────────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  PostgreSQL  │
              └──────────────┘
```

**Known tech debt (v1.2):**
- `TODO(v1.3)`: Remove old envelope support in fetch-with-retry.ts and error-sanitizer.ts
- validators.ts dead code (Zod schemas created for future use, never imported)
- ConnectionIssuesBanner not wired to posts page
- use-email-alerts.ts staleTime at 60s (not normalized to 2min)
- Empty-state "Create Round" button no-op in bonus rounds tab
- Import history empty state (no import history API endpoint yet)
- callbackUrl open redirect — no same-origin validation in callback/page.tsx (P2)

## Constraints

- **Tech Stack**: Next.js 14 (App Router), Tailwind CSS (custom components), React Query, TypeScript
- **Deployment**: Vercel — enables failure isolation from bot infrastructure
- **Auth**: Consumes existing API JWT endpoints (no direct Discord OAuth in dashboard)
- **Security**: Multi-tenant isolation enforced at API layer, dashboard validates JWT guild access
- **API Contract**: Dashboard is read-heavy; write operations limited to settings changes and CRUD

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate repository from bot | Failure isolation — dashboard stays up when bot crashes | ✓ Good — independent deployment works well |
| Tailwind without component library | Full design control for SaaS branding | ✓ Good — consistent purple accent theme |
| API as single gateway | No direct DB access from dashboard, security boundary | ✓ Good — clean separation |
| SSE for real-time updates | Simpler than WebSockets, sufficient for status updates | ✓ Good — reused for export/import progress too |
| React Query for server state | Caching, stale-while-revalidate, infinite scroll | ✓ Good — reduced API calls significantly |
| Headless UI for accessible components | ARIA compliance without design constraints | ✓ Good — guild switcher, selects, modals |
| Infinite scroll over pagination | Better UX for card-based layouts | ✓ Good — smooth experience for large datasets |
| Native EventSource over libraries | Smaller bundle, simpler implementation | ✓ Good — works for both status and exports |
| Three-level error boundaries | Targeted recovery without full page loss | ✓ Good — guild errors don't crash dashboard |
| sessionStorage for state persistence | Session-scoped, prevents stale data across tabs | ✓ Good — filters persist within session |
| Custom CSRF over @edge-csrf/nextjs | More control over token lifecycle and exempt routes | ✓ Good — replaced library in Phase 15 |
| Nonce-based CSP with strict-dynamic | Strongest XSS prevention without inline script whitelisting | ✓ Good — all scripts require nonce |
| Per-route error sanitization | Contextual error messages instead of generic "something went wrong" | ✓ Good — better UX with no info leakage |
| Session mutations CSRF-exempt | Protected by auth_token cookie + SameSite=Lax instead | ✓ Good — accepted design tradeoff |
| fetchWithRetry for all mutations | Single point for CSRF injection, auth retry, and error handling | ✓ Good — caught import confirm bypass |
| Playwright for E2E security tests | Verifies middleware behavior (CSRF, CSP, auth redirects) at HTTP level | ✓ Good — caught middleware regression |
| Dual-envelope error parsing | Backward-compatible with old and new backend error shapes | ✓ Good — zero breaking changes during migration |
| HMAC-signed CSRF via Web Crypto | No npm dependencies, matches backend Phase 37 validation | ✓ Good — crypto.subtle is built-in |
| Split rate limit buckets | Polling 429s don't block user mutations | ✓ Good — UX preserved during rate limiting |
| SSE heartbeat + generation counter | Prevents stalled connections and dual EventSource races | ✓ Good — automatic recovery without reload |
| Cursor pagination with resetQueries | Prevents mixed-shape cache pages after mutations | ✓ Good — clean infinite scroll experience |
| Dynamic imports for heavy components | Reduces initial bundle and cold start time | ✓ Good — CreateRoundModal, LeaderboardTab, EmailConfigSection |

---
*Last updated: 2026-03-06 after v1.2 milestone*
