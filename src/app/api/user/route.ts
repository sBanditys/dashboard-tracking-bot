import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types/user';

export async function GET() {
  try {
    // Read auth_token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Forward to backend API with Authorization header
    const response = await apiClient.get<User>('/api/v1/auth/me', authToken.value);

    if (response.error || !response.data) {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch user' },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(response.data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
