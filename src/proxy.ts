import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Invite, SupabaseResponse } from '@/types';
import { checkRateLimit } from '@/lib/rate-limit';

// 60 requests per minute per IP for public guest API endpoints
const GUEST_API_LIMIT = 60;
const GUEST_API_WINDOW_MS = 60_000;

// 20 requests per 5 minutes per IP for auth page routes.
// Actual Supabase auth API calls (signIn/signUp) go browser → Supabase directly
// and are covered by Supabase Auth built-in rate limiting.
const AUTH_LIMIT = 20;
const AUTH_WINDOW_MS = 5 * 60_000;

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'
  );
}

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const ip = getIp(req);

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

  const res = NextResponse.next();

  // Создаем Supabase клиент
  const supabase = createMiddlewareClient({
    req,
    res,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Проверяем аутентификацию для защищенных маршрутов
  if (req.nextUrl.pathname === '/' && !session) {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  // Если пользователь аутентифицирован и пытается попасть на страницы авторизации
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isResetPasswordRoute = req.nextUrl.pathname === '/auth/reset-password';
  const isAuthCallbackRoute = req.nextUrl.pathname === '/auth/callback';

  if (session && isAuthRoute && !isResetPasswordRoute && !isAuthCallbackRoute) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Проверяем блокировку регистрации для /auth/signup
  if (req.nextUrl.pathname === '/auth/signup') {
    try {
      // Проверяем, есть ли уже админы
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (!error && admins && admins.length > 0) {
        // Если есть админы, проверяем наличие валидного инвайт-кода
        const inviteCode = req.nextUrl.searchParams.get('invite');

        if (!inviteCode) {
          // Перенаправляем на страницу входа, если нет инвайт-кода
          return NextResponse.redirect(new URL('/auth?blocked=true', req.url));
        }

        // Проверяем валидность инвайт-кода
        const inviteResult = (await supabase
          .from('invites')
          .select('*')
          .eq('invite_code', inviteCode)
          .eq('used', false)
          .single()) as SupabaseResponse<Invite>;

        const invite = inviteResult.data;
        const inviteError = inviteResult.error;

        if (
          inviteError ||
          !invite ||
          new Date(invite.expires_at) < new Date()
        ) {
          // Перенаправляем на страницу входа, если инвайт-код недействителен
          return NextResponse.redirect(new URL('/auth?invalid=true', req.url));
        }
      }
    } catch (error) {
      console.error('Proxy error:', error);
      // В случае ошибки разрешаем доступ
    }
  }

  return res;
}

export const config = {
  matcher: ['/', '/api/:path*', '/auth/:path*'],
};
