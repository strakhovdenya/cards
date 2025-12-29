import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Invite, SupabaseResponse } from '@/types';

export async function middleware(req: NextRequest) {
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
      console.error('Middleware error:', error);
      // В случае ошибки разрешаем доступ
    }
  }

  return res;
}

export const config = {
  matcher: ['/', '/auth/:path*'],
};
