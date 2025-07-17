import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// Helper для получения аутентифицированного пользователя в API routes
export async function getAuthenticatedUser() {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

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
