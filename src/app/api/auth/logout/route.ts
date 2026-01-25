import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear auth_token cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
