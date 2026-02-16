import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CsrfError, createCsrfProtect } from '@edge-csrf/nextjs';
import { getSecurityHeaders } from '@/lib/server/security-headers';

// Initialize CSRF protection with double-submit cookie pattern
const csrfProtect = createCsrfProtect({
  cookie: {
    name: '_csrf_token',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: false, // Client JS must read the token to send in header
  },
  token: {
    responseHeader: 'X-CSRF-Token',
  },
  // Exclude auth routes from CSRF validation (OAuth flow)
  excludePathPrefixes: ['/api/auth/', '/_next/'],
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate CSP nonce for this request
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // CSRF validation runs BEFORE auth redirect logic
  // Only validate CSRF on API routes (page routes don't need it)
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/api/auth/');
  const requestMethod = request.method.toUpperCase();
  const isMutationMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod);

  // Create response - will be modified with headers at the end
  let response: NextResponse;

  // For page loads (non-API routes), inject nonce via request header for Next.js
  if (!isApiRoute) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }

  // CSRF validation for mutation API requests
  if (isApiRoute && !isAuthRoute && isMutationMethod) {
    try {
      await csrfProtect(request, response);
    } catch (err) {
      if (err instanceof CsrfError) {
        return NextResponse.json(
          { error: 'Invalid CSRF token', code: 'EBADCSRFTOKEN' },
          { status: 403 }
        );
      }
      throw err;
    }
  } else {
    // For non-mutation requests and page routes, just set the CSRF token cookie
    // This ensures the token is available before the first mutation
    try {
      await csrfProtect(request, response);
    } catch (err) {
      // Ignore CSRF errors for GET/HEAD/OPTIONS and page routes
      if (!(err instanceof CsrfError)) {
        throw err;
      }
    }
  }

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
