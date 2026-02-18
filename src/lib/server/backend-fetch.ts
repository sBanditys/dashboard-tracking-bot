import http from 'node:http';
import https from 'node:https';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Fetch wrapper for backend API calls that automatically includes
 * the X-Internal-Secret header for SSR rate-limiting bypass.
 *
 * Uses Node.js native http module to bypass Next.js fetch patching
 * which was causing certain routes to fail with "Missing API key".
 */
export async function backendFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const parsed = new URL(url);
  const method = init?.method?.toUpperCase() || 'GET';

  // Build headers from init + internal secret
  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((value, key) => { headers[key] = value; });
  }
  if (INTERNAL_SECRET) {
    headers['x-internal-secret'] = INTERNAL_SECRET;
  }

  const isHttps = parsed.protocol === 'https:';
  const transport = isHttps ? https : http;

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          resolve(new Response(body, {
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? '',
            headers: Object.fromEntries(
              Object.entries(res.headers)
                .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
            ),
          }));
        });
        res.on('error', reject);
      }
    );

    req.on('error', reject);

    if (init?.body) {
      req.write(init.body);
    }
    req.end();
  });
}
