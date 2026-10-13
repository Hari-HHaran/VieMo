import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  /* The saved TMDB snapshot is read from disk at runtime; ship it with every server route. */
  outputFileTracingIncludes: { '/**': ['./data/tmdb-snapshot.json'] },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    }];
  },
};

export default nextConfig;
