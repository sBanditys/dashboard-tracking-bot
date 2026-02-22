import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCspHeader, getSecurityHeaders } from '@/lib/server/security-headers';
import { extractDashboardSessionCookies } from '@/lib/server/dashboard-session-cookies';
import { getClientIpFromRequest } from '@/lib/server/client-context';

import { BACKEND_API_URL } from '@/lib/server/api-url';
const API_URL = BACKEND_API_URL;
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const DASHBOARD_REFRESH_COOKIE_NAME = (process.env.DASHBOARD_REFRESH_COOKIE_NAME || 'dashboard_rt').trim();
const DASHBOARD_ACCESS_COOKIE_NAME = (process.env.DASHBOARD_ACCESS_COOKIE_NAME || 'dashboard_at').trim();
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Check if a JWT access token is expired or close to expiry.
 */
function tokenNeedsRefresh(tokenValue: string | undefined): boolean {
  if (!tokenValue) return true;
  try {
    const payload = JSON.parse(atob(tokenValue.split('.')[1]));
    return payload.exp * 1000 < Date.now() + REFRESH_BUFFER_MS;
  } catch {
    return true;
  }
}

/**
 * Call the backend refresh endpoint directly from middleware.
 * Returns new token pair on success, null on failure.
 */
async function refreshTokensFromMiddleware(
  refreshTokenValue: string,
  accessTokenValue: string | undefined,
  request: NextRequest
): Promise<{
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
} | null> {
  try {
    const cookieParts = [
      `${DASHBOARD_REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshTokenValue)}`,
    ];
    if (accessTokenValue) {
      cookieParts.push(
        `${DASHBOARD_ACCESS_COOKIE_NAME}=${encodeURIComponent(accessTokenValue)}`
      );
    }

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Cookie: cookieParts.join('; '),
    };

    // Forward browser User-Agent and client IP for backend context binding.
    // We extract only the original client IP (first XFF entry) rather than the
    // full chain, because the backend has trust proxy: 1 and the extra Next.js
    // hop would cause it to resolve the wrong IP.
    const ua = request.headers.get('user-agent');
    if (ua) fetchHeaders['User-Agent'] = ua;
    const clientIp = getClientIpFromRequest(request);
    if (clientIp) fetchHeaders['X-Forwarded-For'] = clientIp;
    if (accessTokenValue)
      fetchHeaders.Authorization = `Bearer ${accessTokenValue}`;
    if (INTERNAL_SECRET)
      fetchHeaders['X-Internal-Secret'] = INTERNAL_SECRET;

    // Forward CSRF token so backend double-submit check passes when no Bearer token
    const csrfToken = request.cookies.get('csrf_token')?.value;
    if (csrfToken) {
      fetchHeaders['X-CSRF-Token'] = csrfToken;
      cookieParts.push(`csrf_token=${encodeURIComponent(csrfToken)}`);
    }

    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const tokens = extractDashboardSessionCookies(res.headers);
    if (!tokens) return null;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessMaxAge: tokens.accessMaxAgeSeconds,
      refreshMaxAge: tokens.refreshMaxAgeSeconds,
    };
  } catch {
    return null;
  }
}

/**
 * Double-submit cookie CSRF protection.
 * Generates a random token, sets it as a cookie, and validates
 * the X-CSRF-Token header against the cookie on mutation requests.
 */
function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set('csrf_token', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: false, // Client JS must read the token to send in header
    path: '/',
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate CSP nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestId = crypto.randomUUID();

  // CSRF validation runs BEFORE auth redirect logic
  // Only validate CSRF on API routes (page routes don't need it)
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const isCspReportRoute = pathname === '/api/csp-report';
  const requestMethod = request.method.toUpperCase();
  const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod);

  // CSRF validation for mutation API requests (excluding auth routes and CSP report route)
  // CSP report route is exempt because browsers send violation reports without custom headers
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

  // Read auth cookies
  const authToken = request.cookies.get('auth_token');
  const refreshToken = request.cookies.get('refresh_token');

  // Dashboard routes that require authentication — excludes '/' (landing page) because
  // page.tsx handles auth routing for the root URL to avoid middleware redirect loops.
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/guilds') || pathname.startsWith('/settings');

  // Proactive token refresh: when auth_token is expired/missing but refresh_token
  // is available, refresh tokens transparently before the page loads.
  // Only for page routes — API routes use client-side refresh via fetchWithRetry
  // to avoid concurrent rotation conflicts.
  let refreshedTokens: Awaited<ReturnType<typeof refreshTokensFromMiddleware>> = null;
  if (isDashboardRoute && !isApiRoute && refreshToken && tokenNeedsRefresh(authToken?.value)) {
    refreshedTokens = await refreshTokensFromMiddleware(
      refreshToken.value,
      authToken?.value,
      request
    );
  }

  // Build request headers — inject CSP nonce for pages, X-Request-ID for all routes,
  // and refreshed auth cookie if available
  const requestHeaders = new Headers(request.headers);
  if (!isApiRoute) {
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', buildCspHeader(nonce));
  }
  requestHeaders.set('X-Request-ID', requestId);
  if (refreshedTokens) {
    // Inject new auth_token into request cookies so downstream route handlers see it
    const existingCookies = requestHeaders.get('cookie') || '';
    requestHeaders.set(
      'cookie',
      existingCookies + `; auth_token=${encodeURIComponent(refreshedTokens.accessToken)}`
    );
  }

  // Create response with (potentially modified) request headers
  // Always pass requestHeaders since X-Request-ID is now always set
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Set refreshed tokens as browser cookies
  if (refreshedTokens) {
    response.cookies.set('auth_token', refreshedTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshedTokens.accessMaxAge,
      path: '/',
    });
    response.cookies.set('refresh_token', refreshedTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshedTokens.refreshMaxAge,
      path: '/',
    });
  }

  // Always set a fresh CSRF token cookie
  setCsrfCookie(response, crypto.randomUUID());

  const hasSessionCookie = Boolean(authToken || refreshToken || refreshedTokens);
  const isLoginRoute = pathname === '/login';
  const isAuthPageRoute = pathname.startsWith('/auth/');

  // Allow access to /auth/* routes without authentication (e.g., /auth/unverified-email, /auth/callback)
  if (isAuthPageRoute) {
    // Apply security headers before returning
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    response.headers.set('X-Request-ID', requestId);
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return response;
  }

  if (isDashboardRoute && !hasSessionCookie) {
    const landingUrl = new URL('/', request.url);
    if (pathname !== '/') {
      landingUrl.searchParams.set('returnTo', pathname);
    }
    const redirectResponse = NextResponse.redirect(landingUrl);
    // Apply security headers + X-Request-ID + HSTS to redirect
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      redirectResponse.headers.set(key, value);
    }
    redirectResponse.headers.set('X-Request-ID', requestId);
    if (process.env.NODE_ENV === 'production') {
      redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return redirectResponse;
  }

  // Redirect authenticated users from /login to dashboard
  if (isLoginRoute && (authToken || refreshedTokens)) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    // Apply security headers to redirect
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      redirectResponse.headers.set(key, value);
    }
    redirectResponse.headers.set('X-Request-ID', requestId);
    if (process.env.NODE_ENV === 'production') {
      redirectResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return redirectResponse;
  }

  // Apply security headers to the response
  // CSP is only applied to page routes (not API routes - JSON doesn't need CSP)
  if (!isApiRoute) {
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
  } else {
    // For API routes, apply non-CSP security headers only
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      if (key !== 'Content-Security-Policy') {
        response.headers.set(key, value);
      }
    }
  }

  // Cache-Control: no-store for authenticated page responses
  if (!isApiRoute && hasSessionCookie) {
    response.headers.set('Cache-Control', 'no-store');
  }

  // Set X-Request-ID on all responses
  response.headers.set('X-Request-ID', requestId);

  // HSTS: only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!legal|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
