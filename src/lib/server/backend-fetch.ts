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
 * Uses cache: 'no-store' to prevent Next.js from caching backend responses.
 */
export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
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
