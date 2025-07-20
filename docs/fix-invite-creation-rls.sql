-- Исправление RLS политики для создания приглашений

-- 1. Удаляем старые политики
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
DROP POLICY IF EXISTS "Admins can manage all invites" ON invites;
DROP POLICY IF EXISTS "Admins can view all invites" ON invites;

-- 2. Создаем правильную политику для создания приглашений
CREATE POLICY "Admins can create invites" ON invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 3. Создаем политику для просмотра приглашений администраторами
CREATE POLICY "Admins can view all invites" ON invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 4. Создаем политику для обновления приглашений (отметка как использованные)
CREATE POLICY "Admins can update invites" ON invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Проверяем текущего пользователя и его auth.uid()
SELECT 
  'Current user check:' as check_type,
  auth.uid() as current_user_id,
  auth.email() as current_email,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'OK - User authenticated'
    ELSE 'ERROR - User not authenticated'
  END as auth_status;

-- 6. Проверяем профиль текущего пользователя
SELECT 
  'Profile check for current user:' as check_type,
  p.email,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN 'OK - Admin role assigned'
    ELSE 'ERROR - Not admin'
  END as admin_check
FROM profiles p
WHERE p.id = auth.uid();

-- 7. Тестовый запрос для проверки RLS
SELECT 
  'RLS Test:' as test_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ) THEN 'OK - RLS should allow invite creation'
    ELSE 'ERROR - RLS will block invite creation'
  END as rls_check; 