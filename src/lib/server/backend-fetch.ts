const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Fetch wrapper for backend API calls that automatically includes
 * the X-Internal-Secret header for SSR rate-limiting bypass.
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

  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
