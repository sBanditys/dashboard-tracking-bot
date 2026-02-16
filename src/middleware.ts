import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token');
  const refreshToken = request.cookies.get('refresh_token');
  const hasSessionCookie = Boolean(authToken || refreshToken);

  // Protected routes under /(dashboard) - redirect to login if no session cookie.
  // We allow refresh_token-only sessions so client refresh flow can renew auth_token.
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/' || pathname.startsWith('/guilds') || pathname.startsWith('/settings');
  const isLoginRoute = pathname === '/login';
  const isAuthRoute = pathname.startsWith('/auth/');

  // Allow access to /auth/* routes without authentication (e.g., /auth/unverified-email, /auth/callback)
  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (isDashboardRoute && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    // Store callback URL for post-login redirect
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from /login to dashboard
  if (isLoginRoute && authToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - legal routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - images and other static assets
     */
    '/((?!api|legal|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
