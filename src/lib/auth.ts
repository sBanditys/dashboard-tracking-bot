import { cookies } from 'next/headers';
import { Session } from '@/types/user';

/**
 * Get the current session from the auth_token cookie
 * Returns null if no valid session exists
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');

  if (!token) {
    return null;
  }

  // Parse JWT payload to get user info and expiry
  try {
    const payload = JSON.parse(
      Buffer.from(token.value.split('.')[1], 'base64').toString()
    );

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      user: payload.user,
      token: token.value,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  } catch (error) {
    // Invalid token format
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function verifyAuth(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
