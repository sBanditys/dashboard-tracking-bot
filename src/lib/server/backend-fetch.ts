import { randomUUID } from 'crypto';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/**
 * Fetch wrapper for backend API calls that automatically includes
 * the X-Internal-Secret header for SSR rate-limiting bypass.
 *
 * Auto-generates an Idempotency-Key header for mutation methods
 * (POST/PUT/DELETE/PATCH) to satisfy backend idempotency middleware.
 *
 * Auto-forwards auth_token cookie as Authorization: Bearer header in SSR
 * context when no Authorization header is explicitly set.
 *
 * Uses cache: 'no-store' to prevent Next.js from caching backend responses.
 */
export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Auto-forward auth_token cookie as Bearer token when in SSR context
  // and no Authorization header is already set (prevents double-injection).
  // Dynamic import with try/catch: next/headers is only available in server
  // context; the catch silently skips forwarding in any other context.
  if (!headers.has('Authorization')) {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Not in server context — skip cookie forwarding
    }
  }

  if (INTERNAL_SECRET) {
    headers.set('x-internal-secret', INTERNAL_SECRET);
  }

  const method = (init?.method || 'GET').toUpperCase();
  if (MUTATION_METHODS.has(method) && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', randomUUID());
  }

  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
