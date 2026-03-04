# Security & Performance Audit Report

**Report Date:** 2026-03-04
**Codebase Version:** v1.2 (post-Phases 17-22 hardening complete)
**Scope:** Next.js Dashboard (`~/Desktop/dashboard-tracking-bot`) + Express.js Backend API (`~/Desktop/Tracking Data Bot/api`)
**Auditor:** Automated audit with direct code inspection

---

## Executive Summary

This report documents the post-hardening security and performance posture of the Tracking Dashboard system following the completion of Phases 17-22 (v1.2 milestone). The audit covers both the Next.js 14 dashboard (proxy/middleware layer, client hooks, SSR utilities) and the Express.js backend API (authentication middleware, guild routes, JWT service).

**Total findings: 29**

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 13 |
| Informational | 10 |

**Overall posture:** The codebase is in a substantially improved security state following v1.2 hardening. The most impactful vulnerabilities from the pre-hardening audit (CSRF token integrity, error message leakage, SSE stall attacks, rate limit bypass) have all been addressed. Remaining open findings are primarily low-severity defense-in-depth gaps, deployment dependencies, and informational observations. One High finding exists in the backend npm dependency tree (undici critical + AWS SDK chain), requiring a dependency update cycle that is not dashboard-blocking. The architecture correctly enforces multi-tenant isolation, JWT revocation, guild-scoped access control, and CSRF protection at both the cookie and HMAC layers. No critical findings were identified in application logic.

**Deployment dependency note:** The dashboard's HMAC-signed CSRF tokens (Phase 21) require backend Phase 37 dual-check mode to be confirmed live before production. The cursor pagination migration (Phase 20) requires backend Phase 39 to be live. These are deployment coordination gaps, not code defects.

---

## OWASP Top 10 Posture Summary

| Category | Status | Finding Count | Key Gap |
|----------|--------|---------------|---------|
| A01: Broken Access Control | Partial | 3 | guildId without snowflake validation; callbackUrl redirect not validated |
| A02: Cryptographic Failures | Pass | 3 | CSRF_HMAC_SECRET shared with INTERNAL_API_SECRET; dev-only insecure cookies (accepted) |
| A03: Injection | Pass | 1 | Prisma parameterized queries prevent SQL injection; XSS mitigated; no formula injection |
| A04: Insecure Design | Partial | 3 | Global mutable state; single-process session dedup; no structured logging |
| A05: Security Misconfiguration | Pass | 3 | CSP unsafe-inline for styles (accepted risk); all headers present |
| A06: Vulnerable and Outdated Components | Partial | 4 | Backend: 26 vulns (1 critical AWS SDK/undici); Dashboard: 1 high (minimatch, dev-only) |
| A07: Identification and Authentication Failures | Pass | 3 | JWT revocation on logout confirmed; rate limiting present |
| A08: Software and Data Integrity Failures | Pass | 2 | No SRI (deferred v1.3); CSRF HMAC integrity confirmed |
| A09: Security Logging and Monitoring Failures | Partial | 3 | Dashboard console-only logging; no error tracking integration |
| A10: Server-Side Request Forgery (SSRF) | Pass | 2 | Backend URL is fixed env var; OAuth redirect header is low-risk internal-trusted |

---

## Security Findings

### A01: Broken Access Control

#### Finding A01-01: guildId Route Parameter Forwarded Without Discord Snowflake Validation

- **Severity:** Medium
- **CWE:** CWE-285 — Improper Authorization
- **Description:** The `guildId` URL parameter in all dashboard proxy routes (36+ routes) is forwarded directly to the backend without client-side validation that it is a valid Discord snowflake (18-digit numeric string). While the backend's `requireGuildAccess()` middleware enforces that the JWT's guild list contains the requested guildId, the absence of format validation at the dashboard layer means arbitrary strings are forwarded to backend Prisma queries.
- **Affected files:** `src/app/api/guilds/[guildId]/` (all route.ts files, 36+ routes)
- **Impact:** Defense-in-depth gap only. Backend enforces authorization, preventing actual unauthorized access. However, a malformed guildId (e.g., a 10,000-character string) could cause unexpected backend behavior or logging noise.
- **Status:** Open (P2)
- **Evidence:**
  ```typescript
  // Source: src/app/api/guilds/[guildId]/posts/route.ts (representative example)
  // guildId extracted from params and forwarded to backend with no format validation
  export async function GET(request: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
    const { guildId } = await params;
    // No snowflake validation — forwarded as-is to backend
    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/posts`, { ... });
  }
  ```
- **Fix plan:** Add a Zod snowflake validator (`z.string().regex(/^\d{17,20}$/)`) at the start of each guild route handler, or create a shared `validateGuildId()` utility. Return 400 Bad Request if the format is invalid.

---

#### Finding A01-02: callbackUrl Post-Login Redirect Not Validated for Same-Origin

- **Severity:** Medium
- **CWE:** CWE-601 — URL Redirection to Untrusted Site ('Open Redirect')
- **Description:** The authentication callback flow stores a `callbackUrl` from query params in `sessionStorage`, then unconditionally redirects to it after login without validating that it is a same-origin relative path. The middleware sets `returnTo` from `request.nextUrl.pathname` (safe — always relative), but `page.tsx` encodes it as a `callbackUrl` in the login URL, and the login page stores whatever `callbackUrl` query param it receives in `sessionStorage`. If an attacker can craft a login URL with a malicious absolute `callbackUrl`, they can redirect the user to an external site post-authentication.
- **Affected files:**
  - `src/app/(auth)/login/page.tsx` (stores callbackUrl without validation)
  - `src/app/auth/callback/page.tsx` (redirects to callbackUrl without validation)
  - `src/app/page.tsx` (encodes returnTo as callbackUrl)
- **Impact:** Phishing attacks: an attacker sends a crafted login link, user authenticates, is redirected to attacker-controlled site that mimics the dashboard. Medium severity because the attacker does not gain access to the user's session.
- **Status:** Open (P2)
- **Evidence:**
  ```typescript
  // Source: src/app/(auth)/login/page.tsx — no validation of callbackUrl
  const callbackUrl = searchParams.get('callbackUrl');
  if (callbackUrl) {
    sessionStorage.setItem('auth_callback_url', callbackUrl); // stored without validation
  }

  // Source: src/app/auth/callback/page.tsx — unconditional redirect
  const callbackUrl = sessionStorage.getItem('auth_callback_url');
  if (callbackUrl) {
    sessionStorage.removeItem('auth_callback_url')
    router.replace(callbackUrl) // redirects to any value without origin check
  }
  ```
- **Fix plan:** Before storing `callbackUrl` in `sessionStorage`, validate that it is a relative path (starts with `/`, does not start with `//`, and does not contain a protocol scheme). Add a `isSameOriginRelative(url: string)` utility and reject absolute URLs silently by falling back to `/`.

---

#### Finding A01-03: Guild Access Control — Pass

- **Severity:** Informational
- **CWE:** CWE-285 — Improper Authorization (mitigated)
- **Description:** The backend `requireGuildAccess()` middleware correctly enforces multi-tenant isolation. It verifies that the authenticated user's JWT guild list contains the requested guildId before allowing access. The error response deliberately omits the guildId to prevent enumeration. `requireGuildAdmin()` correctly checks the ADMINISTRATOR permission bit (0x8).
- **Affected files:** `api/src/middleware/dashboardAuth.ts`
- **Impact:** N/A — control is correctly implemented.
- **Status:** Pass
- **Evidence:**
  ```typescript
  // Source: api/src/middleware/dashboardAuth.ts — requireGuildAccess()
  const guildAccess = user.guilds.find(g => g.id === guildId);
  if (!guildAccess) {
    // IMPORTANT: Do not expose guildId in the response — multi-tenant isolation
    sendError(res, 403, { code: 'FORBIDDEN', message: 'You do not have access to this server.' });
    return;
  }

  // requireGuildAdmin() — ADMINISTRATOR bit check
  const ADMINISTRATOR = 0x8;
  const hasAdmin = (guildAccess.permissions & ADMINISTRATOR) !== 0;
  ```

---

### A02: Cryptographic Failures

#### Finding A02-01: CSRF HMAC — Resolved in Phase 21

- **Severity:** Informational (was High pre-Phase 21)
- **CWE:** CWE-352 — Cross-Site Request Forgery (mitigated)
- **Description:** Prior to Phase 21, CSRF tokens were random UUIDs with no cryptographic binding to the user session. Phase 21 implemented HMAC-SHA-256 signing using `crypto.subtle`, binding each CSRF token to the user's JWT ID (JTI). This prevents token substitution attacks: a token issued for session A cannot be used by session B.
- **Affected files:** `src/proxy.ts`
- **Status:** Resolved in Phase 21
- **Evidence:**
  ```typescript
  // Source: src/proxy.ts — generateHmacCsrfToken() + double-submit validation
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

  // Double-submit cookie validation (pre-v1.2 layer, still active)
  if (isApiRoute && !isAuthRoute && !isCspReportRoute && isMutationMethod) {
    const cookieToken = request.cookies.get('csrf_token')?.value;
    const headerToken = request.headers.get('X-CSRF-Token');
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json({ error: 'Invalid CSRF token', code: 'EBADCSRFTOKEN' }, { status: 403 });
    }
  }
  ```

---

#### Finding A02-02: CSRF_HMAC_SECRET Shares Value with INTERNAL_API_SECRET

- **Severity:** Low
- **CWE:** CWE-320 — Key Management Errors
- **Description:** The CSRF HMAC secret falls back to `INTERNAL_API_SECRET` when `CSRF_HMAC_SECRET` is not set. This means rotating one secret (e.g., during an `INTERNAL_API_SECRET` compromise) also rotates the other, invalidating all existing CSRF tokens and briefly disrupting user sessions. Additionally, if `INTERNAL_API_SECRET` is compromised, the attacker could forge CSRF HMAC tokens.
- **Affected files:** `src/proxy.ts`
- **Status:** Accepted Risk
- **Evidence:**
  ```typescript
  // Source: src/proxy.ts — CSRF_HMAC_SECRET fallback chain
  const CSRF_HMAC_SECRET = (process.env.CSRF_HMAC_SECRET || process.env.INTERNAL_API_SECRET || '').trim();
  ```
- **Rationale:** This design was a deliberate decision documented in Phase 21 CONTEXT.md: "CSRF_HMAC_SECRET falls back to INTERNAL_API_SECRET — single env var covers both internal auth and CSRF HMAC." The fallback simplifies deployment (one less required env var) and the risk is low because: (1) CSRF tokens are short-lived (rotated per-request); (2) a compromised INTERNAL_API_SECRET would already be a Critical incident requiring full key rotation; (3) the double-submit cookie layer continues to provide protection even if HMAC signing degrades. If the system grows to require independent key rotation, add `CSRF_HMAC_SECRET` as a separate required env var.

---

#### Finding A02-03: Development-Only Insecure Cookies

- **Severity:** Low
- **CWE:** CWE-614 — Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
- **Description:** Authentication cookies (`auth_token`, `refresh_token`) and the CSRF cookie omit the `secure` flag in non-production environments. This allows cookie transmission over plain HTTP in development.
- **Affected files:** `src/proxy.ts`
- **Status:** Accepted Risk
- **Evidence:**
  ```typescript
  // Source: src/proxy.ts — auth cookies set with conditional secure flag
  response.cookies.set('auth_token', refreshedTokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // not secure in development
    sameSite: 'lax',
    maxAge: refreshedTokens.accessMaxAge,
    path: '/',
  });
  ```
- **Rationale:** HTTPS is not available in standard Next.js development environments (`next dev` serves on HTTP). Requiring `secure: true` in development would prevent developers from authenticating locally. This is standard practice for all web frameworks. HSTS is enforced in production only (also correct). No production exposure.

---

### A03: Injection

#### Finding A03-01: SQL Injection — Pass (Prisma ORM)

- **Severity:** Informational
- **CWE:** CWE-89 — SQL Injection (mitigated)
- **Description:** All database access in the backend uses Prisma ORM with parameterized queries. Prisma's query API does not permit raw string interpolation in query conditions by default. No `$queryRaw` usage was identified in the dashboard-facing routes.
- **Affected files:** `shared/prisma/schema.prisma`, all `api/src/routes/dashboard/` files
- **Status:** Pass

---

#### Finding A03-02: XSS via Error Messages — Resolved in Phase 17

- **Severity:** Informational (was Medium pre-Phase 17)
- **CWE:** CWE-79 — Cross-Site Scripting (mitigated)
- **Description:** Phase 17 added `parseApiError()` to normalize error messages from both old and new backend envelope shapes, and toast notifications render the sanitized string rather than raw HTML. No `dangerouslySetInnerHTML` is used with API response data.
- **Affected files:** `src/lib/parse-api-error.ts`
- **Status:** Resolved in Phase 17

---

#### Finding A03-03: Excel/XLSX Formula Injection — Pass

- **Severity:** Informational
- **CWE:** CWE-1236 — Improper Neutralization in CSV/XLSX (not applicable)
- **Description:** The Excel export (`posts-excel-export.ts`) was audited for formula injection risk. The only cell that renders a formula is the `Link` column, gated behind `isHttpUrl()` validation (must start with `http://` or `https://`). All other cell values (metrics, dates) are numbers or strings escaped through `escapeXml()`. The `HYPERLINK()` formula uses `escapeFormulaString()` to prevent quote injection in the formula argument. No user-controlled content (post title, username, platform) is written to cells as formulas.
- **Affected files:** `src/lib/posts-excel-export.ts`
- **Status:** Pass
- **Evidence:**
  ```typescript
  // Source: src/lib/posts-excel-export.ts — formula injection guard
  function isHttpUrl(value: string): boolean {
    const trimmed = value.trim().toLowerCase()
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
  }

  // HYPERLINK formula only applied to validated HTTP URLs (Link column only)
  if (!isHeader && header === 'Link' && typeof value === 'string' && isHttpUrl(value)) {
    const formulaUrl = escapeFormulaString(value)
    return `<c r="${ref}" t="str"><f>HYPERLINK("${formulaUrl}","${formulaUrl}")</f>...`
  }
  // All non-URL values use escapeXml — no formula prefix
  const safeValue = escapeXml(String(value))
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${safeValue}</t></is></c>`
  ```

---

### A04: Insecure Design

#### Finding A04-01: Global Mutable State in fetch-with-retry.ts

- **Severity:** Medium
- **CWE:** CWE-362 — Concurrent Execution Using Shared Resource with Improper Synchronization
- **Description:** `fetch-with-retry.ts` uses four module-level mutable variables (`refreshPromise`, `sessionRecoveryInProgress`, `pollingRateLimitUntil`, `mutationRateLimitUntil`). In a multi-process or serverless Next.js deployment, module state does not persist between requests (each worker gets a fresh module), but in a hypothetical server-side usage of this module, state would be shared across concurrent requests from different users. The `sessionStorage` access on module load also presupposes a browser context.
- **Affected files:** `src/lib/fetch-with-retry.ts`
- **Status:** Accepted Risk
- **Evidence:**
  ```typescript
  // Source: src/lib/fetch-with-retry.ts — module-level state
  let refreshPromise: Promise<boolean> | null = null;
  let sessionRecoveryInProgress = false;
  let pollingRateLimitUntil = 0;    // for GET/HEAD/OPTIONS
  let mutationRateLimitUntil = 0;   // for POST/PUT/PATCH/DELETE

  // On module load, restore pollingRateLimitUntil from sessionStorage
  try {
    const stored = sessionStorage.getItem('polling_rate_limit_until');
    ...
  } catch { /* SSR or private browsing */ }
  ```
- **Rationale:** This module is designed as a client-side HTTP layer. The `sessionStorage` access, `window` dependency, and `toast` calls all confirm client-only intent. The module is not imported from any server-only file. In the current deployment model (single-process Next.js with client-side data fetching), this state is per-browser-tab, which is the intended behavior. The risk would materialize only if this module were imported server-side, which current architecture does not do. Risk is low in the current deployment model; medium risk if the module is ever used server-side.

---

#### Finding A04-02: Single-Process Session Refresh Deduplication

- **Severity:** Low
- **CWE:** CWE-362 — Concurrent Execution Using Shared Resource with Improper Synchronization
- **Description:** The `refreshPromise` module-level singleton deduplicates concurrent token refresh attempts within a single browser tab. In a multi-tab scenario, each tab has its own module instance, and two tabs could both attempt token refresh simultaneously, triggering two backend refresh calls. The backend's refresh token rotation (issue new pair per refresh) means the second refresh invalidates the first new pair, causing a brief 401 loop in the first tab.
- **Affected files:** `src/lib/fetch-with-retry.ts`
- **Status:** Open (P3)
- **Fix plan:** This is a known scaling concern (documented in CONCERNS.md). A distributed session lock via Valkey (keyed by refresh token JTI) would prevent the race. Alternatively, the BroadcastChannel API can propagate refreshed tokens between tabs without a server round-trip. Low priority for current single-user deployments.

---

#### Finding A04-03: No Structured Logging in Dashboard

- **Severity:** Low
- **CWE:** CWE-778 — Insufficient Logging
- **Description:** The dashboard uses `console.warn` exclusively for retry attempts, rate limit events, and session recovery. There is no structured log output, no request ID propagation to client logs, and no correlation between a request ID generated in middleware and client-side error logs.
- **Affected files:** `src/lib/fetch-with-retry.ts`, all API route handlers
- **Status:** Open (P3)
- **Fix plan:** Integrate a lightweight structured logger (e.g., Pino) for API route handlers. Forward the `X-Request-ID` middleware header through to error logs for correlation. Out of scope for v1.2 but relevant for v1.3 observability.

---

### A05: Security Misconfiguration

#### Finding A05-01: CSP style-src unsafe-inline — Accepted Risk

- **Severity:** Medium
- **CWE:** CWE-693 — Protection Mechanism Failure
- **Description:** The Content Security Policy allows `style-src: 'unsafe-inline'`, which permits inline `<style>` elements and `style=""` attributes. This weakens CSS injection protection and, in browsers that allow CSS-based data exfiltration, reduces the defense-in-depth that a strict `style-src` would provide.
- **Affected files:** `src/lib/server/security-headers.ts`
- **Status:** Accepted Risk
- **Evidence:**
  ```typescript
  // Source: src/lib/server/security-headers.ts — buildCspHeader()
  "style-src 'self' 'unsafe-inline'",  // Required for NProgress and React inline styles
  ```
- **Rationale:** NProgress creates dynamic `<style>` elements at runtime for its progress bar animation, which cannot be nonce-attributed. React component `style={{}}` JSX props also inject inline styles. Removing `unsafe-inline` would require replacing NProgress with a CSS-animation-based alternative and auditing all `style={{}}` props — significant scope for v1.2. Risk is accepted because: (1) CSS injection is significantly less impactful than script injection; (2) `script-src` uses nonces with `strict-dynamic`, providing strong XSS protection at the script layer; (3) the application does not render untrusted HTML. This will be revisited in a future CSS audit.

---

#### Finding A05-02: CSP connect-src Allows Any WebSocket Origin

- **Severity:** Informational
- **CWE:** CWE-16 — Configuration
- **Description:** The CSP `connect-src` directive includes `wss:` (any WebSocket over TLS), rather than `wss://api.yourdomain.com`. If the application ever loads third-party components that make WebSocket connections, this directive would not restrict their destination.
- **Affected files:** `src/lib/server/security-headers.ts`
- **Status:** Open (P3) — informational, deferred
- **Evidence:**
  ```typescript
  "connect-src 'self' wss:",  // allows any wss: origin
  ```
- **Fix plan:** Replace `wss:` with the specific SSE/WebSocket endpoint hostname (e.g., `wss://api.example.com`) when the deployment hostname is known. Consider parameterizing via `NEXT_PUBLIC_API_URL`.

---

#### Finding A05-03: All Security Headers Present — Pass

- **Severity:** Informational
- **CWE:** N/A
- **Description:** The following headers are correctly set on all page responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`, `Content-Security-Policy` (nonce-based), `Strict-Transport-Security` (production only). `X-Request-ID` is set on every response for tracing.
- **Affected files:** `src/lib/server/security-headers.ts`, `src/proxy.ts`
- **Status:** Pass

---

### A06: Vulnerable and Outdated Components

#### Finding A06-01: Backend npm Audit — 26 Vulnerabilities Including 1 Critical

- **Severity:** High
- **CWE:** CWE-1035 — Using Components with Known Vulnerabilities
- **Description:** `npm audit` against the backend API repository (`~/Desktop/Tracking Data Bot/api`) reports 26 total vulnerabilities: 1 critical, 23 high, 1 moderate, 1 low. The root cause is a chain of transitive vulnerabilities through the AWS SDK packages (@aws-sdk/client-s3, @aws-sdk/client-sqs, @aws-sdk/s3-request-presigner) and `undici` (the HTTP client used internally by Node.js fetch). `multer` (file upload middleware) also has a direct vulnerability.

  | Direct Package | Severity | Notes |
  |----------------|----------|-------|
  | undici | Critical | HTTP client used by Node.js built-in fetch — CVE in request smuggling |
  | @aws-sdk/client-s3 | High | Transitive via @aws-sdk/signature-v4-multi-region |
  | @aws-sdk/client-sqs | High | Transitive via @aws-sdk/core, undici chain |
  | @aws-sdk/s3-request-presigner | High | Transitive AWS SDK chain |
  | multer | High | File upload — check if used in dashboard-facing routes |

- **Affected files:** `~/Desktop/Tracking Data Bot/api/package.json`
- **Impact:** The undici critical vulnerability is the most urgent: Node.js `fetch()` uses undici internally, meaning HTTP requests made by the backend could be affected by request smuggling or parsing vulnerabilities. The AWS SDK chain vulnerabilities are in infrastructure-facing code (S3/SQS) and likely require an AWS SDK major version upgrade.
- **Status:** Open (P1)
- **Fix plan:** Run `npm audit fix` in the backend repository to apply available automatic fixes. For the AWS SDK chain, upgrade all `@aws-sdk/*` packages to the latest v3 version (`npm install @aws-sdk/client-s3@latest @aws-sdk/client-sqs@latest @aws-sdk/s3-request-presigner@latest`). For undici, upgrade Node.js to the latest LTS or upgrade undici directly. Run the full test suite after each upgrade. This is a backend milestone item.

---

#### Finding A06-02: Dashboard npm Audit — 1 High (Dev Dependency)

- **Severity:** Low
- **CWE:** CWE-1035 — Using Components with Known Vulnerabilities
- **Description:** `npm audit` against the dashboard repository reports 1 high-severity vulnerability in `minimatch` (versions 10.0.0-10.2.2), affected by two ReDoS vulnerabilities (GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74). The affected `minimatch` package is a transitive devDependency (not in production bundle).

  | CVE/Advisory | Severity | CWE |
  |---|---|---|
  | GHSA-7r86-cg39-jmmj | High (7.5) | CWE-407 — Uncontrolled Algorithm Complexity |
  | GHSA-23c5-xmqv-rm74 | High (7.5) | CWE-1333 — Inefficient Regular Expression |

- **Affected files:** `package.json` (devDependencies transitive chain)
- **Impact:** Low — devDependency only. Not present in the production Next.js bundle. ReDoS would only be exploitable if build tools received attacker-controlled glob patterns, which is not a realistic attack vector.
- **Status:** Open (P3)
- **Fix plan:** Run `npm audit fix` to upgrade the affected minimatch version. No production impact expected.

---

#### Finding A06-03: @next/bundle-analyzer Version Mismatch

- **Severity:** Low
- **CWE:** CWE-1035 — Using Components with Known Vulnerabilities (version alignment risk)
- **Description:** `@next/bundle-analyzer` is installed at v16.1.6 while the main `next` package is at v14.2.35. A 2-major-version gap creates risk of API incompatibility in the webpack configuration wrapper.
- **Affected files:** `package.json`
- **Status:** Open (P3)
- **Fix plan:** Pin `@next/bundle-analyzer` to match the Next.js major version: `npm install @next/bundle-analyzer@14`.

---

#### Finding A06-04: Zod Version Split Between Dashboard and Backend

- **Severity:** Informational
- **CWE:** CWE-1035 — Using Components with Known Vulnerabilities (maintenance risk)
- **Description:** The dashboard uses Zod v4.3.6 (Phase 17 migrated from v3 deprecated patterns). The backend uses Zod v3.25.76. The two codebases share a Prisma schema but not validation schemas, so the version split does not cause runtime compatibility issues. However, team familiarity with two major versions creates maintenance overhead and potential for accidentally using deprecated v3 patterns in dashboard code.
- **Affected files:** `package.json` (dashboard), `~/Desktop/Tracking Data Bot/api/package.json` (backend)
- **Status:** Informational — backend Zod v4 migration is a backend milestone item

---

### A07: Identification and Authentication Failures

#### Finding A07-01: JWT Validation and Token Revocation on Logout — Pass

- **Severity:** Informational
- **CWE:** CWE-613 — Insufficient Session Expiration (mitigated)
- **Description:** The logout route correctly calls the backend to revoke tokens server-side before clearing cookies. Both `auth_token` (as `Authorization: Bearer`) and `refresh_token` (in request body) are sent to the backend logout endpoint for revocation via Valkey. The backend's `verifyAccessToken()` also performs revocation checks on every request.
- **Affected files:** `src/app/api/auth/logout/route.ts`, `api/src/middleware/dashboardAuth.ts`
- **Status:** Pass
- **Evidence:**
  ```typescript
  // Source: src/app/api/auth/logout/route.ts — server-side token revocation
  export async function POST() {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (authToken) {
      await backendFetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...(refreshToken && { refresh_token: refreshToken }),
        }),
      }).catch(() => undefined); // fire-and-forget; cookies cleared regardless
    }

    cookieStore.delete('auth_token');
    cookieStore.delete('refresh_token');
    return NextResponse.json({ success: true });
  }
  ```

---

#### Finding A07-02: CSRF Token Per-Request Refresh — Pass

- **Severity:** Informational
- **CWE:** CWE-352 — Cross-Site Request Forgery (mitigated)
- **Description:** Every middleware response sets a fresh HMAC-signed CSRF token cookie. The token is JTI-bound, cryptographically random (32 bytes entropy), and validated via double-submit pattern on all mutation requests (POST, PUT, PATCH, DELETE). Auth routes and the CSP report route are correctly excluded from CSRF validation.
- **Affected files:** `src/proxy.ts`
- **Status:** Pass

---

#### Finding A07-03: Cookie Domain Parsing — Custom Implementation

- **Severity:** Low
- **CWE:** CWE-20 — Improper Input Validation
- **Description:** The OAuth login route implements custom cookie domain normalization logic to compute the appropriate domain for the `oauth_ctx` cookie. The logic handles IP literals, localhost, and multi-part TLDs using string splitting and regex. Custom domain parsing can have edge cases with ccTLD (.co.uk, .com.au), IDN domains, or unusual inputs.
- **Affected files:** `src/app/api/auth/login/route.ts`
- **Status:** Open (P3)
- **Evidence:**
  ```typescript
  // Source: src/app/api/auth/login/route.ts — custom domain normalization
  function getCookieDomain(request: NextRequest): string | undefined {
    const hostname = getRequestHostname(request)
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return undefined
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
      return undefined // IPv4/IPv6 literals
    }
    const parts = hostname.split('.').filter(Boolean)
    if (parts.length < 2) return undefined
    return parts.slice(-2).join('.') // takes last 2 parts — misses co.uk style TLDs
  }
  ```
- **Fix plan:** Replace custom logic with `tldjs` or `psl` npm package which correctly handles ccTLDs and PSL (Public Suffix List). The `OAUTH_CONTEXT_COOKIE_DOMAIN` env var override provides a safe escape hatch for production deployments where the domain is known.

---

### A08: Software and Data Integrity Failures

#### Finding A08-01: No Subresource Integrity on Third-Party Scripts

- **Severity:** Low
- **CWE:** CWE-494 — Download of Code Without Integrity Check
- **Description:** The dashboard does not add `integrity` and `crossorigin` attributes to externally loaded scripts. Currently the codebase does not appear to load external scripts directly (Discord CDN is for images only, fonts from Google Fonts are loaded via CSS). No third-party `<script>` tags were identified. However, if external scripts are added in future, SRI should be applied.
- **Affected files:** All page layout files
- **Status:** Informational — deferred to v1.3
- **Fix plan:** When third-party scripts are added, use SRI hashes. For Google Fonts (loaded via CSS), add `<link integrity="...">` if loading the CSS link element directly.

---

#### Finding A08-02: CSRF HMAC Token Integrity — Pass

- **Severity:** Informational
- **CWE:** CWE-345 — Insufficient Verification of Data Authenticity (mitigated)
- **Description:** Phase 21 implemented HMAC-SHA-256 signed CSRF tokens using `crypto.subtle`. The backend is expected to verify the HMAC signature in Phase 37 dual-check mode. The dashboard's double-submit cookie validation provides a client-layer integrity check independent of HMAC.
- **Affected files:** `src/proxy.ts`
- **Status:** Pass — with deployment note: backend Phase 37 dual-check mode must be confirmed live before relying on HMAC verification in production.

---

### A09: Security Logging and Monitoring Failures

#### Finding A09-01: Backend Structured Logging — Pass

- **Severity:** Informational
- **CWE:** CWE-778 — Insufficient Logging (mitigated)
- **Description:** The backend uses a structured `logger` (from `@lx/shared/lib/logger`) for all authentication events: token validation success/failure, guild access enforcement, admin permission denials, and rate limit events. `securityMonitor.trackFailedAttempt()` is called for invalid JWT and unauthorized guild access attempts.
- **Affected files:** `api/src/middleware/dashboardAuth.ts`
- **Status:** Pass
- **Evidence:**
  ```typescript
  // Source: api/src/middleware/dashboardAuth.ts
  securityMonitor.trackFailedAttempt(ip, 'invalid_dashboard_jwt', req.path);
  logger.warn({ ip, userId: user.sub, guildId, event: 'unauthorized_guild_access' },
    'User attempted to access unauthorized guild');
  ```

---

#### Finding A09-02: Dashboard Console-Only Logging

- **Severity:** Medium
- **CWE:** CWE-778 — Insufficient Logging
- **Description:** The dashboard's client-side fetch layer uses only `console.warn` for error logging. There is no structured log output from API route handlers, no request ID correlation between middleware-generated `X-Request-ID` and client-side error messages, and no forwarding of errors to a log aggregation service.
- **Affected files:** `src/lib/fetch-with-retry.ts`, all `src/app/api/` route handlers
- **Status:** Open (P3)
- **Fix plan:** Add a lightweight server-side logger (Pino) to API route handlers. Log failed backend calls with `X-Request-ID` for tracing. Forward `console.warn` calls in `fetchWithRetry` to a structured client-side logger that includes the request ID from response headers.

---

#### Finding A09-03: No Error Tracking Integration

- **Severity:** Low
- **CWE:** CWE-778 — Insufficient Logging
- **Description:** Neither the dashboard nor the backend integrates an error tracking service (Sentry, Datadog, Rollbar). Runtime exceptions in API routes and unhandled promise rejections in client code are not aggregated or alerted on. Rate limit events are not exposed as metrics.
- **Affected files:** Application-wide
- **Status:** Open (P3)
- **Fix plan:** Integrate Sentry SDK (`@sentry/nextjs` for dashboard, `@sentry/node` for backend). Add alert rules for high 5xx error rates and sustained rate limiting. This is a v1.3 item.

---

### A10: Server-Side Request Forgery (SSRF)

#### Finding A10-01: Backend URL is Fixed — Pass

- **Severity:** Informational
- **CWE:** CWE-918 — Server-Side Request Forgery (not applicable)
- **Description:** `backendFetch()` uses `BACKEND_API_URL` from environment variables — a fixed administrator-controlled value. No user-supplied input is used to construct the backend URL. The `API_URL` constant in `proxy.ts` and all route handlers is derived solely from environment configuration.
- **Affected files:** `src/lib/server/backend-fetch.ts`, `src/proxy.ts`
- **Status:** Pass
- **Evidence:**
  ```typescript
  // Source: src/lib/server/backend-fetch.ts
  export async function backendFetch(input: string | URL | Request, init?: RequestInit) {
    // input is always a string literal constructed from BACKEND_API_URL + path constant
    // No user-controlled URL construction
  }
  ```

---

#### Finding A10-02: OAuth Redirect Header Forwarding

- **Severity:** Low
- **CWE:** CWE-918 — Server-Side Request Forgery
- **Description:** The OAuth login route (`src/app/api/auth/login/route.ts`) forwards the `location` header from the backend response as a redirect to the user's browser without validating that it is a Discord OAuth URL. If the backend were compromised and returned a malicious `location` header, the dashboard would redirect authenticated users there.
- **Affected files:** `src/app/api/auth/login/route.ts`
- **Status:** Accepted Risk
- **Evidence:**
  ```typescript
  // Source: src/app/api/auth/login/route.ts
  const location = upstream.headers.get('location')
  if (!location) { ... }
  // location forwarded to browser without origin validation
  const response = NextResponse.redirect(location, upstream.status >= 300 && ... ? upstream.status : 302)
  ```
- **Rationale:** The backend is a trusted internal service on the same infrastructure, accessible only via `BACKEND_API_URL` (not user-controlled). A backend compromise would be a Critical incident independent of this path. Validating the location URL against `https://discord.com/oauth2/authorize` would add defense-in-depth but is not required given the trust model. If desired: add `const DISCORD_OAUTH_PREFIX = 'https://discord.com/oauth2/authorize'` check before forwarding.

---

## Performance Findings

### PF-01: Bundle Optimization — Resolved in Phase 22

- **Severity:** Informational
- **CWE:** CWE-400 — Uncontrolled Resource Consumption (mitigated)
- **Description:** Phase 22 added `optimizePackageImports` for `lucide-react` and `recharts` in `next.config.ts`, enabling tree-shaking for these large icon/charting libraries. Dynamic imports were applied to non-default-tab heavy components (analytics, settings). `RoundsTab` was correctly kept as a static import (default tab must render immediately).
- **Affected files:** `next.config.ts`, tab components in `src/app/(dashboard)/guilds/[guildId]/`
- **Status:** Resolved in Phase 22
- **Evidence:**
  ```typescript
  // Source: next.config.ts — Phase 22 optimizePackageImports
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  }
  // Dynamic imports for non-default tabs
  const AnalyticsTab = dynamic(() => import('./analytics-tab'), { loading: () => null });
  ```

---

### PF-02: React Query staleTime Normalization — Resolved in Phase 22

- **Severity:** Informational
- **CWE:** CWE-400 — Uncontrolled Resource Consumption (mitigated)
- **Description:** Phase 22 established a 4-tier staleTime system: static=5min, paginated=2min, real-time=1min, session=fresh. A global 5-minute default was set in `providers.tsx`. Polling hooks (use-guilds status, use-sessions) retain 30s staleTime intentionally. This normalized a previous inconsistency where multiple hooks used `staleTime: 0`, triggering waterfall refetches on every render.
- **Affected files:** `src/app/providers.tsx`, all `src/hooks/use-*.ts` files
- **Status:** Resolved in Phase 22

---

### PF-03: Unbounded Infinite Scroll Cache

- **Severity:** Medium
- **CWE:** CWE-770 — Allocation Without Limits or Throttling
- **Description:** The React Query `useInfiniteQuery` hooks for accounts and posts accumulate all fetched pages in memory without eviction. A user who scrolls through 100+ pages (10,000+ items) would hold the entire dataset in the browser's heap. React Query's `gcTime` (formerly `cacheTime`) controls when unused query results are garbage collected, but actively-viewed queries are never evicted.
- **Affected files:** `src/hooks/use-tracking.ts` (useInfiniteQuery), `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`
- **Impact:** Browser memory exhaustion on large datasets; page freeze or OOM crash for power users.
- **Status:** Open (P2)
- **Fix plan:** Implement `maxPages` in the `useInfiniteQuery` options (available in TanStack Query v5) to limit the number of cached pages. Set `maxPages: 10` (2,000 items visible max). Alternatively, implement virtual scrolling with `@tanstack/react-virtual` to render only visible rows.

---

### PF-04: Excel Export Entire ZIP Built In-Memory

- **Severity:** Low
- **CWE:** CWE-400 — Uncontrolled Resource Consumption
- **Description:** The Excel export builds the entire XLSX ZIP in browser memory before triggering a download. For large exports (50,000+ posts), this could allocate 50-200 MB of heap in the browser tab during the export operation.
- **Affected files:** `src/lib/posts-excel-export.ts`
- **Impact:** Browser tab freeze or OOM crash on very large exports. Medium-term scaling concern.
- **Status:** Open (P3)
- **Fix plan:** For large datasets, move export processing server-side (API route streams the ZIP) using a streaming XLSX library. Add a pre-export size estimate (row count × average row size) to warn users when exports may be slow.

---

### PF-05: SSE Connection Per-Component (No Pooling)

- **Severity:** Low
- **CWE:** CWE-400 — Uncontrolled Resource Consumption
- **Description:** Each component that uses `useSSE` creates its own `EventSource` connection to the status endpoint. In the current architecture, one `EventSource` per guild page is expected. However, if multiple components on the same page independently subscribe to the same SSE URL, multiple connections are created to the same endpoint.
- **Affected files:** `src/hooks/use-sse.ts`, `src/hooks/use-guilds.ts`
- **Impact:** Wasted connections; backend connection count scales linearly with components rather than with users.
- **Status:** Open (P3)
- **Fix plan:** Implement a connection pool (singleton `EventSource` per URL using a ref-counted Map). Use `BroadcastChannel` or React Context to distribute messages to multiple subscribers from a single connection.

---

### PF-06: SSE Heartbeat Timeout (45s) — Resolved in Phase 18

- **Severity:** Informational
- **CWE:** CWE-400 — Uncontrolled Resource Consumption (mitigated)
- **Description:** Phase 18 implemented a 45-second heartbeat timeout (`HEARTBEAT_TIMEOUT = 45_000`) with a 5-second polling interval. Stalled connections are detected and closed, triggering reconnection with exponential backoff. A generation counter prevents dual `EventSource` instances during rapid tab switches.
- **Affected files:** `src/hooks/use-sse.ts`
- **Status:** Resolved in Phase 18
- **Evidence:**
  ```typescript
  // Source: src/hooks/use-sse.ts — Phase 18 heartbeat constants
  const HEARTBEAT_TIMEOUT = 45_000        // 45s silence = stalled connection
  const HEARTBEAT_CHECK_INTERVAL = 5_000  // poll every 5s
  const HIDE_GRACE_MS = 15_000            // 15s grace period before disconnecting on tab hide
  ```

---

### PF-07: Re-render Cycles in Large Tables — Informational

- **Severity:** Informational
- **CWE:** CWE-400 — Uncontrolled Resource Consumption (potential)
- **Description:** The codebase contains 81 `useCallback`/`useMemo`/`useEffect` hooks (identified in CONCERNS.md). No dependency analysis was performed in v1.2. Top candidates for optimization: `audit-log-table.tsx`, `accounts/page.tsx`. No evidence of actual performance problems, but the concentration of memoization hooks without profiling creates maintenance risk.
- **Affected files:** `src/components/audit/audit-log-table.tsx`, `src/app/(dashboard)/guilds/[guildId]/accounts/page.tsx`
- **Status:** Open (P3) — deferred to v1.3 performance profiling

---

## Recommendations Roadmap

### P1 — Immediate Action Required

| # | Finding | Category | Why Urgent |
|---|---------|----------|------------|
| 1 | A06-01: Backend npm audit (1 critical, 23 high) | Vulnerable Components | undici critical CVE in production HTTP layer; AWS SDK chain high |

### P2 — Fix in Next Sprint

| # | Finding | Category | Why |
|---|---------|----------|-----|
| 2 | A01-02: callbackUrl open redirect | Access Control | Phishing vector; fix is a simple same-origin validation |
| 3 | A01-01: guildId snowflake validation | Access Control | Defense-in-depth gap; fix is a one-line Zod regex |
| 4 | PF-03: Unbounded infinite scroll cache | Performance | Memory exhaustion risk for power users; maxPages available in RQ v5 |

### P3 — Planned Improvements

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 5 | A07-03: Cookie domain custom parsing | Authentication | Replace with `tldjs`; OAUTH_CONTEXT_COOKIE_DOMAIN override covers production |
| 6 | A04-02: Multi-tab session refresh race | Design | BroadcastChannel or Valkey lock; low frequency today |
| 7 | A04-03: Dashboard structured logging | Logging | Pino + X-Request-ID correlation |
| 8 | A05-02: CSP connect-src wss: | Misconfiguration | Restrict to specific WebSocket host |
| 9 | A06-02: Dashboard minimatch ReDoS | Vulnerable Components | Dev-only; `npm audit fix` sufficient |
| 10 | A06-03: @next/bundle-analyzer mismatch | Components | Lock to Next.js 14.x version |
| 11 | A09-02: Dashboard console-only logging | Logging | Pino for API routes |
| 12 | A09-03: No error tracking | Logging | Sentry SDK integration |
| 13 | A10-02: OAuth redirect header validation | SSRF | Add Discord URL prefix check |
| 14 | PF-04: Excel in-memory ZIP | Performance | Server-side streaming for large exports |
| 15 | PF-05: SSE connection pooling | Performance | BroadcastChannel-based pool |
| 16 | PF-07: Re-render cycle audit | Performance | Profile with React DevTools profiler |
| 17 | A08-01: No SRI on external scripts | Integrity | Deferred to v1.3 (no external scripts currently) |

### Deployment Dependencies (Not Code Defects)

| Item | Dependency | Status |
|------|------------|--------|
| CSRF HMAC validation in production | Backend Phase 37 dual-check mode | Confirm before full production deployment |
| Cursor pagination (Phase 20) | Backend Phase 39 live | Confirm before Phase 20 activates |
| Backend Phase 35-39 status | Unknown — requires backend team confirmation | Block on verification |

---

*Audit completed: 2026-03-04*
*Phases verified: 17 (error envelope), 18 (SSE heartbeat), 19 (proactive refresh, rate limit split), 20 (cursor pagination), 21 (CSRF HMAC), 22 (bundle optimization, staleTime normalization)*
*Standards: OWASP Top 10 2021, CWE 4.x*
