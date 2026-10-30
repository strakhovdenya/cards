import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ADMIN_EMAIL, ROLE_ADMIN, ROLE_USER } from '@/constants/userRoles';
import type { SupabaseResponse, SupabaseListResponse } from '@/types';

let _supabase: ReturnType<typeof createClientComponentClient> | null = null;

function getSupabase() {
  _supabase ??= createClientComponentClient();
  return _supabase;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  inviteCode?: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  email: string | null;
  invite_code: string;
  invited_by: string;
  used: boolean;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

// Локальные типы для запросов
interface ProfileRole {
  role: 'admin' | 'user';
}

async function isInviteCodeValid(code: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('invite_code_is_valid', {
    code,
  });

  if (error) {
    console.error('Error validating invite code:', error);
    return false;
  }

  return data === true;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { data, error: null };
}

export async function signUpWithEmail(signUpData: SignUpData) {
  const { email, password, firstName, lastName, inviteCode } = signUpData;

  // Проверяем, является ли это главным админом
  const isMainAdmin = email === ADMIN_EMAIL;

  // Если это не главный админ, проверяем инвайт-код
  if (!isMainAdmin) {
    if (!inviteCode) {
      throw new Error('Требуется код приглашения для регистрации');
    }

    const isValid = await isInviteCodeValid(inviteCode);

    if (!isValid) {
      throw new Error('Неверный или использованный код приглашения');
    }
  }

  // Регистрируем пользователя
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      // invite_code читает триггер проверки приглашения в БД и сам его удаляет
      data: {
        first_name: firstName,
        last_name: lastName,
        ...(!isMainAdmin && inviteCode ? { invite_code: inviteCode } : {}),
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Профиль и отметка «приглашение использовано» — на стороне БД (триггеры)
  return { data, error: null };
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  return { error: null };
}

export async function requestPasswordReset(email: string) {
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?next=/auth/reset-password`
      : undefined;

  const resetOptions = redirectTo ? { redirectTo } : undefined;
  const { error } = await getSupabase().auth.resetPasswordForEmail(
    email,
    resetOptions
  );

  if (error) {
    throw new Error(error.message);
  }

  return { error: null };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await getSupabase().auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { data, error: null };
}

export async function getCurrentUser() {
  try {
    const userResult = await getSupabase().auth.getUser();
    const user = userResult.data?.user;
    const error = userResult.error;

    if (error) {
      throw new Error(`Authentication error: ${error.message}`);
    }

    if (!user) {
      return { user: null, profile: null };
    }

    // Попытаемся получить профиль пользователя
    try {
      const profileResult = (await getSupabase()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()) as SupabaseResponse<Profile>;

      const profile: Profile | null = profileResult.data;
      const profileError = profileResult.error;

      if (profileError) {
        // Если таблица profiles не существует или RLS блокирует доступ, создаем временный профиль
        if (
          profileError.code === 'PGRST301' ||
          profileError.code === '42P01' ||
          profileError.message.includes('permission denied')
        ) {
          console.warn(
            'Profiles table not accessible, using temporary profile from user metadata'
          );
          const tempProfile: Profile = {
            id: user.id,
            email: user.email ?? '',
            first_name:
              (user.user_metadata as { first_name?: string })?.first_name ?? '',
            last_name:
              (user.user_metadata as { last_name?: string })?.last_name ?? '',
            role: user.email === ADMIN_EMAIL ? ROLE_ADMIN : ROLE_USER,
            created_at: user.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return { user, profile: tempProfile };
        }

        console.error('Error fetching profile:', profileError);
        return { user, profile: null };
      }

      return { user, profile };
    } catch (profileFetchError) {
      console.warn(
        'Profile fetch failed, using user metadata:',
        profileFetchError
      );
      // Fallback: создаем профиль из метаданных пользователя
      const tempProfile: Profile = {
        id: user.id,
        email: user.email ?? '',
        first_name:
          (user.user_metadata as { first_name?: string })?.first_name ?? '',
        last_name:
          (user.user_metadata as { last_name?: string })?.last_name ?? '',
        role: user.email === ADMIN_EMAIL ? ROLE_ADMIN : ROLE_USER,
        created_at: user.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { user, profile: tempProfile };
    }
  } catch (authError) {
    console.error('Authentication check failed:', authError);
    throw authError;
  }
}

export async function createInvite(email: string, invitedBy: string) {
  // Генерируем уникальный код приглашения
  const inviteCode =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  const inviteResult = (await getSupabase()
    .from('invites')
    .insert([
      {
        email: email,
        invite_code: inviteCode,
        invited_by: invitedBy,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 дней
      },
    ])
    .select()
    .single()) as SupabaseResponse<Invite>;

  const data: Invite | null = inviteResult.data;
  const error = inviteResult.error;

  if (error) {
    throw new Error(error.message);
  }

  return { data, error: null };
}

export async function getInvites(userId: string) {
  const invitesResult = (await getSupabase()
    .from('invites')
    .select('*')
    .eq('invited_by', userId)
    .order('created_at', { ascending: false })) as SupabaseListResponse<Invite>;

  const data: Invite[] | null = invitesResult.data;
  const error = invitesResult.error;

  if (error) {
    throw new Error(error.message);
  }

  return { data, error: null };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profileResult = (await getSupabase()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()) as SupabaseResponse<ProfileRole>;

  const profile: ProfileRole | null = profileResult.data;
  const error = profileResult.error;

  if (error || !profile) {
    return false;
  }

  return profile.role === ROLE_ADMIN;
}

export async function checkIfAdminsExist(): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().rpc('admins_exist');

    if (error) {
      console.error('Error checking for admins:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking for admins:', error);
    return false;
  }
}

export async function validateInviteCode(code: string): Promise<boolean> {
  try {
    return await isInviteCodeValid(code);
  } catch (error) {
    console.error('Error validating invite code:', error);
    return false;
  }
}
