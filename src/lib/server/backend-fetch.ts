const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Fetch wrapper for backend API calls that automatically includes
 * the X-Internal-Secret header for SSR rate-limiting bypass.
 */
export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (INTERNAL_SECRET) {
    headers.set('X-Internal-Secret', INTERNAL_SECRET);
  }
  return fetch(input, { ...init, headers });
}
