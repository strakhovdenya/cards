// DEL_RALPH: migrated to src/proxy.ts (Next.js 16 uses proxy.ts, not middleware.ts)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

// 60 requests per minute per IP for public guest API endpoints
const GUEST_API_LIMIT = 60;
const GUEST_API_WINDOW_MS = 60_000;

// 20 requests per 5 minutes per IP for auth page routes.
// Note: actual Supabase auth API calls (signIn/signUp) go browser → Supabase directly
// and are covered by Supabase Auth built-in rate limiting, not this middleware.
const AUTH_LIMIT = 20;
const AUTH_WINDOW_MS = 5 * 60_000;

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  const ip = getIp(request);

  // Rate-limit public guest API endpoints (used by /demo without authentication)
  if (pathname.startsWith('/api/') && searchParams.get('guest') === '1') {
    const result = checkRateLimit(
      `guest-api:${ip}`,
      GUEST_API_LIMIT,
      GUEST_API_WINDOW_MS
    );
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
            'X-RateLimit-Limit': String(GUEST_API_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // Rate-limit auth page routes to prevent automated page-load abuse
  if (pathname.startsWith('/auth')) {
    const result = checkRateLimit(`auth:${ip}`, AUTH_LIMIT, AUTH_WINDOW_MS);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
