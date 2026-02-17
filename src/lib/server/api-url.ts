/**
 * Internal API URL for server-to-server communication.
 *
 * Uses BACKEND_INTERNAL_URL (e.g., http://localhost:3000) to bypass Nginx
 * and connect directly to the Express backend. This is critical because:
 *
 * 1. When Next.js calls the backend through the public URL, the request loops
 *    back through Nginx on the same VPS, and Nginx overwrites X-Forwarded-For
 *    with the VPS's own IP instead of the real client IP.
 *
 * 2. Direct localhost connections let the dashboard forward the real client IP
 *    via X-Forwarded-For, and the backend's trust proxy: 1 correctly resolves it.
 *
 * Falls back to NEXT_PUBLIC_API_URL for backward compatibility.
 */
export const BACKEND_API_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000'
