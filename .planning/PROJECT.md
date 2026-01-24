# Tracking Dashboard

## What This Is

A web dashboard for Discord server admins to view and manage their tracking bot data. Separate from the main bot repository, it connects to the existing API and stays available even when the Discord bot is down. Built as a SaaS product with a foundation for future billing and subscriptions.

## Core Value

Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication**
- [ ] User can log in via Discord OAuth
- [ ] User session persists across browser refresh
- [ ] User can log out from any page
- [ ] Only guilds where user has access are shown

**Guild Management**
- [ ] User can see list of their accessible guilds
- [ ] User can view guild details (settings, usage stats)
- [ ] User can see bot health status for each guild
- [ ] User can edit guild settings
- [ ] User can view audit log of changes

**Tracking Data**
- [ ] User can view tracked accounts (paginated)
- [ ] User can view tracked posts (paginated)
- [ ] User can view brands within a guild
- [ ] User can request data exports

**Real-time Features**
- [ ] Bot status updates in real-time (SSE)
- [ ] Data is cached and refreshes efficiently (React Query)

**Legal & Compliance**
- [ ] Terms of service page exists
- [ ] Privacy policy page exists

**Foundation for SaaS**
- [ ] Route structure accommodates future billing pages
- [ ] Usage data visible per guild
- [ ] Clean separation between auth, dashboard, and future marketing areas

### Out of Scope

- Billing/subscriptions — Phase 3, after core dashboard is validated
- Marketing/landing pages — Not needed for MVP, users come from Discord bot
- Mobile app — Web-first, responsive design covers mobile use cases
- Direct database access — All data flows through existing API

## Context

**Parent Project:** Tracking_Data_Bot monorepo (API, Bot, Worker, Notifier + shared library)

**API Status:** Phase 0 complete — JWT auth, Discord OAuth endpoints, guild read/write endpoints all exist in the core repo.

**Multi-tenancy Model:** Client ↔ Guild (1:1) → Brand → AccountGroup → ClientAccount. JWT contains guild permissions, all queries scoped by clientId.

**Target Architecture:**
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
- **API Contract**: Dashboard is read-heavy; write operations limited to settings changes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate repository from bot | Failure isolation — dashboard stays up when bot crashes | — Pending |
| Tailwind without component library | Full design control for SaaS branding | — Pending |
| API as single gateway | No direct DB access from dashboard, security boundary | — Pending |
| SSE for real-time updates | Simpler than WebSockets, sufficient for status updates | — Pending |

---
*Last updated: 2025-01-24 after initialization*
