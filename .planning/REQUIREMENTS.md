# Requirements: Tracking Dashboard

**Defined:** 2026-02-22
**Core Value:** Server admins can access their tracking data and bot status through a reliable web interface — independent of bot uptime.

## v1.2 Requirements

Requirements for v1.2 Security Audit & Optimization. Each maps to roadmap phases.

### Error Handling & API Alignment

- [ ] **ERR-01**: Dashboard error sanitizer detects both old `{ error: string }` and new `{ error: { code, message } }` envelope shapes from backend, extracting error code and message correctly from either
- [ ] **ERR-02**: `fetchWithRetry` `unverified_email` code lookup works with both old (`body?.code`) and new (`body?.error?.code`) envelope shapes without breaking email-verification redirect
- [ ] **ERR-03**: CSRF cookie name aligned from `_csrf_token` to `csrf_token` in proxy.ts and fetch-with-retry.ts to match backend convention
- [ ] **ERR-04**: Zod v4 patterns audited — deprecated v3 methods (`z.string().email()`, `z.string().uuid()`, `error.errors`) replaced with v4 equivalents

### Authentication & Security

- [ ] **AUTH-01**: Proxy layer generates HMAC-signed CSRF tokens using `crypto.subtle` and `INTERNAL_API_SECRET` for server-to-server mutations, matching backend Phase 37 HMAC validation
- [ ] **AUTH-02**: SSR route handlers forward `auth_token` cookie as `Authorization: Bearer` header when calling `backendFetch`, enabling authenticated server-rendered pages
- [ ] **AUTH-03**: `fetchWithRetry` handles 503 responses with user-facing retry toast for mutations and silent backoff for reads, instead of treating 503 as unrecoverable
- [ ] **AUTH-04**: Global rate limit cooldown (`globalRateLimitUntil`) separated so background polling 429s do not block user-initiated mutations

### Real-Time & Connectivity

- [ ] **SSE-01**: `useSSE` implements heartbeat timeout (45 seconds) that closes and reconnects stalled connections that stop sending events
- [ ] **SSE-02**: `useSSE` uses generation counter (`connectGenerationRef`) to prevent dual EventSource instances when tab visibility changes rapidly within reconnect cooldown window
- [ ] **SSE-03**: `useSSE` resets `retryCountRef` on tab visibility restore so exhausted retries during hidden state do not permanently kill the connection
- [ ] **SSE-04**: `refetchInterval` only fires when `connectionState === 'error'` (retries exhausted), not during transient reconnects, preventing polling/SSE race conditions

### Data & Pagination

- [ ] **PAGE-01**: Accounts and posts hooks migrated from offset-based (`page`, `total_pages`) to cursor-based (`next_cursor`, `has_more`) pagination using `useInfiniteQuery` with `initialPageParam: null`
- [ ] **PAGE-02**: Pagination TypeScript types updated to support both offset and cursor shapes during backend transition window, with cursor as the primary path
- [ ] **PAGE-03**: Infinite scroll mutations use `queryClient.resetQueries` (not `invalidateQueries`) to prevent mixed-shape cache pages after data changes

### Performance

- [ ] **PERF-01**: `optimizePackageImports` configured in next.config for `lucide-react` and `recharts` to reduce module count and improve cold start time
- [ ] **PERF-02**: React Query `staleTime` normalized across all hooks — no `staleTime: 0` causing waterfall refetches on navigation
- [ ] **PERF-03**: Bundle analysis run with `next experimental-analyze` to identify top cold-start contributors, with dynamic imports applied to heavy client components

### Security Audit

- [ ] **AUDIT-01**: Comprehensive security and performance audit report generated covering OWASP Top 10, CWE classification, Node.js performance, Next.js compatibility, with risk scoring and fix plans per the audit specification

## v1.3+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### Future Optimization

- **PERF-F01**: Server Components for initial page renders (RSC data fetching replacing client-side useQuery)
- **PERF-F02**: Streaming SSR with Suspense boundaries for guild detail pages
- **PERF-F03**: Service worker for offline dashboard shell

### Future Security

- **AUTH-F01**: Content Security Policy reporting endpoint for violation monitoring
- **AUTH-F02**: Subresource Integrity (SRI) for third-party scripts

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend code changes | Backend v2.6 is a separate milestone in the backend repo |
| New dashboard features | v1.2 is hardening only — no new user-facing features |
| NextAuth.js migration | Custom JWT auth is the correct pattern for API-consumer dashboard |
| WebSocket migration | SSE is sufficient; WebSocket adds infrastructure complexity |
| Full Zod v4 rewrite | Only audit deprecated patterns; complete rewrite deferred |
| Remove offset pagination support | Transition window required; removal deferred to v1.3 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ERR-01 | Phase 17 | Pending |
| ERR-02 | Phase 17 | Pending |
| ERR-03 | Phase 17 | Pending |
| ERR-04 | Phase 17 | Pending |
| AUTH-01 | Phase 21 | Pending |
| AUTH-02 | Phase 19 | Pending |
| AUTH-03 | Phase 19 | Pending |
| AUTH-04 | Phase 19 | Pending |
| SSE-01 | Phase 18 | Pending |
| SSE-02 | Phase 18 | Pending |
| SSE-03 | Phase 18 | Pending |
| SSE-04 | Phase 18 | Pending |
| PAGE-01 | Phase 20 | Pending |
| PAGE-02 | Phase 20 | Pending |
| PAGE-03 | Phase 20 | Pending |
| PERF-01 | Phase 22 | Pending |
| PERF-02 | Phase 22 | Pending |
| PERF-03 | Phase 22 | Pending |
| AUDIT-01 | Phase 23 | Pending |

**Coverage:**
- v1.2 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after v1.2 roadmap created — all 19 requirements mapped*
