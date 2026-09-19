import type { NextConfig } from 'next';

// Where the Express API lives: the local dev server, 127.0.0.1:5000 when both apps share a
// server, or the API's HTTPS URL when the web app runs on Vercel.
const API_URL = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@lp/shared'],
  // swagger-ui lives at /api/docs/ (with the slash); Next's slash-stripping redirect
  // would bounce against Express's slash-adding redirect forever.
  skipTrailingSlashRedirect: true,
  // The advisor used to be student-only at this path; it is public now.
  async redirects() {
    return [{ source: '/student/recommend', destination: '/advisor', permanent: false }];
  },
  // The browser only ever talks to this origin. /api/* is proxied to Express, so the auth
  // cookie is first-party and sameSite=lax works without any CORS setup.
  async rewrites() {
    return [
      // Path params drop the trailing slash, which swagger-ui needs for its relative assets.
      { source: '/api/docs/', destination: `${API_URL}/api/docs/` },
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
