-- Создание таблицы для карточек (обновленная с user_id)
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  german_word TEXT NOT NULL,
  translation TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы для тегов
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2196f3',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id) -- Уникальность названия тега на пользователя
);

-- Создание связующей таблицы для карточек и тегов
CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (card_id, tag_id)
);

-- Создание таблицы профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создание таблицы приглашений
CREATE TABLE IF NOT EXISTS invites (
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

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_learned ON cards(learned);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_invites_used ON invites(used);

-- Политики Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Сначала удаляем существующие политики
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
DROP POLICY IF EXISTS "Admins can view all invites" ON invites;
DROP POLICY IF EXISTS "Admins can create invites" ON invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON invites;
DROP POLICY IF EXISTS "Anonymous can validate invite codes" ON invites;

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

-- Новая политика: анонимные пользователи могут читать коды для валидации
CREATE POLICY "Anonymous can validate invite codes" ON invites
    FOR SELECT USING (true);

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