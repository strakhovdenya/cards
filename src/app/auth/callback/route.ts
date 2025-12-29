import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const hasSafeNext = next && next.startsWith('/') && !next.startsWith('//');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore,
    });
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectPath = hasSafeNext ? next : '/';
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
