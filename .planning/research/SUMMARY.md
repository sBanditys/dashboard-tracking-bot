# Research Summary: v1.2 Security Audit & Optimization

**Synthesized:** 2026-02-22
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Confidence:** HIGH

---

## Executive Summary

v1.2 is a hardening and alignment milestone — not a feature addition. Every item is an infrastructure or protocol change to an existing working system (25,476 LOC, 334 files). The backend is simultaneously shipping v2.6 changes (Phases 34-40) that directly affect the dashboard's error parsing, CSRF flow, pagination, and SSR authentication.

**No new npm packages are required.** All capabilities exist in the runtime (`crypto.subtle`), installed packages (`useInfiniteQuery`, `cookies()`), or Next.js config options (`optimizePackageImports`).

**The critical constraint is deploy coordination.** Three backend changes (error envelope, CSRF HMAC, cursor pagination) break the dashboard if deployed without matching frontend changes. The research identified exact failure modes and a safe ordering.

---

## Key Findings

### Stack Additions
- **Zero new packages needed** — `crypto.subtle` for HMAC, existing `useInfiniteQuery` for cursor pagination, `cookies()` from `next/headers` for SSR forwarding
- **Zod v4 already installed (4.3.6)** — needs audit for v3 patterns (`z.string().email()` → `z.email()`)
- **`optimizePackageImports`** config reduces `lucide-react` from 1583→333 modules, `recharts` from 1485→1317 modules (one-line config change)
- **`next experimental-analyze`** provides Turbopack-integrated bundle analysis for cold start identification

### Feature Table Stakes
- **Error envelope migration** — Backend Phase 35 changes `{ error: string }` to `{ error: { code, message } }`. Dashboard's `sanitizeError()` receives `[object Object]` as message — must detect both shapes during transition.
- **Cursor pagination** — Already proven in bonus rounds (`use-bonus.ts`). Accounts/posts need `getNextPageParam` reading `next_cursor` instead of computing from `total_pages`.
- **SSR cookie forwarding** — Route handlers call `backendFetch` without forwarding `auth_token`. Fix: read `cookies()` and pass token as `Authorization: Bearer`.
- **SSE heartbeat detection** — No timeout for stalled connections. 45-second threshold with 30-second backend heartbeat is production standard.
- **Rate limit resilience** — 503 not consistently retried; `globalRateLimitUntil` blocks mutations when read queries are rate-limited.

### Architecture Integration Points
- **Modified components:** `fetchWithRetry` (dual envelope parsing, 503 handling), `proxy.ts` (CSRF cookie name, HMAC generation), `useSSE` (heartbeat timeout, generation counter), `error-sanitizer.ts` (dual envelope extractor), tracking hooks (cursor params)
- **New components:** None — all changes are modifications to existing files
- **CSRF cookie name misalignment:** Dashboard uses `_csrf_token`, backend uses `csrf_token` — one-line fix needed

### Critical Pitfalls
1. **CSRF breaks during HMAC alignment** — Backend HMAC-only before dashboard ships matching generator = all mutations fail 403. Must deploy with dual-check grace period.
2. **Cursor pagination shape change** — `Pagination` type (`page`, `total_pages`) resolves to `undefined` against cursor response. Infinite scroll never triggers `fetchNextPage`. Must ship type + hooks + cache eviction atomically.
3. **Error envelope corrupts sanitizer** — `[object Object]` passes `isMessageSafe()` and forwards to client. `unverified_email` code lookup breaks, killing email-verification redirect.
4. **SSE dual-instance race** — Tab-hidden + reconnect timeout + tab-visible within 5s = two EventSources, every event fires twice. Fix: generation counter (`connectGenerationRef`).
5. **Global rate limit blocks mutations** — Background polling 429 blocks user from saving settings for up to 15 minutes. Need `skipGlobalCooldown` for read queries.

---

## Build Order (Dependency Chain)

| Order | Change | Backend Dependency | Risk |
|-------|--------|-------------------|------|
| 1 | Error envelope dual-parsing | Phase 35 (already deployed) | HIGH — blocks all error handling |
| 2 | CSRF cookie name alignment | None | LOW — one-line fix |
| 3 | SSE lifecycle hardening | None | LOW — independent, additive |
| 4 | Rate limit resilience (503, global cooldown) | Phase 38 | MEDIUM — independent |
| 5 | React Query cache optimization | None | LOW — no deps |
| 6 | SSR cookie forwarding | QUAL-05 | MEDIUM — touches backendFetch |
| 7 | Cursor pagination migration | Phase 39 | MEDIUM — gated on backend |
| 8 | CSRF HMAC signing | Phase 37 dual-check | HIGH — coordinated deploy |
| 9 | Bundle optimization | None | LOW — config changes |
| 10 | Security audit report | All above complete | LOW — documentation |

---

## Open Questions

- Does backend Phase 37 HMAC use `INTERNAL_API_SECRET` or a separate CSRF secret?
- Does backend cursor pagination still return `total` count alongside `nextCursor`?
- Does the bot status SSE endpoint send heartbeat frames?
- Backend Phases 35-39 deployment status — which are already live?

---

## Implications for Roadmap

- **Phase ordering is constrained** by deploy coordination with backend v2.6
- **Error envelope must ship first** — all other changes depend on readable errors
- **CSRF HMAC is the highest-risk item** — requires backend dual-check deploy window
- **Cursor pagination and SSR forwarding are gated** on backend phases shipping first
- **Performance/SSE/React Query changes are independent** — can parallelize
- **Security audit report ships last** — documents the hardened codebase

---
*Synthesized: 2026-02-22 from 4 research files*
*Ready for requirements: yes*
