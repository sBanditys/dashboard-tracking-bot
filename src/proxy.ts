import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCspHeader, getSecurityHeaders } from '@/lib/server/security-headers';
import { extractDashboardSessionCookies } from '@/lib/server/dashboard-session-cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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

    // Forward browser User-Agent and IP for backend context binding
    const ua = request.headers.get('user-agent');
    if (ua) fetchHeaders['User-Agent'] = ua;
    const forwardedFor =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    if (forwardedFor) fetchHeaders['X-Forwarded-For'] = forwardedFor;
    if (accessTokenValue)
      fetchHeaders.Authorization = `Bearer ${accessTokenValue}`;
    if (INTERNAL_SECRET)
      fetchHeaders['X-Internal-Secret'] = INTERNAL_SECRET;

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
  response.cookies.set('_csrf_token', token, {
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

  // CSRF validation runs BEFORE auth redirect logic
  // Only validate CSRF on API routes (page routes don't need it)
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const requestMethod = request.method.toUpperCase();
  const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod);

  // CSRF validation for mutation API requests (excluding auth routes)
  if (isApiRoute && !isAuthRoute && isMutationMethod) {
    const cookieToken = request.cookies.get('_csrf_token')?.value;
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

  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/' || pathname.startsWith('/guilds') || pathname.startsWith('/settings');

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

  // Build request headers — inject CSP nonce for pages, and refreshed auth cookie if available
  const requestHeaders = new Headers(request.headers);
  if (!isApiRoute) {
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', buildCspHeader(nonce));
  }
  if (refreshedTokens) {
    // Inject new auth_token into request cookies so downstream route handlers see it
    const existingCookies = requestHeaders.get('cookie') || '';
    requestHeaders.set(
      'cookie',
      existingCookies + `; auth_token=${encodeURIComponent(refreshedTokens.accessToken)}`
    );
  }

  // Create response with (potentially modified) request headers
  let response: NextResponse;
  if (!isApiRoute || refreshedTokens) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }

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
    return response;
  }

  if (isDashboardRoute && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Store callback URL for post-login redirect
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Apply security headers to redirect (but no CSP for redirects - they don't render content)
    const securityHeaders = getSecurityHeaders(nonce);
    for (const [key, value] of Object.entries(securityHeaders)) {
      redirectResponse.headers.set(key, value);
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

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - legal routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - images and other static assets
     */
    '/((?!legal|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
