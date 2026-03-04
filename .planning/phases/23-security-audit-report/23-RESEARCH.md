# Phase 23: Security Audit Report - Research

**Researched:** 2026-03-04
**Domain:** Security audit documentation — OWASP Top 10, CWE classification, Node.js/Next.js performance
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit Scope**
- Audit covers both codebases: deep audit of the Next.js dashboard AND the Express.js backend API
- All OWASP Top 10 categories get equal depth of analysis — no prioritization
- Combined security + performance report in one document with separate sections
- Verify that Phases 17-22 hardening is correctly implemented (spot-check code), AND look for uncovered security gaps

**Report Structure**
- Single Markdown file: `.planning/AUDIT-REPORT.md` (top-level planning directory)
- Executive summary at top with total findings count, risk distribution (Critical/High/Medium/Low), and overall posture assessment
- Organized by OWASP category: A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, etc., each with sub-findings
- OWASP Top 10 compliance/posture summary table (pass/partial/fail per category) for quick visual overview
- Separate performance section after security findings

**Risk Scoring**
- Simple severity levels: Critical / High / Medium / Low / Informational
- Every finding gets a CWE ID — security findings map directly, performance findings get closest applicable CWE
- Accepted risks documented with inline justification — each finding marked "Accepted Risk" includes rationale paragraph explaining why

**Finding Format**
- Standard fields per finding: Title, Severity, CWE, Description, Affected files, Impact, Fix plan/status, Evidence (code snippet)
- Include relevant code snippets as evidence showing vulnerable or hardened code
- Findings already fixed by Phases 17-22: mark as "Resolved in Phase X" with brief description of what was done
- Open findings get fix priority ordering (P1-P3) but no time estimates

### Claude's Discretion
- Exact OWASP subcategory mapping for edge-case findings
- Performance section organization (by metric type vs by codebase area)
- How deep to go on backend API routes not called by dashboard
- Whether to include a recommendations/roadmap section at the end
- Code snippet selection and formatting

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | Comprehensive security and performance audit report covering OWASP Top 10, CWE classification, Node.js performance, Next.js compatibility, with risk scoring and fix plans per the audit specification | Research defines the finding catalog, OWASP mapping, CWE assignments, and report structure that the planner will task the implementer to write |
</phase_requirements>

---

## Summary

Phase 23 is a documentation-only deliverable: a comprehensive `AUDIT-REPORT.md` file covering the post-hardening security and performance posture of both the Next.js dashboard (`~/Desktop/dashboard-tracking-bot`) and the Express.js backend API (`~/Desktop/Tracking Data Bot/api`). No code changes are produced. The report must satisfy AUDIT-01: OWASP Top 10 coverage, CWE classification, risk scoring, and fix plans.

The pre-hardening state was analyzed in `.planning/codebase/CONCERNS.md` (2025-02-16). Phases 17-22 addressed the most critical issues: error envelope normalization (Ph.17), SSE lifecycle hardening (Ph.18), auth hardening and rate-limit separation (Ph.19), cursor pagination migration (Ph.20), HMAC-signed CSRF tokens (Ph.21), and bundle/staleTime optimization (Ph.22). The audit must verify correct implementation of each phase and surface any remaining gaps.

Key open concerns that survived hardening (and will appear as findings): global module-level mutable state in `fetch-with-retry.ts` (server/multi-process risk), zero test coverage (regression risk on all critical paths), custom cookie domain parsing in the OAuth login route, `guildId` route parameter forwarded without Discord snowflake validation, and `style-src: 'unsafe-inline'` in CSP required by NProgress. These will be findings with appropriate severity and justification.

**Primary recommendation:** Write the audit report as a single structured Markdown document that first verifies every Phase 17-22 item against actual code, then walks all OWASP Top 10 categories against the codebase, catalogues findings with the locked format fields, then provides a performance section, and ends with a posture summary table. One plan, one task: produce the file.

---

## Standard Stack

### Core (Audit Report Context)

This phase produces no code. The "stack" is the set of frameworks and libraries whose security properties must be audited.

| Component | Version | Audit Surface |
|-----------|---------|---------------|
| Next.js (dashboard) | 14.2.35 | Middleware, API routes, App Router, SSR, CSP nonces |
| React | 18.x | Client-side XSS, event handlers, dangerouslySetInnerHTML |
| Express.js (backend) | 4.21.2 | Route handlers, middleware chain, CORS, helmet |
| Prisma ORM | 5.22.0 | SQL injection prevention, parameterized queries |
| TanStack React Query | 5.90.20 | Cache poisoning, staleTime, refetch behavior |
| Zod | 4.3.6 (frontend), 3.25.76 (backend) | Input validation coverage |
| helmet | 8.1.0 | Security headers on Express backend |
| express-rate-limit | 8.2.1 | Rate limiting coverage |
| rate-limit-redis | 4.3.1 | Distributed rate limit resilience |
| ioredis/Valkey | 5.x | Session cache attack surface |
| cookie-parser | 1.4.7 | Cookie handling security |
| Web Crypto API (Node.js built-in) | - | HMAC-signed CSRF token generation |
| httpOnly cookies | - | Token storage security |
| JWT (custom service) | - | Token validation, expiry, revocation |

### Audit Standards to Apply

| Standard | Version | URL |
|----------|---------|-----|
| OWASP Top 10 | 2021 | https://owasp.org/Top10/ |
| CWE List | 4.x (current) | https://cwe.mitre.org/ |
| OWASP ASVS | 4.0.3 | https://owasp.org/www-project-application-security-verification-standard/ |
| Node.js Security Best Practices | Current | https://nodejs.org/en/docs/guides/security |

---

## Architecture Patterns

### Codebase Layers (Audit Attack Surface)

```
Dashboard (Next.js 14 App Router)
├── src/proxy.ts             # Middleware: CSRF, CSP nonces, auth redirect, HMAC, HSTS
├── src/app/api/auth/        # Auth API routes: login, exchange, refresh, logout, session
├── src/app/api/guilds/      # Guild proxy routes (36+ routes) — forward to backend
├── src/lib/fetch-with-retry.ts  # Client HTTP layer: retry, rate limit, session refresh
├── src/lib/server/backend-fetch.ts  # SSR HTTP layer: adds X-Internal-Secret
├── src/lib/server/security-headers.ts  # CSP builder, security headers suite
├── src/hooks/               # React Query hooks (data fetching, mutations)
└── src/app/(dashboard)/     # Page components, UI

Backend (Express.js)
├── api/src/middleware/dashboardAuth.ts  # JWT validation, guild access, admin check
├── api/src/routes/dashboard/           # Dashboard API endpoints
├── api/src/services/dashboard/jwtService.ts  # Token verify, revocation check
└── shared/prisma/schema.prisma         # Database schema (Prisma ORM)
```

### Security Controls Implemented (Post-Phases 17-22)

| Control | Implementation | Phase |
|---------|---------------|-------|
| CSRF — double-submit cookie | `proxy.ts` cookie === header check | Pre-v1.2 |
| CSRF — HMAC signing | `generateHmacCsrfToken()` via `crypto.subtle` | Ph.21 |
| CSP with nonces | `buildCspHeader(nonce)` in `security-headers.ts` | Pre-v1.2 |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | Pre-v1.2 |
| HSTS | Set in proxy for production only | Pre-v1.2 |
| httpOnly auth cookies | `auth_token`, `refresh_token` as httpOnly | Pre-v1.2 |
| JWT validation + revocation | `verifyAccessToken()` with Valkey revocation check | Pre-v1.2 |
| Guild-scoped access control | `requireGuildAccess()` middleware | Pre-v1.2 |
| Admin permission check | `requireGuildAdmin()` — ADMINISTRATOR bit 0x8 | Pre-v1.2 |
| Error sanitization | `parseApiError()` strips backend details from client | Ph.17 |
| Proactive token refresh | Middleware refreshes before SSR page load | Ph.19 |
| Rate limit separation | polling vs mutation `RateLimitUntil` | Ph.19 |
| SSE stall detection | 45s heartbeat timeout + generation counter | Ph.18 |
| Bundle optimization | `optimizePackageImports`, dynamic imports | Ph.22 |

---

## OWASP Top 10 Finding Catalog

This section is the primary research output. For each OWASP category, it catalogs what the planner's task must investigate and document.

### A01: Broken Access Control

**Areas to audit:**
- `requireGuildAccess()` — verifies JWT guild list contains the requested guildId. Confirmed correct: does not expose guildId in error response (multi-tenant isolation).
- `requireGuildAdmin()` — checks ADMINISTRATOR bit 0x8 on permissions field. Confirmed correct.
- `guildId` route parameter: forwarded directly to backend without client-side Discord snowflake validation. Backend enforces, but defense-in-depth gap exists. **Finding candidate: Medium.**
- Dashboard API routes: do all 36+ proxy routes forward auth headers correctly? `backendFetch()` adds Authorization Bearer and X-Internal-Secret. Routes calling `backendFetch()` without auth forwarding would be a Critical finding.
- `returnTo` redirect parameter in middleware: `landingUrl.searchParams.set('returnTo', pathname)` — open redirect risk if `returnTo` is not validated on consumption. **Finding candidate: Medium.**
- CWE mapping: CWE-285 (Improper Authorization), CWE-601 (Open Redirect)

**Pre-hardening concerns from CONCERNS.md:**
- guildId forwarded without validation → still open after all phases → P2 finding

### A02: Cryptographic Failures

**Areas to audit:**
- JWT stored in httpOnly cookies — correct, not localStorage.
- CSRF HMAC uses `crypto.subtle` HMAC-SHA-256 — correct Web Crypto API usage.
- CSRF_HMAC_SECRET fallback to INTERNAL_API_SECRET — single env var covers both; acceptable but means rotation of one affects both. **Finding: Low/Informational.**
- Token format: `randomValue.hmac` (64 + 1 + 64 = 129 chars) — adequate entropy.
- `auth_token` JWT decoded with `atob()` in `tokenNeedsRefresh()` — no signature verification client-side, appropriate since verification happens server-side.
- `secure` flag on cookies: set only in production (`process.env.NODE_ENV === 'production'`). In development, cookies sent over HTTP — acceptable, but should be documented.
- CSRF cookie missing `secure` flag in development — same as above.
- No token encryption at rest (cookies are signed/validated but plaintext if intercepted without HTTPS) — HSTS mitigates.
- CWE mapping: CWE-327 (Use of Broken Algorithm — N/A, SHA-256 is current), CWE-311 (Missing Encryption), CWE-798 (Hard-coded Credentials — N/A)

**Accepted risk candidate:** Development-only insecure cookies — intentional, inline justification in report.

### A03: Injection

**Areas to audit:**
- Prisma ORM: all database access uses parameterized queries by default — SQL injection not possible through Prisma's query API. **Pass.**
- Error message display: Phase 17 added HTML stripping before toast display — XSS via error messages mitigated.
- `guildId` from URL params: passed as string to backend without sanitization. Backend Prisma query uses it as a parameter — safe. No shell or eval exposure.
- Excel export (`posts-excel-export.ts`): builds XLSX/ZIP in memory — formula injection possible if user-controlled post content is written to cells without escaping. **Finding candidate: Medium/High** (CSV/formula injection CWE-1236).
- Backend route handlers: Express does not evaluate user input in shell commands — no command injection surface identified.
- CWE mapping: CWE-89 (SQL Injection — mitigated by Prisma), CWE-79 (XSS), CWE-1236 (Improper Neutralization in CSV/XLSX)

### A04: Insecure Design

**Areas to audit:**
- Global mutable state in `fetch-with-retry.ts`: `refreshPromise`, `sessionRecoveryInProgress`, `pollingRateLimitUntil`, `mutationRateLimitUntil` — module-level singletons. In multi-process/serverless Next.js deployments, state does not persist between processes (each request gets fresh module), but in single-process server-side usage these persist across requests from different users. The code is client-focused (uses `sessionStorage`, `window`) so server-side execution is not the expected path — but the architectural risk exists. **Finding: Medium** with accepted-risk justification that the code is client-only.
- Single-process token refresh deduplication (`refreshPromise`) — documented in CONCERNS.md. Works for single-process but breaks in distributed deployments. **Finding: Low** (scaling concern, not current exploit).
- No error boundaries at component level before Phase 17 — Phase 17 added error handling infrastructure. Check if `error.tsx` files exist.
- No structured logging / request tracing — console.warn only. **Finding: Low/Informational.**
- CWE mapping: CWE-362 (Race Condition), CWE-778 (Insufficient Logging)

### A05: Security Misconfiguration

**Areas to audit:**
- CSP `style-src: 'unsafe-inline'` — required for NProgress and React inline styles. This weakens XSS protection for styles. **Finding: Medium** with accepted-risk justification (NProgress architectural requirement).
- CSP `script-src: 'unsafe-eval'` in development — dev-only for Next.js HMR. Correct — production CSP omits this.
- HSTS: only set in production. Correct — dev HTTPS is not standard.
- Permissions-Policy: `geolocation=(), camera=(), microphone=()` — present, covers the obvious APIs.
- X-Frame-Options: DENY set — correct.
- X-Content-Type-Options: nosniff set — correct.
- Referrer-Policy: `strict-origin-when-cross-origin` — current best practice.
- CSP `connect-src: 'self' wss:` — allows any WebSocket origin. If this dashboard ever uses WebSocket to a third-party, this would be overly permissive. Currently SSE-only so `wss:` is unused — **Finding: Informational.**
- Backend helmet configuration: not audited in dashboard codebase. Backend uses helmet 8.1.0 — audit must check backend helmet config separately.
- `NEXT_PUBLIC_API_URL` exposed to browser — by design, but the backend URL is publicly visible. Acceptable pattern.
- CWE mapping: CWE-16 (Configuration), CWE-693 (Protection Mechanism Failure)

### A06: Vulnerable and Outdated Components

**Areas to audit:**
- `@next/bundle-analyzer` v16.1.6 while Next.js is 14.2.35 — version mismatch from CONCERNS.md. **Finding: Low.**
- Zod: frontend uses v4.3.6, backend uses v3.25.76 — two major versions in the same project. Phase 17 replaced deprecated v3 patterns in frontend. **Finding: Informational** (backend is separate milestone).
- React Query 5.90.20 with React 18 — compatible, no known CVEs.
- No `npm audit` results in planning docs — the task must run `npm audit` in both repos and catalog any findings.
- CWE mapping: CWE-1035 (Using Components with Known Vulnerabilities)

**Task action:** Run `npm audit --json` in both repos and include output summary in the report.

### A07: Identification and Authentication Failures

**Areas to audit:**
- JWT access token: 60-minute expiry, refresh token rotation. Token revocation via Valkey. Confirmed in `dashboardAuth.ts`.
- Refresh token rotation: backend issues new pair on each refresh. **Pass.**
- Token revocation on logout: `logout` route must call backend to invalidate — verify implementation exists.
- `isTokenRejection()` distinguishes malformed/expired/revoked — correct, all rejected with 401.
- Email verification enforcement: `payload.email_verified === false` → 403. **Pass.**
- CSRF token per-request refresh: every response sets a new CSRF cookie. **Pass.**
- CSRF HMAC: session-bound via JTI. Falls back to plain UUID when CSRF_HMAC_SECRET absent. **Finding: Low** (dev-only degradation, documented).
- `dashboardAuthRateLimit()`: distributed via Valkey; falls back to in-memory if Valkey unavailable. In-memory does not work across processes. **Finding: Low** (same distributed scaling concern).
- OAuth context cookie (`oauth_ctx`): httpOnly, sameSite: lax, 10-minute max-age. **Pass.**
- Cookie domain calculation in login route: custom normalization logic. From CONCERNS.md: regex validation for IPs, localhost, multi-TLD. OAUTH_CONTEXT_COOKIE_DOMAIN env var overrides computation. **Finding: Low** (custom parsing vs well-tested library like `tldjs`).
- CWE mapping: CWE-287 (Improper Authentication), CWE-307 (Improper Restriction of Authentication Attempts), CWE-613 (Insufficient Session Expiration)

### A08: Software and Data Integrity Failures

**Areas to audit:**
- No Subresource Integrity (SRI) on third-party scripts — deferred to v1.3 (AUTH-F02). **Finding: Low** with deferred justification.
- No CSP reporting endpoint beyond `/api/csp-report` — endpoint exists, but violations not forwarded to a monitoring service. **Finding: Informational.**
- `optimistic updates` in mutations — rollback on error via React Query. Correct pattern.
- CSRF HMAC provides server-side signature verification of token integrity. **Pass.**
- No dependency pinning beyond lockfile — standard npm practice. Lockfile present.
- CWE mapping: CWE-494 (Download of Code Without Integrity Check), CWE-345 (Insufficient Verification of Data Authenticity)

### A09: Security Logging and Monitoring Failures

**Areas to audit:**
- Backend: `securityMonitor.trackFailedAttempt()` called on invalid JWT and unauthorized guild access. **Pass for backend.**
- Backend: `logger` (structured) used throughout dashboardAuth.ts. **Pass for backend.**
- Dashboard: Console-only logging (`console.warn` in fetchWithRetry). No structured log output, no request ID propagation to client logs. **Finding: Medium.**
- Audit log: `DashboardAuditLog` Prisma model — state changes logged in backend. **Pass for state mutations.**
- No error tracking integration (Sentry, Datadog) — **Finding: Low/Informational.** Out of scope for v1.2 but relevant to posture.
- Rate-limit events logged by `dashboardAuthRateLimit()`. **Pass.**
- CWE mapping: CWE-778 (Insufficient Logging), CWE-223 (Omission of Security-relevant Information)

### A10: Server-Side Request Forgery (SSRF)

**Areas to audit:**
- `backendFetch()` uses `BACKEND_API_URL` from environment — fixed value, not user-controlled. **Pass.**
- OAuth login route: `upstream.headers.get('location')` is forwarded as redirect URL without validation. If the backend is compromised and returns a malicious `location` header, the dashboard would redirect users there. **Finding: Low** (backend is trusted, internal network).
- `API_URL` in proxy.ts: fixed from `BACKEND_API_URL` constant — not user-controllable. **Pass.**
- No user-controlled URL fetch found in dashboard codebase. **Pass.**
- CWE mapping: CWE-918 (SSRF)

---

## Performance Finding Catalog

### P01: Bundle Size / Cold Start

**Phase 22 implementation:**
- `optimizePackageImports` added for `lucide-react` and `recharts` in `next.config.ts`
- Dynamic imports applied to non-default-tab heavy components
- `RoundsTab` kept as static import (default tab — must render immediately)
- Bundle analysis run with `--webpack` flag (Turbopack produces no report)

**Findings to document:**
- Pre-optimization top bundle contributors from analysis results
- Post-optimization improvement (if measurable)
- `@next/bundle-analyzer` v16.1.6 vs Next.js 14.2.35 version mismatch — still present
- CWE for performance findings: CWE-400 (Uncontrolled Resource Consumption) where applicable

### P02: React Query staleTime Normalization

**Phase 22 implementation:**
- 4-tier staleTime: static=5min, paginated=2min, real-time=1min, session=fresh
- Global default 5min in `providers.tsx`
- Polling hooks (use-guilds status, use-sessions) retain 30s staleTime — intentional

**Findings to document:**
- Before/after staleTime distribution across 13 hook files
- Any hooks still using `staleTime: 0` causing waterfall refetches

### P03: Memory Usage

**Areas to audit:**
- Infinite scroll: React Query cache grows unbounded with 100+ pages in memory — from CONCERNS.md. Still open.
- Excel export: entire ZIP built in memory — from CONCERNS.md. Still open.
- SSE connections: one EventSource per guild per component — from CONCERNS.md. Still open.
- `pollingRateLimitUntil` persisted to sessionStorage — minimal overhead.
- CWE: CWE-400 (Uncontrolled Resource Consumption)

### P04: Re-render Cycles

**Areas to audit:**
- 81 useCallback/useMemo/useEffect hooks — from CONCERNS.md. No analysis done in v1.2.
- `audit-log-table.tsx`, `accounts/page.tsx` cited as top candidates.
- **Finding: Low/Informational** — not addressed in v1.2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie domain parsing | Custom normalization logic | `tldjs` or `psl` npm package | CONCERNS.md identified edge cases with current regex approach |
| CSRF token validation | Custom string comparison | Double-submit cookie + HMAC (already implemented) | Timing attacks in naive comparison |
| JWT decoding for audit | Manual `atob()` split | No concern — server-side verification is correct pattern | Client-side decode is display-only, not security-critical |
| OWASP compliance scoring | Manual checklist | Structured OWASP Top 10 2021 framework | Established categories, community acceptance |

**Key insight:** This phase produces no code. The "don't hand-roll" principle applies to future recommendations: when the report recommends fixing the cookie domain issue, it should recommend `tldjs` rather than a custom fix.

---

## Common Pitfalls

### Pitfall 1: Conflating "No Frontend Exploit" With "Pass"

**What goes wrong:** A finding like global mutable state in `fetch-with-retry.ts` looks harmless because it uses `sessionStorage` (browser API). Reviewer marks A04 as "pass."
**Why it happens:** The code IS client-focused, but the risk is architectural: future SSR use of the same module would share state across requests.
**How to avoid:** Document the risk with scope qualifier — "low risk in current single-process client deployment, medium risk if deployed server-side."
**Warning signs:** Any finding that starts with "not currently exploitable" — still requires a finding with severity and justification.

### Pitfall 2: Marking Phase 17-22 Items as "Resolved" Without Code Verification

**What goes wrong:** Report states "CSRF HMAC signing resolved in Phase 21" but the actual implementation has a gap (e.g., the backend dual-check mode was never confirmed live).
**Why it happens:** Planning docs describe intent; execution may differ.
**How to avoid:** For every "Resolved in Phase X" finding, include the actual code snippet as evidence. Spot-check `proxy.ts`, `fetch-with-retry.ts`, `use-sse.ts`, `backend-fetch.ts` against what phases promised.
**Warning signs:** A "resolved" finding with no code evidence.

### Pitfall 3: Ignoring Backend Scope

**What goes wrong:** Audit focuses only on the Next.js dashboard (the codebase in the working directory) and skips the backend API.
**Why it happens:** Backend is in a separate directory and is a "separate milestone."
**How to avoid:** CONTEXT.md locked: "Audit covers both codebases." Backend routes in `~/Desktop/Tracking Data Bot/api/src/routes/dashboard/` and middleware in `dashboardAuth.ts` must be audited.
**Warning signs:** Report has no findings from the `api/` codebase.

### Pitfall 4: Assigning CWEs to Performance Findings Incorrectly

**What goes wrong:** Performance findings (memory bloat, re-render cycles) get no CWE because there's no obvious security CWE.
**Why it happens:** CWEs are primarily security classifications.
**How to avoid:** Use CWE-400 (Uncontrolled Resource Consumption) for memory growth issues. Use CWE-770 (Allocation Without Limits) for unbounded cache growth. CONTEXT.md locked this: "performance findings get closest applicable CWE."
**Warning signs:** Performance section findings with empty CWE field.

### Pitfall 5: Missing the `returnTo` Open Redirect

**What goes wrong:** The audit misses `?returnTo=pathname` in the middleware redirect as a potential open redirect.
**Why it happens:** Looks like internal routing at first glance.
**How to avoid:** Check where `returnTo` is consumed and whether the value is validated to be a relative path before redirect. If it's only consumed in the same origin, it's fine. If the raw value is used in a redirect, it's CWE-601.
**Warning signs:** A01 section has no mention of the returnTo parameter.

---

## Code Examples

Verified patterns from actual codebase (for the report's Evidence fields):

### CSRF HMAC Token Generation (Phase 21 — Resolved)

```typescript
// Source: src/proxy.ts — generateHmacCsrfToken()
async function generateHmacCsrfToken(jti: string | null): Promise<string> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomValue = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  if (!jti || !CSRF_HMAC_SECRET) {
    return randomValue; // graceful fallback: plain 64-char hex
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(CSRF_HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const payload = `${jti}:${randomValue}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hmac = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${randomValue}.${hmac}`;
}
```

### CSRF Double-Submit Validation (Middleware — Pre-v1.2)

```typescript
// Source: src/proxy.ts — proxy() function
if (isApiRoute && !isAuthRoute && !isCspReportRoute && isMutationMethod) {
  const cookieToken = request.cookies.get('csrf_token')?.value;
  const headerToken = request.headers.get('X-CSRF-Token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: 'Invalid CSRF token', code: 'EBADCSRFTOKEN' },
      { status: 403 }
    );
  }
}
```

### CSP Nonce-Based Script-src (Pre-v1.2)

```typescript
// Source: src/lib/server/security-headers.ts — buildCspHeader()
`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
"style-src 'self' 'unsafe-inline'",  // Required for NProgress — accepted risk
```

### Global Mutable State (Open Finding)

```typescript
// Source: src/lib/fetch-with-retry.ts — module-level state
let refreshPromise: Promise<boolean> | null = null;
let sessionRecoveryInProgress = false;
let pollingRateLimitUntil = 0;    // for GET/HEAD/OPTIONS
let mutationRateLimitUntil = 0;   // for POST/PUT/PATCH/DELETE
```

### Guild Access Enforcement (Backend — Pre-v1.2)

```typescript
// Source: api/src/middleware/dashboardAuth.ts — requireGuildAccess()
const guildAccess = user.guilds.find(g => g.id === guildId);
if (!guildAccess) {
  // IMPORTANT: Do not expose guildId in the response — multi-tenant isolation
  sendError(res, 403, { code: 'FORBIDDEN', message: 'You do not have access to this server.' });
  return;
}
```

---

## Report Structure Plan

The planner must produce a single task that writes `.planning/AUDIT-REPORT.md` with this structure:

```
# Security & Performance Audit Report
**Report Date:** [date]
**Codebase Version:** v1.2 (post-Phases 17-22)
**Scope:** Next.js Dashboard + Express.js Backend API

## Executive Summary
- Total findings: N
- Risk distribution: Critical: 0, High: X, Medium: Y, Low: Z, Informational: W
- Overall posture: [assessment paragraph]

## OWASP Top 10 Posture Summary
| Category | Status | Finding Count |
|----------|--------|---------------|
| A01 Broken Access Control | Partial | N |
| A02 Cryptographic Failures | Pass | N |
| ...

## Security Findings

### A01: Broken Access Control
#### Finding A01-01: [Title]
- **Severity:** [Critical/High/Medium/Low/Informational]
- **CWE:** CWE-XXX — [Name]
- **Description:** ...
- **Affected files:** ...
- **Impact:** ...
- **Status:** Resolved in Phase X / Open (P1) / Accepted Risk
- **Evidence:**
  ```typescript
  [code snippet]
  ```
- **Fix plan:** [if open] / **Rationale:** [if accepted risk]

[repeat per finding]

### A02: Cryptographic Failures
...

### A03: Injection
...

### A04: Insecure Design
...

### A05: Security Misconfiguration
...

### A06: Vulnerable and Outdated Components
...

### A07: Identification and Authentication Failures
...

### A08: Software and Data Integrity Failures
...

### A09: Security Logging and Monitoring Failures
...

### A10: Server-Side Request Forgery (SSRF)
...

## Performance Findings

### Performance Section Organization
[By codebase area: Dashboard Bundle, React Query, Memory / SSE / Export]

#### PF-01: [Title]
- **Severity:** [Medium/Low/Informational]
- **CWE:** CWE-400 / CWE-770
- **Description:** ...
- **Affected files:** ...
- **Impact:** ...
- **Status:** Resolved in Phase X / Open (P2) / Accepted Risk
- **Evidence:** [code or metric]
- **Fix plan:** ...

## Recommendations Roadmap (Claude's discretion — include if useful)
[Brief P1/P2/P3 priority list of open findings]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Random UUID CSRF tokens | HMAC-SHA-256 signed, JTI-bound CSRF tokens | Phase 21 | Cryptographically verifiable; backend can validate without DB lookup |
| `globalRateLimitUntil` (single) | `pollingRateLimitUntil` + `mutationRateLimitUntil` (split) | Phase 19 | Polling 429s no longer block user mutations |
| Offset-based pagination | Cursor-based pagination (`useInfiniteQuery`) | Phase 20 | Eliminates page drift on list mutations |
| Static SSE connections | Heartbeat timeout (45s) + generation counter | Phase 18 | Self-healing connections; no dual-EventSource race |
| Dual error envelope support | `parseApiError()` normalizes both shapes | Phase 17 | Consistent error display regardless of backend version |
| `_csrf_token` cookie name | `csrf_token` cookie name | Phase 17 | Aligned with backend convention |
| Zod v3 deprecated patterns | Zod v4 `.check()`, `z.email()`, etc. | Phase 17 | Eliminates deprecation warnings; v4-compatible |

**Deprecated patterns confirmed replaced:**
- `z.string().email()` → `z.email()` (Zod v4)
- `error.errors` → `error.issues` (Zod v4)
- `_csrf_token` cookie → `csrf_token`

---

## Open Questions

1. **Is backend Phase 37 dual-check mode confirmed live?**
   - What we know: Dashboard HMAC token generation is complete (Phase 21 done). STATE.md blocker: "backend Phase 37 dual-check mode must be confirmed live before production deployment."
   - What's unclear: Whether the backend currently accepts HMAC tokens, UUID tokens, or both.
   - Recommendation: The audit report should note this deployment dependency as a finding or informational note. The dashboard code is correct; the risk is a deployment coordination gap.

2. **Are backend Phases 35-39 live?**
   - What we know: STATE.md has "Open question: Which of backend Phases 35-39 are already live?"
   - What's unclear: If Phase 39 (cursor API) is not live, cursor pagination (Phase 20) would fall back or error.
   - Recommendation: Document as a deployment-state dependency in the audit report's executive summary.

3. **Does the logout route revoke tokens server-side?**
   - What we know: `logout` API route exists at `src/app/api/auth/logout/`. Backend's JWT service has revocation via Valkey.
   - What's unclear: Whether the dashboard logout route actually calls the backend to revoke the refresh token.
   - Recommendation: The audit task must read `src/app/api/auth/logout/route.ts` and verify. If token revocation is missing on logout, this is an A07 High finding.

4. **Does `returnTo` redirect parameter validate the destination?**
   - What we know: `proxy.ts` sets `returnTo=pathname`. The pathname is from `request.nextUrl.pathname`, so it's already relative.
   - What's unclear: Whether the consuming page (login page) validates `returnTo` as a same-origin relative path before redirecting post-login.
   - Recommendation: The audit task must read the login page component and verify. If not validated, it's CWE-601 Medium.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.16 (backend) — frontend has no test framework configured |
| Config file | Backend: `package.json` scripts (`test: vitest`) — dashboard: none detected |
| Quick run command | `cd "/Users/gabrielleal/Desktop/Tracking Data Bot/api" && npm test` |
| Full suite command | Same — no dashboard test suite exists |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | `.planning/AUDIT-REPORT.md` exists at known path with required sections | manual | `test -f /Users/gabrielleal/Desktop/dashboard-tracking-bot/.planning/AUDIT-REPORT.md && echo "EXISTS"` | ❌ Wave 0 (this phase produces it) |
| AUDIT-01 | Report contains OWASP A01-A10 sections | manual | `grep -c "^### A0" /Users/gabrielleal/Desktop/dashboard-tracking-bot/.planning/AUDIT-REPORT.md` | ❌ Wave 0 |
| AUDIT-01 | Every finding has CWE field | manual | Review by human — no automated check | manual-only |
| AUDIT-01 | Report reflects post-hardening state | manual | Review by human — requires domain knowledge | manual-only |

**Note:** AUDIT-01 is a documentation deliverable. Automated testing is limited to file existence and section presence. Substantive validation (finding accuracy, CWE correctness, posture assessment) requires human review.

### Wave 0 Gaps

- [ ] `.planning/AUDIT-REPORT.md` — the deliverable itself (produced by this phase's sole task)

*(No test framework gaps — the deliverable is a Markdown document, not code.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/proxy.ts` — CSRF, CSP, HMAC, security headers
- Direct code inspection: `src/lib/server/security-headers.ts` — CSP builder
- Direct code inspection: `api/src/middleware/dashboardAuth.ts` — JWT validation, guild access, admin check
- Direct code inspection: `src/lib/fetch-with-retry.ts` (lines 1-100) — rate limiting, global state
- Direct code inspection: `src/app/api/auth/login/route.ts` — OAuth flow, cookie domain parsing
- `.planning/codebase/CONCERNS.md` — pre-hardening vulnerability catalog (2025-02-16)
- `.planning/codebase/ARCHITECTURE.md` — system architecture
- `.planning/codebase/STACK.md` — dependency versions
- Phase CONTEXT.md files 17-22 — locked decisions for each hardening phase
- `.planning/STATE.md` — accumulated decisions and deployment blockers

### Secondary (MEDIUM confidence)
- OWASP Top 10 2021 — https://owasp.org/Top10/ (standard industry reference)
- CWE classifications — https://cwe.mitre.org/ (authoritative)
- Node.js Security Best Practices — https://nodejs.org/en/docs/guides/security

### Tertiary (LOW confidence)
- None — all findings derived from direct code inspection or authoritative standards

---

## Metadata

**Confidence breakdown:**
- Finding catalog (OWASP sections): HIGH — derived from direct code inspection
- Phase 17-22 verification status: HIGH — code confirmed in proxy.ts, dashboardAuth.ts
- Open questions (returnTo, logout revocation): MEDIUM — files not yet read; task must verify
- CWE assignments: HIGH — standard CWE mappings for well-understood vulnerability classes
- Performance findings: HIGH — confirmed from CONCERNS.md and Phase 22 decisions

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — codebase is stable post-v1.2 hardening)
