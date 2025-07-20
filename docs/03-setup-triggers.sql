-- Миграция 3: Настройка триггеров для автоматического создания профилей
-- Выполните после 02-setup-policies.sql

-- Функция для создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Проверяем, является ли это главным админом
  IF NEW.email = 'strakhov.denya@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  -- Создаем профиль пользователя
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    user_role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Установка админа (если он уже существует)
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Найти пользователя с email админа
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'strakhov.denya@gmail.com';
  
  -- Если админ существует, обновляем его профиль
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
      admin_user_id,
      'strakhov.denya@gmail.com',
      'Admin',
      'User',
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      updated_at = NOW();
  END IF;
END $$; 