# Phase 10: Frontend Security Hardening - Research

**Researched:** 2026-02-16
**Domain:** Next.js 14 security hardening (CSRF, CSP, error sanitization)
**Confidence:** HIGH

## Summary

Frontend security hardening in Next.js 14 involves three main domains: CSRF protection via double-submit cookie pattern, Content Security Policy (CSP) headers with nonce-based enforcement, and error message sanitization to prevent information leakage. The dashboard is a Next.js 14 App Router SPA that proxies requests to an Express.js backend, making it ideal for implementing defense-in-depth security at the proxy layer.

Current codebase already uses Sonner for toast notifications and has sophisticated error handling in `fetchWithRetry.ts` with session refresh flows. The task is to layer on CSRF validation, enforce strict CSP, and sanitize backend error responses before they reach the client.

**Primary recommendation:** Use `@edge-csrf/nextjs` for double-submit CSRF protection, implement nonce-based CSP in Next.js proxy.js file (not middleware — Next.js 16 renamed it), and create an error sanitization utility in the proxy layer that strips stack traces while preserving contextual user-friendly messages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Error presentation:** Contextual error messages that describe WHAT failed (e.g., "Failed to load tracking data", "Could not save settings") — not generic "something went wrong"
- **Display location:** Toast for background/fetch failures, inline at component for user-initiated actions (form submit, button click)
- **No technical details:** No stack traces, internal paths, or technical details exposed to the client
- **CSP policy scope:** Enforce CSP immediately (no report-only warm-up period)
- **Claude audits third-party resources:** Includes fonts, CDNs in CSP allowlist
- **Full security headers suite:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy beyond CSP
- **CSRF failure UX:** Silent retry with fresh token — user never sees initial failure
- **403 forbidden:** Inline permission message in-place ("You don't have permission to view this") with link back to guild overview
- **CSRF validation layers:** Both dashboard proxy (Next.js) generates/validates AND backend double-checks (defense in depth)

### Claude's Discretion
- **CSP inline style handling:** Audit codebase to determine if unsafe-inline or nonces needed for styles
- **Retry button on transient errors:** vs keeping errors action-free
- **5xx server error handling:** Stay on page with toast vs error page for primary data failures
- **CSRF token scope:** Per-session vs per-request
- **CSRF transmission mechanism:** Likely cookie + custom header for SPA
- **Security violation logging:** Which violations to log to DashboardAuditLog
- **Persistent CSRF failure escalation:** Show error toast or force re-login

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @edge-csrf/nextjs | Latest (2.x) | CSRF protection via double-submit cookie pattern | Runs on both edge and Node.js runtimes, designed for Next.js App Router, handles signed cookies, validates tokens before route handlers execute |
| Next.js Proxy API | 16+ (built-in) | Security header injection, nonce generation, request preprocessing | Official Next.js feature renamed from "middleware" in v16, runs before all requests, ideal for CSP nonce generation and CSRF validation |
| Sonner | 2.0.7 (existing) | Toast notifications for errors | Already integrated in codebase, themed toast system for background errors and action failures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 (existing) | Error schema validation | Validate backend error responses match expected shape before displaying to user |
| React Query | 5.90.20 (existing) | Mutation error handling | Already handles mutation errors with onError callbacks — extend with CSRF retry logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @edge-csrf/nextjs | csrf-csrf (Express-based) | csrf-csrf is for Express servers, not Next.js frontend; would require custom implementation |
| Nonce-based CSP | Hash-based CSP (SRI) | SRI is experimental, webpack-only, not supported in Turbopack; nonces more mature and flexible |
| Proxy.js | Middleware.tsx | "Middleware" is deprecated name; Next.js 16 renamed to "proxy" to reflect purpose |

**Installation:**
```bash
npm install @edge-csrf/nextjs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/                 # API routes (proxy to backend)
│   └── ...
├── lib/
│   ├── server/
│   │   ├── csrf.ts          # CSRF middleware configuration
│   │   ├── csp.ts           # CSP policy builder
│   │   ├── security-headers.ts  # Security headers utility
│   │   └── error-sanitizer.ts   # Error sanitization utility
│   └── fetch-with-retry.ts  # EXISTING: extend with CSRF token injection
├── proxy.ts                 # NEW: Security proxy (CSP nonces, headers)
└── ...
```

### Pattern 1: CSRF Double-Submit Cookie with Silent Retry
**What:** CSRF token stored in cookie (accessible to JS), sent in custom header on mutations, validated by middleware before handler executes. On CSRF failure (403), silently fetch fresh token and retry once.

**When to use:** All state-changing requests (POST, PUT, PATCH, DELETE)

**Example:**
```typescript
// Source: @edge-csrf/nextjs official docs + dashboard requirements
// File: proxy.ts (NEW)
import { createCsrfMiddleware } from '@edge-csrf/nextjs';

const csrfMiddleware = createCsrfMiddleware({
  cookie: {
    name: '__Host-csrf',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  excludePathPrefixes: ['/api/auth/callback', '/api/auth/login'],
});

export const proxy = csrfMiddleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

```typescript
// File: src/lib/fetch-with-retry.ts (EXTEND EXISTING)
// Add CSRF token injection and retry logic
async function fetchWithCsrf(url: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers);

  // Read CSRF token from cookie set by middleware
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('__Host-csrf='))
    ?.split('=')[1];

  if (csrfToken && isMutationMethod(options.method)) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(url, { ...options, headers });

  // Silent retry on CSRF failure
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => ({}));
    if (body.code === 'EBADCSRFTOKEN') {
      // Fetch fresh CSRF token by making a GET request
      await fetch('/api/csrf-refresh', { method: 'GET' });

      // Retry once with fresh token
      const newToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('__Host-csrf='))
        ?.split('=')[1];

      if (newToken) {
        headers.set('X-CSRF-Token', newToken);
        return fetch(url, { ...options, headers });
      }
    }
  }

  return response;
}
```

### Pattern 2: CSP with Nonces for Dynamic Rendering
**What:** Generate unique nonce per request, inject into CSP header and custom `x-nonce` header, Next.js auto-applies to framework scripts/styles. Requires dynamic rendering (no static optimization).

**When to use:** Production CSP enforcement without `unsafe-inline`

**Example:**
```typescript
// Source: Next.js official CSP guide (nextjs.org/docs/app/guides/content-security-policy)
// File: proxy.ts
import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data: https://cdn.discordapp.com;
    font-src 'self';
    connect-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```

### Pattern 3: Error Sanitization in Proxy Layer
**What:** Intercept backend error responses, strip technical details (stack traces, internal paths), preserve contextual user-friendly messages.

**When to use:** All API route responses (GET, POST, PUT, PATCH, DELETE)

**Example:**
```typescript
// Source: Next.js error handling best practices + OWASP secure headers
// File: src/lib/server/error-sanitizer.ts (NEW)
interface BackendError {
  message?: string;
  error?: string;
  code?: string;
  stack?: string;
  details?: unknown;
}

interface SanitizedError {
  message: string;
  code?: string;
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  'GUILD_NOT_FOUND': 'Server not found',
  'INSUFFICIENT_PERMISSIONS': 'You don\'t have permission to perform this action',
  'VALIDATION_ERROR': 'Invalid input provided',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
};

export function sanitizeError(
  statusCode: number,
  backendError: BackendError,
  context: string
): SanitizedError {
  // Preserve error codes for client-side logic (CSRF retry, etc)
  const code = backendError.code;

  // Use friendly message if available
  if (code && FRIENDLY_MESSAGES[code]) {
    return { message: FRIENDLY_MESSAGES[code], code };
  }

  // Preserve backend message if it's user-friendly (no stack traces, no paths)
  const backendMsg = backendError.message || backendError.error || '';
  const isSafe = !backendMsg.includes('Error:') &&
                 !backendMsg.includes('at ') &&
                 !backendMsg.includes('/') &&
                 backendMsg.length < 200;

  if (isSafe && backendMsg) {
    return { message: backendMsg, code };
  }

  // Fallback to contextual generic message
  const genericMessages: Record<number, (ctx: string) => string> = {
    400: (ctx) => `Invalid ${ctx} data`,
    403: (ctx) => `Access denied to ${ctx}`,
    404: (ctx) => `${ctx} not found`,
    500: (ctx) => `Failed to ${ctx}`,
    503: (ctx) => `${ctx} service unavailable`,
  };

  const messageGenerator = genericMessages[statusCode] || genericMessages[500];
  return { message: messageGenerator(context), code };
}
```

```typescript
// File: src/app/api/guilds/[guildId]/settings/route.ts (PATTERN)
import { sanitizeError } from '@/lib/server/error-sanitizer';

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { guildId } = await params;
  const token = (await cookies()).get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await backendFetch(`${API_URL}/api/v1/guilds/${guildId}/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      // Sanitize backend error before returning
      const sanitized = sanitizeError(response.status, data, 'update settings');
      return NextResponse.json(sanitized, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    // Never leak internal errors
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
```

### Anti-Patterns to Avoid
- **Allowing `unsafe-inline` in production CSP:** Opens XSS vectors. Use nonces or hashes instead.
- **Generic "something went wrong" messages:** User has no idea what failed or how to fix it. Use contextual messages.
- **Exposing backend error objects directly:** Stack traces, file paths, database errors leak architecture details.
- **CSRF token in URL parameters:** Logged in browser history, server logs, referrer headers. Use cookies + headers.
- **Skipping CSRF on GET requests:** GET should be idempotent and not mutate state, so CSRF not needed — but verify your GETs are truly read-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF token generation & validation | Custom crypto logic, manual cookie parsing | @edge-csrf/nextjs | Signed tokens prevent tampering, handles token rotation, integrates with Next.js App Router, validates before handlers execute |
| CSP nonce generation | Manual `Math.random()` or timestamp-based | `crypto.randomUUID()` with base64 encoding | Cryptographically secure randomness, built-in Node.js API, recommended by Next.js official docs |
| Error message allowlists | Manual string matching for "safe" errors | Structured sanitization with code mapping | Edge cases (SQL errors that look safe, injection attempts), hard to maintain allowlist, better to map error codes to messages |
| Security headers | Manually setting each header in each route | Centralized proxy/middleware with header utility | Easy to miss headers in new routes, inconsistent policies, maintenance nightmare |

**Key insight:** Security primitives have subtle edge cases (timing attacks, token rotation race conditions, CSP directive interactions). Use battle-tested libraries that handle these for you.

## Common Pitfalls

### Pitfall 1: CSP Breaks Dynamic Inline Styles
**What goes wrong:** Tailwind CSS and Next.js generate inline styles at runtime. Strict CSP with `style-src 'self'` blocks these, breaking UI.

**Why it happens:** Next.js injects inline styles for:
- Critical CSS for above-the-fold content
- CSS-in-JS from third-party libraries
- Tailwind's JIT compilation in development

**How to avoid:** Use `style-src 'self' 'nonce-${nonce}'` in CSP and ensure Next.js can read nonce from `x-nonce` header (it does this automatically).

**Warning signs:**
- Unstyled content flash on page load
- Browser console CSP violations for inline styles
- Development works but production breaks (if dev uses `unsafe-inline`)

### Pitfall 2: CSRF Token Missing on First Mutation
**What goes wrong:** User loads page, immediately submits form, CSRF validation fails because token cookie not yet set.

**Why it happens:** CSRF middleware sets token cookie on first request, but client-side fetch doesn't wait for cookie to be available.

**How to avoid:**
1. Ensure CSRF middleware runs on all page requests (including SSR), not just API routes
2. Read token from cookie synchronously before mutation (cookie is already set by page load)
3. Fallback: If token missing, make GET request to trigger middleware before mutation

**Warning signs:**
- First mutation after page load fails with 403
- Subsequent mutations succeed (cookie is cached)
- Only affects fresh page loads, not client-side navigation

### Pitfall 3: Backend Error Messages Leak Internal Paths
**What goes wrong:** Prisma errors include model names and file paths. Zod validation errors include schema structure. These leak architecture details.

**Why it happens:** Backend returns errors directly from libraries without sanitization.

**How to avoid:**
- Never return error.stack to client
- Never return error.message if it contains "Error:", "at ", or "/" (stack trace indicators)
- Map known error codes to user-friendly messages
- Default to generic contextual message: "Failed to {action}"

**Warning signs:**
- Error messages include "PrismaClientKnownRequestError"
- Error messages include file paths like "/app/src/lib/..."
- Error messages include SQL fragments or database column names

### Pitfall 4: CSP Nonce Not Applied to Third-Party Scripts
**What goes wrong:** Google Analytics, external fonts, CDN resources blocked by CSP.

**Why it happens:** CSP nonce only applies to same-origin inline scripts. External resources need explicit allowlist in CSP directives.

**How to avoid:**
- Audit codebase for all external resources (Script tags, Link tags, fetch calls)
- Add domains to appropriate CSP directives (script-src, style-src, font-src, connect-src)
- For dashboard: already uses Discord CDN for avatars (`cdn.discordapp.com`) — add to img-src

**Warning signs:**
- Third-party scripts don't execute
- Fonts fail to load
- Network requests blocked with CSP violation
- Works in dev (if `unsafe-inline` allowed), breaks in prod

### Pitfall 5: Persistent CSRF Failures Loop
**What goes wrong:** CSRF token refresh fails repeatedly, user stuck in retry loop or forced to reload page.

**Why it happens:** Token rotation race condition — multiple concurrent mutations each try to refresh token, invalidating each other's tokens.

**How to avoid:**
- Use singleton refresh pattern: queue mutations if refresh in progress
- Set per-session tokens (not per-request) to reduce rotation frequency
- Escalation after 2-3 failed retries: show toast or force re-login (Claude's discretion)

**Warning signs:**
- Multiple rapid mutations all fail with CSRF errors
- Network tab shows burst of token refresh requests
- User must manually reload to fix (token desync)

## Code Examples

Verified patterns from official sources:

### Reading CSP Nonce in Server Component
```typescript
// Source: nextjs.org/docs/app/guides/content-security-policy
import { headers } from 'next/headers';
import Script from 'next/script';

export default async function Page() {
  const nonce = (await headers()).get('x-nonce');

  return (
    <Script
      src="https://www.googletagmanager.com/gtag/js"
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
```

### Forcing Dynamic Rendering for CSP Nonces
```typescript
// Source: nextjs.org/docs/app/guides/content-security-policy
import { connection } from 'next/server';

export default async function Page() {
  // Wait for incoming request to render this page (prevents static optimization)
  await connection();

  // Your page content with CSP nonces
}
```

### React Query Mutation with CSRF Token
```typescript
// Source: Existing codebase pattern + React CSRF best practices
// File: src/hooks/use-tracking.ts (EXTEND)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

export function useUpdateSettings(guildId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SettingsUpdate) => {
      // fetchWithRetry now handles CSRF token injection automatically
      const response = await fetchWithRetry(`/api/guilds/${guildId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['guild', guildId] });
    },
    onError: (error) => {
      // Contextual error message from sanitized backend response
      toast.error('Failed to update settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
```

### Security Headers Utility
```typescript
// Source: OWASP HTTP Headers Cheat Sheet + Next.js best practices
// File: src/lib/server/security-headers.ts (NEW)
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  const isDev = process.env.NODE_ENV === 'development';

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${nonce ? `'nonce-${nonce}'` : ''}`,
    "img-src 'self' blob: data: https://cdn.discordapp.com",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts file | proxy.ts file | Next.js 16 (2024) | Rename only — functionality identical, better reflects purpose |
| CSRF synchronizer tokens | Signed double-submit cookie | Industry shift 2020s | Stateless CSRF protection, works with distributed systems, no server-side session storage |
| CSP report-only mode | Enforce CSP immediately | Modern best practice 2025+ | Report-only allows violations, provides false sense of security; enforce from day one |
| `unsafe-inline` for styles | Nonce-based CSP | Next.js 13.4.20+ | Next.js auto-applies nonces to framework styles, eliminating need for unsafe-inline |
| Hash-based CSP (SRI) | Nonce-based CSP | Next.js 14+ recommendation | SRI experimental, webpack-only; nonces more flexible and mature |

**Deprecated/outdated:**
- **Synchronizer token pattern:** Requires server-side session storage, doesn't scale with stateless JWT auth
- **CSP Level 2 `unsafe-inline` fallback:** Modern browsers support nonces; no need for fallback that weakens security
- **Per-request CSRF tokens:** Over-engineering, causes race conditions; per-session tokens sufficient for most apps

## Open Questions

1. **CSRF token scope: per-session vs per-request?**
   - What we know: Per-session is simpler, fewer rotation race conditions. Per-request is more secure but complex.
   - What's unclear: Dashboard has session refresh flow (fetchWithRetry.ts). Does CSRF token need rotation on session refresh?
   - Recommendation: **Per-session tokens** — rotate on login/logout only. Dashboard already has robust session handling, adding CSRF rotation increases complexity without proportional security gain.

2. **Which security violations to log to DashboardAuditLog?**
   - What we know: CSRF failures and CSP violations are security events worth logging for incident response.
   - What's unclear: Volume of CSP violations in normal operation (browser extensions, dev tools). Risk of log noise.
   - Recommendation: **Log CSRF failures only** (actionType: 'csrf_violation'). CSP violations logged to browser console, monitored via external CSP reporting endpoint if needed in future.

3. **5xx server error UX: toast vs error page?**
   - What we know: Transient 5xx (503 service unavailable) should stay on page. Critical 5xx (500 on primary data fetch) might need error page.
   - What's unclear: User expectation for different error types. Is losing form state (navigating to error page) worse than unclear state?
   - Recommendation: **Toast for all 5xx, retry button for GET requests** — preserves UI state, allows user to retry without reload. If 3+ consecutive 5xx on primary data fetch, show error boundary with reload button.

4. **CSP nonce performance impact?**
   - What we know: Nonce-based CSP requires dynamic rendering, disables static optimization and ISR.
   - What's unclear: Dashboard already uses dynamic rendering for auth checks. Is CSP nonce the bottleneck or just incremental cost?
   - Recommendation: **Acceptable tradeoff** — dashboard is inherently dynamic (user-specific data, auth state). CSP nonce adds minimal overhead to already-dynamic pages. Measure TTFB before/after to quantify.

## Sources

### Primary (HIGH confidence)
- [Next.js App Router Content Security Policy Guide](https://nextjs.org/docs/app/guides/content-security-policy) - Official CSP implementation with nonces
- [Next.js 16 Proxy.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) - Proxy file configuration (renamed from middleware)
- [Next.js App Router Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Error boundaries, expected vs uncaught errors
- [OWASP HTTP Security Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) - Security headers reference
- [edge-csrf/nextjs GitHub](https://github.com/amorey/edge-csrf) - CSRF library implementation details

### Secondary (MEDIUM confidence)
- [Next.js Security Hardening: Five Steps to Bulletproof Your App in 2026](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e) - Recent security practices (verified against official docs)
- [Protecting Next.js Apps Against CSRF Attacks (Telerik)](https://www.telerik.com/blogs/protecting-nextjs-applications-cross-site-request-forgery-csrf-attacks) - CSRF implementation patterns
- [React CSRF Protection: 10 Best Practices](https://codebrahma.com/react-csrf-protection-10-best-practices/) - SPA-specific CSRF guidance
- [How to Handle Token Refresh in OAuth2 (2026-01)](https://oneuptime.com/blog/post/2026-01-24-oauth2-token-refresh/view) - Token rotation best practices

### Tertiary (LOW confidence)
- WebSearch findings on Next.js middleware vulnerability (CVE-2025-29927) - Mentioned for awareness, affects Next.js 11.x-15.x (not 14.2.35 dashboard version)
- Community discussions on CSP with Tailwind CSS - Varied approaches, official Next.js nonce pattern is authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @edge-csrf/nextjs is official recommendation, Next.js CSP docs are first-party
- Architecture: HIGH - Patterns directly from Next.js official docs and OWASP standards
- Pitfalls: MEDIUM-HIGH - Combination of documented issues and inferred from CSP/CSRF complexity

**Research date:** 2026-02-16
**Valid until:** 2026-03-18 (30 days — Next.js security features stable, low churn)
