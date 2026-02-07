import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type RouteParams = { params: Promise<{ guildId: string; itemId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { guildId, itemId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/trash/${itemId}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { guildId, itemId } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const queryString = url.search
    const response = await fetch(`${API_URL}/api/v1/guilds/${guildId}/trash/${itemId}${queryString}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Failed to permanently delete item' }, { status: 500 })
  }
}
