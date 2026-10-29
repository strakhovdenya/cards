import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

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

export type AuthMode = 'read' | 'write';

interface AuthOptions {
  mode?: AuthMode;
}

// Отказ в доступе: сообщение 'Unauthorized' сохраняется для обработчиков,
// которые различают отказ по тексту ошибки
export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? 'Unauthorized' : 'Forbidden');
    this.name = 'AuthError';
    this.status = status;
  }
}

const verifyUser = async (supabase: ReturnType<typeof createRouteClient>) => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) console.error('Error verifying user:', error);
    return error ? null : user;
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
};

/**
 * Пользователь для API routes. Личность подтверждает сервер Supabase Auth
 * (`getUser()`), а не cookie сессии. Режим `write` дополнительно отказывает
 * демо-аккаунту: его данные общие для всех гостей `/demo`.
 */
export async function getAuthenticatedUser({
  mode = 'read',
}: AuthOptions = {}) {
  const cookieStore = await cookies();
  const supabase = createRouteClient(cookieStore);
  const user = await verifyUser(supabase);

  if (!user) throw new AuthError(401);

  const demoUserId = process.env.DEMO_USER_ID;
  if (mode === 'write' && demoUserId && user.id === demoUserId) {
    throw new AuthError(403);
  }

  return { user, supabase };
}

// Единое преобразование отказа в ответ; null — ошибка не про доступ
export function authErrorResponse(error: unknown) {
  if (!(error instanceof AuthError)) return null;
  return NextResponse.json<ApiResponse<null>>(
    { error: error.message },
    { status: error.status }
  );
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
