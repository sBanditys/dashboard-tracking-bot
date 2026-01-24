# Project Research Summary

**Project:** Discord Bot Management Dashboard
**Domain:** Multi-tenant SaaS Dashboard with Discord OAuth
**Researched:** 2026-01-24
**Confidence:** HIGH

## Executive Summary

This is a Next.js SaaS dashboard that serves as a management interface for a Discord tracking bot. Expert implementations in this domain (MEE6, Dyno, Carl-bot) follow a consistent pattern: thin client dashboard consuming an external API, with Discord OAuth for authentication, multi-tenant isolation by guild, and real-time status updates independent of bot availability. The recommended approach uses Next.js 14 App Router with Server Components, custom JWT authentication (not NextAuth.js, since the existing API owns auth), React Query for client-side state, and Tailwind CSS for styling.

The critical architectural decision is to treat the dashboard as an API consumer, not an authentication provider. The existing bot API handles Discord OAuth and issues JWTs; the dashboard validates these tokens and proxies user requests. This creates clean separation of concerns and avoids dual auth systems. The multi-tenant model maps Discord guilds to tenants, with strict server-side validation on every request to prevent cross-tenant data leaks—the most critical security risk in this architecture.

Key risks center on multi-tenancy security (cross-guild data leaks via client-side filtering), authentication state management (stale guild permissions after user removal), and real-time infrastructure (unbounded SSE connections causing memory leaks). Mitigation requires defense-in-depth: Edge middleware for optimistic auth checks, Data Access Layer for authoritative validation, and per-request guild permission verification. The roadmap should prioritize authentication and security foundations early, as retrofitting these patterns later requires architectural rewrites.

## Key Findings

### Recommended Stack

Next.js 14 with App Router provides a production-ready foundation for multi-tenant SaaS dashboards, with first-class support for Server Components, streaming SSR, and Edge Runtime deployment on Vercel. The custom JWT approach (using `jose` for token validation) is simpler and more appropriate than NextAuth.js for this architecture, where the external API owns authentication and the dashboard is purely a consumer.

**Core technologies:**
- **Next.js 16.1.4** (App Router): Server Components reduce client-side JavaScript, streaming SSR improves perceived performance, native support for Server Actions eliminates traditional API routes for mutations
- **React Query v5**: Essential for multi-tenant cache isolation (scoped by guildId), handles SSE/polling for real-time updates, provides optimistic UI patterns for mutations
- **jose 5.9.x**: Edge-compatible JWT validation library for middleware auth checks, lighter than jsonwebtoken, recommended by Next.js docs for custom auth
- **Tailwind CSS 4.1**: Utility-first styling per project constraint, no component library dependencies
- **Zod 3.24.x**: Runtime validation for API responses prevents drift between dashboard and API, type-safe schemas generate TypeScript types
- **ky 1.7.x**: Modern fetch wrapper (4kb vs axios 32kb), Edge Runtime compatible, built-in retry/timeout for API resilience

**Critical version requirements:**
- Next.js 16.1+ for stable App Router with React 19 features
- Node.js 20.x LTS for Vercel deployment compatibility
- React Query v5.x for latest multi-tenant caching patterns

### Expected Features

Discord bot dashboards have well-established user expectations from mature competitors. Deviation from table stakes features makes the product feel incomplete; missing differentiators creates no competitive advantage.

**Must have (table stakes):**
- Discord OAuth login with server selection — users expect seamless Discord integration
- List/add/remove tracked items — core value proposition
- Bot online/offline status indicator — users check dashboard first when bot fails, status must be independent of bot uptime
- Recent activity log — users want proof the bot is working
- Basic analytics (counters, graphs) — shows value delivered
- Channel selector for notifications — Discord-native UX pattern
- Mobile-responsive UI with dark mode — Discord users expect dark UI everywhere

**Should have (competitive advantage):**
- Real-time dashboard updates (SSE or polling) — most dashboards require manual refresh
- Post content preview — transforms dashboard from control panel to insights platform
- Advanced analytics (trending, engagement) — differentiates from basic counters
- Excellent UX (keyboard shortcuts, undo/redo) — polish creates word-of-mouth
- Transparent reliability features — builds trust when bot is down

**Defer (v2+):**
- Multi-server power user features (bulk operations, saved views)
- Team roles/permissions — complex RBAC
- Webhooks/API access — niche use case
- Audit log — more valuable when team features exist

**Anti-features to avoid:**
- Post management/editing (scope creep)
- Built-in chat/communication (Discord already handles this)
- Bot infrastructure controls (not a DevOps tool)
- AI summarization (expensive, unvalidated demand)

### Architecture Approach

Next.js 14 App Router supports a component-based architecture with route groups for logical organization (auth, dashboard, legal), Server Components by default with strategic Client Components for interactivity, and middleware for auth validation plus Data Access Layer for tenant resolution. The recommended structure uses direct API calls from Server Components (no unnecessary Route Handler proxies), Server Actions for mutations, and Route Handlers reserved for SSE streams and OAuth callbacks.

**Major components:**
1. **Edge Middleware** — optimistic auth check (JWT exists and decrypts), redirects unauthenticated users, runs on Vercel Edge for minimal latency
2. **Data Access Layer (DAL)** — authoritative auth validation with `verifySession()` using React `cache()` for deduplication, single source of truth for guild permissions
3. **API Client Layer** — server-side client injects JWT from httpOnly cookies, handles retry/timeout; client-side client for React Query uses credentials for cookie passing
4. **React Query Provider** — client-side cache with guild-scoped keys, prevents cross-tenant data leaks
5. **Server Actions** — mutations with built-in Zod validation, automatic `revalidatePath()` for cache invalidation
6. **Route Handlers** — SSE streams for bot status, OAuth callback handler, webhook receivers

**Security model:**
- Defense-in-depth: middleware (optimistic) → DAL (authoritative) → API client (tenant-scoped) → Server Actions (input validation)
- All Server Actions MUST call `verifySession()` at start
- Guild permissions validated against session.guilds on every request

### Critical Pitfalls

Domain research identified recurring security vulnerabilities and architectural mistakes in multi-tenant SaaS dashboards.

1. **Client-side guild filtering (cross-tenant data leak)** — trusting JWT claims in browser without server-side validation allows users to access guilds they shouldn't see. Prevention: validate `guildId` against `session.guilds` in every Server Component, Server Action, and Route Handler.

2. **JWT in localStorage (XSS token theft)** — storing tokens in localStorage makes them accessible to any JavaScript. Prevention: use httpOnly cookies set by API via Set-Cookie headers, access tokens server-side only via `cookies()` helper.

3. **Missing guild permissions refresh (stale access)** — user is removed from Discord guild but dashboard still shows it because JWT hasn't expired. Prevention: short-lived JWTs (15min) with refresh tokens (7 days), re-validate guild access from Discord API on refresh.

4. **Unbounded SSE connections (memory leak)** — EventSource connections created but never cleaned up, Vercel functions accumulate connections until OOM. Prevention: `useEffect` cleanup with `eventSource.close()`, server-side disconnect detection, connection timeouts.

5. **Cold start UX disaster** — Vercel serverless cold starts take 3-8 seconds, user thinks site is broken. Prevention: streaming SSR with Suspense boundaries, loading skeletons, avoid client-side data fetching for initial render.

**Additional security checklist (all phases):**
- No `NEXT_PUBLIC_` prefix on secrets
- All external API responses validated with Zod
- Error boundaries for all route segments
- React Query cache keys consistent and documented
- Cursor-based pagination for real-time data

## Implications for Roadmap

Based on research, the roadmap should follow a dependency-driven structure that prioritizes security foundations, establishes architectural patterns early, and defers complex real-time features until core functionality is stable.

### Phase 1: Authentication Foundation
**Rationale:** Nothing works without auth. This phase establishes security patterns (httpOnly cookies, Data Access Layer, middleware) that all subsequent phases depend on. Attempting to retrofit these patterns later requires architectural rewrites.

**Delivers:**
- Discord OAuth login flow with callback handler
- Session management (create/delete/verify)
- Edge middleware for route protection
- Data Access Layer with `verifySession()` using React cache
- Protected route structure with route groups (auth, dashboard, legal)

**Addresses:** Discord OAuth login (table stakes), custom JWT auth pattern (STACK.md)

**Avoids:** JWT in localStorage (Pitfall #2), stale permissions (Pitfall #3)

**Research flag:** Standard OAuth patterns, no additional research needed

---

### Phase 2: Guild Management & Data Display
**Rationale:** Users need to see their guilds and select one to manage. This establishes the multi-tenant data model and cache patterns that all features depend on.

**Delivers:**
- Guild list page (server-rendered)
- Guild detail page with nested layout (guild switcher, breadcrumb)
- API client layer (server-side with JWT injection, client-side for React Query)
- React Query setup with guild-scoped cache keys
- TypeScript types for API responses with Zod validation

**Addresses:** Server/guild list view (table stakes), direct API calls from Server Components (ARCHITECTURE.md)

**Avoids:** Client-side filtering (Pitfall #1), TypeScript any (Pitfall #10), cache invalidation issues (Pitfall #6)

**Research flag:** No additional research needed, patterns established

---

### Phase 3: Tracking Data Views
**Rationale:** Core value proposition is viewing tracked accounts and posts. This implements the primary read paths that users interact with most frequently.

**Delivers:**
- Tracked accounts page with pagination (cursor-based)
- Tracked posts page with pagination
- Brands page
- Search/filter components
- Loading states with Suspense boundaries and skeletons
- Empty states with helpful CTAs

**Addresses:** List tracked items, search/filter (table stakes), Server Components for data fetching (ARCHITECTURE.md)

**Avoids:** Offset pagination (Pitfall #8), cold starts (Pitfall #5), missing error boundaries (Pitfall #13)

**Research flag:** No additional research needed, standard list/table patterns

---

### Phase 4: Bot Status & Real-Time Updates
**Rationale:** Users check dashboard when bot is down (per project requirement: "independent of bot uptime"). Start with React Query polling for MVP, migrate to SSE later if needed.

**Delivers:**
- Bot online/offline status indicator (polling every 5s)
- Last seen timestamp
- Uptime percentage display
- Latency/ping display
- `useBotStatus()` hook with React Query `refetchInterval`

**Addresses:** Bot status indicator (table stakes), real-time updates (differentiator)

**Avoids:** Unbounded SSE (Pitfall #4) by starting with polling, cold starts (Pitfall #5)

**Research flag:** SSE implementation needs Vercel Edge Runtime research for production patterns if migrating from polling

---

### Phase 5: Configuration & Mutations
**Rationale:** Users need to add/remove tracked items and update settings. This introduces write operations via Server Actions.

**Delivers:**
- Add tracked item form with validation (Server Action)
- Remove tracked item with confirmation (Server Action)
- Edit tracked item settings (Server Action)
- Guild settings page (Server Action for updates)
- Channel selector component
- Validation feedback (Zod schemas, error display)
- React Query mutations with optimistic updates

**Addresses:** Add/remove/edit tracked items (table stakes), Server Actions for mutations (STACK.md)

**Avoids:** Missing loading states (Pitfall #11), cache invalidation (Pitfall #6)

**Research flag:** Discord channel permissions API needs validation research (rate limits, permission models)

---

### Phase 6: Analytics & Polish
**Rationale:** Basic analytics prove value delivered. Polish features create competitive differentiation.

**Delivers:**
- Total posts tracked counter
- Posts per day/week graph (time-series chart)
- Most active tracked accounts list
- Activity timeline component
- Export functionality (Server Action generates CSV/JSON)
- Keyboard shortcuts for power users
- Audit log page (if time permits)

**Addresses:** Basic analytics (table stakes), excellent UX (differentiator)

**Avoids:** Premature optimization, over-engineering

**Research flag:** Chart library selection needs research (lightweight options compatible with Server Components)

---

### Phase Ordering Rationale

**Dependency chain:**
1. Authentication (Phase 1) → Guild Management (Phase 2) → Tracking Data (Phase 3) → Mutations (Phase 5)
   - Can't show guilds without auth
   - Can't show tracking data without guild selection
   - Can't mutate data without read paths established

2. Bot Status (Phase 4) is independent and can be parallelized with Phase 3 if needed

3. Analytics (Phase 6) depends on stable data from Phases 3-5

**Why not SSE in Phase 4:**
- Research identified SSE connection cleanup as critical pitfall
- Starting with React Query polling is simpler, validates UX, avoids production risk
- Can migrate to SSE in post-MVP with proper Vercel Edge Runtime research

**Why Server Actions in Phase 5, not earlier:**
- Establishes read-only patterns first
- Server Actions require careful security (verifySession() + input validation)
- Mutations need stable cache invalidation patterns from earlier phases

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 5 (Configuration):** Discord channel permissions API — need to verify rate limits, permission model, error handling for permission denied cases

- **Phase 6 (Analytics):** Chart library selection — needs research for Server Component compatible, lightweight (<10kb) chart libraries

- **Post-MVP (SSE Migration):** Vercel Edge Runtime SSE patterns — MEDIUM confidence based on training data; needs official Vercel docs verification

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Authentication):** Well-documented Next.js + Discord OAuth patterns, HIGH confidence
- **Phase 2 (Guild Management):** Standard CRUD patterns, React Query is well-documented
- **Phase 3 (Tracking Data):** Cursor pagination and list views are established patterns
- **Phase 4 (Bot Status):** React Query polling is straightforward, documented pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Next.js 16.1 stable verified via official docs, React Query v5 is current, Tailwind v4.1 integration documented |
| Features | MEDIUM | Based on training data about MEE6/Dyno/Carl-bot patterns, not verified with current competitive analysis |
| Architecture | HIGH | Next.js App Router patterns verified from official documentation, multi-tenant security is well-established |
| Pitfalls | MEDIUM | Core security pitfalls HIGH confidence (multi-tenancy, JWT storage), SSE patterns MEDIUM (Vercel Edge Runtime) |

**Overall confidence:** HIGH for technical stack and architecture, MEDIUM for feature prioritization

### Gaps to Address

**Feature validation gap:**
- Competitive analysis of MEE6, Dyno, Carl-bot was unavailable (WebSearch tools not accessible)
- Recommendation: Manual exploration of competitor dashboards to validate table stakes features
- Impact: May discover missing table stakes features or anti-features to avoid

**SSE implementation gap:**
- Vercel Edge Runtime SSE patterns are MEDIUM confidence from training data
- Recommendation: Verify with official Vercel docs before implementing SSE in post-MVP phases
- Impact: May need to adjust real-time update strategy (polling vs SSE vs WebSockets)

**Discord API rate limits:**
- Channel permissions API rate limits not verified
- Recommendation: Test Discord API during Phase 5 planning to establish caching strategy
- Impact: May need Redis cache layer for Discord API responses

**Social platform API capabilities:**
- Unknown which social platforms the bot supports (Twitter, YouTube, Instagram, etc.)
- Recommendation: Validate with existing API implementation during Phase 3 planning
- Impact: May affect post content preview features, engagement metrics display

**Chart library for Server Components:**
- Unknown which chart libraries work well with Next.js Server Components
- Recommendation: Research during Phase 6 planning (recharts, chart.js, lightweight alternatives)
- Impact: May need client-side charts if no good Server Component options exist

## Sources

### Primary (HIGH confidence)
- Next.js Official Documentation (nextjs.org) — App Router routing, data fetching, authentication patterns, Route Groups, Server Components
- Tailwind CSS Official Documentation (tailwindcss.com) — v4.1 + Next.js integration guide
- React Official Documentation (react.dev) — Server Actions patterns and constraints
- Next.js Authentication Guide — Custom JWT pattern for API-owned auth, Data Access Layer with React cache

### Secondary (MEDIUM confidence)
- Training data: Discord bot SaaS ecosystem (MEE6, Dyno, Carl-bot patterns)
- Training data: Multi-tenant SaaS security best practices (OWASP, industry standards)
- Training data: React Query documentation (v4/v5 patterns)
- Training data: Vercel serverless function behavior (Edge Runtime, Node.js Runtime)

### Tertiary (needs validation)
- Discord Developer Portal (discord.com/developers/docs) — OAuth flows, rate limits (based on training data, not verified)
- Vercel Edge Runtime docs (vercel.com/docs/functions) — SSE patterns, connection limits (based on training data, not current)

### Research Limitations
- WebSearch/WebFetch tools were unavailable during research
- Could not verify current state of Discord bot dashboards (2026)
- Could not check recent Discord API changes or rate limit updates
- Vercel Edge Runtime SSE behavior may have changed since training cutoff

---
*Research completed: 2026-01-24*
*Ready for roadmap: yes*
