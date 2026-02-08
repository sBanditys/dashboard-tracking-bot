import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

type RouteParams = { params: Promise<{ guildId: string; itemId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, itemId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: unknown = undefined
    try {
      body = await request.json()
    } catch {
      // Restore endpoint does not require a body; ignore parse errors for empty bodies.
    }

    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/trash/${itemId}/restore`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json()
      : { error: 'Restore request failed', status: response.status }

    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 })
  }
}
