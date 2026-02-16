import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
                pathname: '/avatars/**',
            },
        ],
    },
    async headers() {
        return [
            {
                // Apply security headers to all routes
                // CSP is NOT set here (requires per-request nonce from middleware)
                // These headers provide defense-in-depth for static assets and edge cases
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
                ],
            },
        ];
    },
};

export default withBundleAnalyzer(nextConfig);
