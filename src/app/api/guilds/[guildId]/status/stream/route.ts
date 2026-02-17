import { backendFetch } from '@/lib/server/backend-fetch'
import { BACKEND_API_URL } from '@/lib/server/api-url'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_URL = BACKEND_API_URL

type RouteParams = { params: Promise<{ guildId: string }> }

export async function GET(request: Request, { params }: RouteParams) {
    const { guildId } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const response = await backendFetch(
            `${API_URL}/api/v1/guilds/${guildId}/status/stream`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'text/event-stream',
                },
            }
        )

        if (!response.ok) {
            return new Response('Backend error', { status: response.status })
        }

        // Proxy the SSE stream
        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        })
    } catch {
        return new Response('Failed to connect', { status: 502 })
    }
}
