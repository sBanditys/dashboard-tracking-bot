# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Security Audit & Optimization

**Shipped:** 2026-03-06
**Phases:** 7 | **Plans:** 14

### What Was Built
- Dual-envelope error parsing for backend v2.6 migration compatibility
- SSE lifecycle hardening (heartbeat timeout, generation counter, tab-switch race prevention)
- Auth resilience layer (SSR cookie forwarding, 503 retry, split rate limit buckets)
- Cursor-based pagination migration with optimistic mutations
- HMAC-signed CSRF tokens via Web Crypto API
- Bundle optimization (optimizePackageImports, dynamic imports, staleTime normalization)
- Comprehensive OWASP/CWE security audit report

### What Worked
- Phase ordering (error envelope first) prevented cascading issues — all subsequent phases built on reliable error handling
- Gap closure pattern (19-03, 22-03) caught issues missed in initial plans without requiring phase restarts
- Milestone audit before completion caught 6 tech debt items that would have been lost
- Small, focused phases (1-3 plans each) kept execution tight and verifiable

### What Was Inefficient
- 10 requirements missing from SUMMARY.md frontmatter — documentation gap that required manual audit to catch
- Phase 22 `human_needed` for live browser verification items accumulated across all phases — no systematic browser testing cadence
- Some VALIDATION.md files missing or incomplete (5 of 7 phases)

### Patterns Established
- `parseApiError()` as single error extraction point for all mutation hooks
- Split rate limit buckets (polling vs mutation) for UX-preserving rate limit handling
- `resetQueries` over `invalidateQueries` for infinite scroll mutations
- Gap closure plans (X-03) as lightweight follow-up when verification reveals misses
- `TODO(v1.3)` convention for intentional deferred removals

### Key Lessons
1. Error handling alignment must ship before any other API-facing change — it's the foundation everything depends on
2. HMAC signing with Web Crypto API (`crypto.subtle`) is viable without npm dependencies for Next.js middleware
3. SSE generation counters prevent subtle race conditions that are nearly impossible to reproduce manually
4. Bundle analysis tooling requires specific build flags (`--webpack` in Next.js 16) — document these in phase context

### Cost Observations
- Sessions: ~6 (phases 17-21 in single session, 22-23 in separate sessions)
- Notable: Phases 17-21 completed in a single day (2026-02-22 to 2026-02-23), highly efficient

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 8 | 47 | Initial build, established patterns |
| v1.1 | 8 | 22 | Security hardening, added audit process |
| v1.2 | 7 | 14 | Hardening-only milestone, gap closure pattern, milestone audit |

### Top Lessons (Verified Across Milestones)

1. Ship error handling first — v1.1 error sanitization and v1.2 dual-envelope both prevented downstream issues
2. Small phases (1-3 plans) execute faster and verify more reliably than large phases
3. Milestone audits catch documentation gaps and minor tech debt that accumulates unnoticed
