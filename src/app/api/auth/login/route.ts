import { NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

export async function GET() {
  try {
    // Call backend API to get Discord OAuth URL
    const response = await apiClient.get<{ url: string }>('/auth/discord/login');

    if (response.error || !response.data) {
      return NextResponse.json(
        { error: response.error || 'Failed to get OAuth URL' },
        { status: response.status || 500 }
      );
    }

    // Return OAuth URL to client - let client handle redirect
    return NextResponse.json({ url: response.data.url });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
