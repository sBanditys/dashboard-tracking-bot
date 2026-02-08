import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function GET(_request: NextRequest) {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/guilds`, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...(process.env.API_KEY && { 'X-API-Key': process.env.API_KEY }),
            },
        })

        const data = await response.json()
        return NextResponse.json(data, { status: response.status })
    } catch {
        return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 })
    }
}
