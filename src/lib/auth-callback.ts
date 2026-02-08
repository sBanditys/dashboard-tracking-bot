import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function redirectToLogin(request: NextRequest, error: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', error);
  return NextResponse.redirect(loginUrl);
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeTokenResponse(data: unknown): TokenResponse | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const tokens = data as Partial<TokenResponse>;
  if (!tokens.access_token || !tokens.refresh_token) {
    return null;
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: parsePositiveInt(tokens.expires_in, 60 * 15),
  };
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse | null> {
  const response = await fetch(`${API_URL}/api/v1/auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
    },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return null;
  }

  return normalizeTokenResponse(data);
}

export async function handleAuthCallback(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const error = searchParams.get('error');
  if (error) {
    return redirectToLogin(request, error);
  }

  const exchangeCode = searchParams.get('code');
  const legacyTokenPayload = normalizeTokenResponse({
    access_token: searchParams.get('access_token') ?? undefined,
    refresh_token: searchParams.get('refresh_token') ?? undefined,
    expires_in: searchParams.get('expires_in') ?? undefined,
  });

  let tokens = legacyTokenPayload;

  if (!tokens && exchangeCode) {
    try {
      tokens = await exchangeCodeForTokens(exchangeCode);
    } catch {
      return redirectToLogin(request, 'server_error');
    }
  }

  if (!tokens) {
    return redirectToLogin(request, 'callback_failed');
  }

  const cookieStore = await cookies();

  cookieStore.set('auth_token', tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: tokens.expires_in,
    path: '/',
  });

  cookieStore.set('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return NextResponse.redirect(new URL('/', request.url));
}
