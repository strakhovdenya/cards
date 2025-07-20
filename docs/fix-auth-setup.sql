-- Комплексный скрипт исправления настройки аутентификации
-- Выполните этот скрипт если есть проблемы с аутентификацией

-- 1. Проверка и создание таблиц
DO $$
BEGIN
    -- Проверяем существование таблицы profiles
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Таблица profiles создана';
    END IF;

    -- Проверяем существование таблицы invites
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invites') THEN
        CREATE TABLE invites (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email TEXT NOT NULL,
            invite_code TEXT NOT NULL UNIQUE,
            invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            used BOOLEAN DEFAULT FALSE,
            used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            used_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Таблица invites создана';
    END IF;
END $$;

-- 2. Обновление существующих таблиц
ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Создание функций
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

  -- Создаем профиль пользователя с обработкой ошибок
  BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      user_role
    );
  EXCEPTION WHEN unique_violation THEN
    -- Профиль уже существует, обновляем роль если это админ
    IF user_role = 'admin' THEN
      UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Создание триггеров
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Создание индексов
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_invites_used ON invites(used);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- 6. Настройка RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- 7. Удаление старых политик
DROP POLICY IF EXISTS "Users can view own cards" ON cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON cards;
DROP POLICY IF EXISTS "Users can update own cards" ON cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON cards;
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all invites" ON invites;
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON invites;

-- 8. Создание новых политик
-- Политики для карточек
CREATE POLICY "Users can view own cards" ON cards
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON cards
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON cards
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для тегов
CREATE POLICY "Users can view own tags" ON tags
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для связей карточек и тегов
CREATE POLICY "Users can view own card_tags" ON card_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM cards WHERE cards.id = card_tags.card_id AND cards.user_id = auth.uid())
    );
CREATE POLICY "Users can insert own card_tags" ON card_tags
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM cards WHERE cards.id = card_tags.card_id AND cards.user_id = auth.uid())
    );
CREATE POLICY "Users can delete own card_tags" ON card_tags
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM cards WHERE cards.id = card_tags.card_id AND cards.user_id = auth.uid())
    );

-- Политики для профилей
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Политики для приглашений
CREATE POLICY "Admins can view all invites" ON invites
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
CREATE POLICY "Admins can create invites" ON invites
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
CREATE POLICY "Users can view invites sent to them" ON invites
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- 9. Установка админа
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'strakhov.denya@gmail.com';
  
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
    RAISE NOTICE 'Профиль админа обновлен';
  END IF;
END $$;

-- 10. Проверка настройки
DO $$
BEGIN
    RAISE NOTICE 'Настройка аутентификации завершена!';
    RAISE NOTICE 'Проверьте:';
    RAISE NOTICE '1. Таблицы созданы: profiles, invites';
    RAISE NOTICE '2. RLS включен на всех таблицах';
    RAISE NOTICE '3. Политики созданы';
    RAISE NOTICE '4. Триггеры настроены';
    RAISE NOTICE '5. Индексы созданы';
END $$; 