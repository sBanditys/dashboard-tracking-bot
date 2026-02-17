import { backendFetch } from '@/lib/server/backend-fetch';
import { BACKEND_API_URL } from '@/lib/server/api-url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = BACKEND_API_URL;

/**
 * POST /api/auth/logout-all
 *
 * Revokes all sessions for the current user (logout from all devices).
 * Clears auth_token and refresh_token cookies on success.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Forward POST request to backend
    const response = await backendFetch(`${API_URL}/api/v1/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to logout from all devices' }));
      return NextResponse.json(error, { status: response.status });
    }

    // On success, clear auth cookies
    cookieStore.delete('auth_token');
    cookieStore.delete('refresh_token');

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Logout all error:', error);
    return NextResponse.json(
      { error: 'Failed to logout from all devices' },
      { status: 500 }
    );
  }
}
