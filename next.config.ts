import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Next.js App Router RSC bootstrap uses inline scripts (self.__next_f.push(...))
const scriptSrc = `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`;

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  // Emotion injects inline <style> tags for MUI theming
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  // Wildcard, not the literal project URL (not available in a clean clone without .env)
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig: NextConfig = {
  headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
