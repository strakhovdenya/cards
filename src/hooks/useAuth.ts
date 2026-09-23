'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, signOut, isAdmin, type Profile } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const router = useRouter();

  const loadUserAndProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCurrentUser();
      const currentUser = result.user;
      const currentProfile = result.profile;

      if (!currentUser) {
        router.push('/auth');
        return;
      }

      setUser(currentUser);
      setProfile(currentProfile);

      // Проверяем права админа
      if (currentProfile) {
        const adminStatus = await isAdmin(currentUser.id);
        setIsUserAdmin(adminStatus || currentProfile.role === 'admin');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setError(
        error instanceof Error ? error.message : 'Ошибка загрузки пользователя'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка выхода');
    }
  };

  // Загрузка пользователя при инициализации
  useEffect(() => {
    void loadUserAndProfile();
  }, [loadUserAndProfile]);

  return {
    user,
    profile,
    isUserAdmin,
    loading,
    error,
    setError,
    handleSignOut,
  };
}
