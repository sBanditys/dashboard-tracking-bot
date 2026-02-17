import { backendFetch } from '@/lib/server/backend-fetch'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = BACKEND_API_URL;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (authToken) {
      await backendFetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...(refreshToken && { refresh_token: refreshToken }),
        }),
      }).catch(() => undefined);
    }

    cookieStore.delete('auth_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
