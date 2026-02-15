# Tracking Dashboard

## What This Is

A web dashboard for Discord server admins to view, manage, and export their tracking bot data. Separate from the main bot repository, it connects to the existing API and stays available even when the Discord bot is down. Features real-time bot status, analytics with charts, data exports, bulk operations, and a polished dark mode UI.

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

### Active

## Current Milestone: v1.1 Security Hardening & Backend Alignment

**Goal:** Harden authentication/security, fix refresh token persistence, block unverified Discord accounts, align all backend endpoints with the dashboard, and address critical concerns from codebase audit.

**Target features:**
- Fix JWT refresh token flow so sessions survive access token expiry
- Block login from unverified Discord accounts (no verified email)
- Add CSRF token support for all frontend mutations
- Add Content-Security-Policy headers
- Audit and fix SQL injection risks in raw queries
- Sanitize backend error messages in proxy layer
- Implement bonus system UI (rounds, payments, results, leaderboard)
- Implement alert threshold management UI
- Implement account import/export UI (CSV upload, template download)
- Implement session management UI (list sessions, revoke, logout-all)
- Address critical concerns from backend CONCERNS.md audit

### Out of Scope

- Billing/subscriptions — Phase 3+, after core dashboard is validated
- Marketing/landing pages — Not needed, users come from Discord bot
- Mobile app — Web-first, responsive design covers mobile use cases
- Direct database access — All data flows through existing API
- Post management/editing — Dashboard is read-only for external content
- Bot infrastructure controls — Security risk; bot infra managed separately
- AI-powered summarization — High cost, unreliable; users want raw data

## Context

Shipped v1.0 with 15,260 LOC TypeScript across 296 files.
Tech stack: Next.js 14 (App Router), Tailwind CSS, React Query, Recharts, Headless UI.
22-day build cycle (2026-01-24 → 2026-02-14), 47 plans across 8 phases.

**Parent Project:** Tracking_Data_Bot monorepo (API, Bot, Worker, Notifier + shared library)

**Multi-tenancy Model:** Client ↔ Guild (1:1) → Brand → AccountGroup → ClientAccount. JWT contains guild permissions, all queries scoped by clientId.

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
| SSE for real-time updates | Simpler than WebSockets, sufficient for status updates | ✓ Good — reused for export progress too |
| React Query for server state | Caching, stale-while-revalidate, infinite scroll | ✓ Good — reduced API calls significantly |
| Headless UI for accessible components | ARIA compliance without design constraints | ✓ Good — guild switcher, selects, modals |
| Infinite scroll over pagination | Better UX for card-based layouts | ✓ Good — smooth experience for large datasets |
| Native EventSource over libraries | Smaller bundle, simpler implementation | ✓ Good — works for both status and exports |
| Three-level error boundaries | Targeted recovery without full page loss | ✓ Good — guild errors don't crash dashboard |
| sessionStorage for state persistence | Session-scoped, prevents stale data across tabs | ✓ Good — filters persist within session |

---
*Last updated: 2026-02-16 after v1.1 milestone definition*
