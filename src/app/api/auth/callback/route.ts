import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiClient } from '@/lib/api-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const callbackUrl = searchParams.get('state') || '/';

  if (!code) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Exchange code for JWT token
    const response = await apiClient.post<{ token: string }>(
      '/auth/discord/callback',
      { code }
    );

    if (response.error || !response.data) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'callback_failed');
      return NextResponse.redirect(loginUrl);
    }

    // Set auth_token as HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', response.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Redirect to callback URL or dashboard
    const redirectUrl = new URL(callbackUrl, request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(loginUrl);
  }
}
