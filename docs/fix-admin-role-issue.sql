-- Исправление проблемы с админскими правами для создания приглашений
-- Проблема: пользователь strakhov.denya@gmail.com не может создавать приглашения

-- 1. Проверяем текущий профиль пользователя
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.created_at
FROM profiles p
WHERE p.email = 'strakhov.denya@gmail.com';

-- 2. Если профиль существует, но роль не admin - исправляем
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'strakhov.denya@gmail.com';

-- 3. Если профиля нет - создаем вручную
-- (замените USER_ID на реальный ID пользователя из auth.users)
INSERT INTO profiles (id, email, first_name, last_name, role)
SELECT 
  au.id,
  'strakhov.denya@gmail.com',
  'Denya',
  'Strakhov',
  'admin'
FROM auth.users au
WHERE au.email = 'strakhov.denya@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 4. Проверяем RLS политику для создания приглашений
-- Эта политика должна разрешать админам создавать приглашения
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
CREATE POLICY "Admins can create invites" ON invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. Проверяем обновленную политику для всех операций с приглашениями
DROP POLICY IF EXISTS "Admins can manage all invites" ON invites;
CREATE POLICY "Admins can manage all invites" ON invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Итоговая проверка
SELECT 
  'Profile check:' as check_type,
  p.email,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN 'OK - Admin role assigned'
    ELSE 'ERROR - Not admin'
  END as status
FROM profiles p
WHERE p.email = 'strakhov.denya@gmail.com'

UNION ALL

SELECT 
  'User exists check:' as check_type,
  au.email,
  'N/A' as role,
  CASE 
    WHEN au.email IS NOT NULL THEN 'OK - User exists in auth'
    ELSE 'ERROR - User not found'
  END as status
FROM auth.users au
WHERE au.email = 'strakhov.denya@gmail.com'; 