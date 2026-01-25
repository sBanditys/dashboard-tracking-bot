import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Backend redirects here with tokens already exchanged
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const expiresIn = searchParams.get('expires_in');
  const error = searchParams.get('error');

  // Handle OAuth errors from backend
  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', error);
    return NextResponse.redirect(loginUrl);
  }

  if (!accessToken || !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const cookieStore = await cookies();

    // Store access token as HttpOnly cookie
    cookieStore.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn ? parseInt(expiresIn) : 60 * 15, // Use expires_in or default 15 min
      path: '/',
    });

    // Store refresh token as HttpOnly cookie
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/', request.url));
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(loginUrl);
  }
}
