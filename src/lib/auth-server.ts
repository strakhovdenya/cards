import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Helper для получения аутентифицированного пользователя в API routes
export async function getAuthenticatedUser() {
  const supabase = createRouteHandlerClient({
    cookies: async () => await cookies(),
  });

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

// Helper для получения Supabase клиента без аутентификации (для публичных данных)
export function getPublicSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}
