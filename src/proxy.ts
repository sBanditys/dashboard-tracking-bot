import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCspHeader, getSecurityHeaders } from '@/lib/server/security-headers';

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

export function proxy(request: NextRequest) {
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

  // Create response - will be modified with headers at the end
  let response: NextResponse;

  // For page loads (non-API routes), inject nonce and CSP via request headers.
  // Next.js parses the CSP request header to extract the nonce and automatically
  // applies it to all framework scripts and inline scripts it generates.
  if (!isApiRoute) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('Content-Security-Policy', buildCspHeader(nonce));
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }

  // Always set a fresh CSRF token cookie
  setCsrfCookie(response, crypto.randomUUID());

  // Existing auth redirect logic
  const authToken = request.cookies.get('auth_token');
  const refreshToken = request.cookies.get('refresh_token');
  const hasSessionCookie = Boolean(authToken || refreshToken);

  // Protected routes under /(dashboard) - redirect to login if no session cookie.
  // We allow refresh_token-only sessions so client refresh flow can renew auth_token.
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/' || pathname.startsWith('/guilds') || pathname.startsWith('/settings');
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
  if (isLoginRoute && authToken) {
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
