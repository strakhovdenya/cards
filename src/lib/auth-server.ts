import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

type NextCookieStore = Awaited<ReturnType<typeof cookies>>;

/**
 * Единая точка создания route-handler клиента Supabase.
 *
 * `@supabase/auth-helpers-nextjs@0.10.0` объявляет аксессор как
 * `cookies: () => ReturnType<typeof cookies>`, а в Next 16 это
 * `Promise<ReadonlyRequestCookies>`. При этом рантайм библиотеки вызывает
 * аксессор синхронно (`this.context.cookies().get(name)`), то есть передать
 * туда сам `cookies` — пройти проверку типов и сломаться в рантайме.
 * Единственное корректное значение — уже разрезолвленное хранилище; приведение
 * типа ниже закрывает устаревшую типизацию библиотеки, не меняя поведения.
 *
 * Настоящее решение — миграция на `@supabase/ssr` (см. issue #2).
 */
export function createRouteClient(cookieStore: NextCookieStore) {
  return createRouteHandlerClient({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  });
}

// Helper для получения аутентифицированного пользователя в API routes
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const supabase = createRouteClient(cookieStore);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    // Отличаем сбой запроса к Supabase от штатного «сессии нет»
    console.error('Error getting session:', error);
  }

  if (error || !session?.user) {
    throw new Error('Unauthorized');
  }

  return {
    user: session.user,
    supabase,
  };
}

// Helper для получения Supabase клиента с аутентификацией
export async function getAuthenticatedSupabase() {
  const { supabase } = await getAuthenticatedUser();
  return supabase;
}

// Helper для получения Supabase клиента без аутентификации (для публичных данных)
export function getPublicSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}
