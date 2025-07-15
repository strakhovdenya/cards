-- Обновленная схема БД с системой тегов
-- Выполните этот SQL в Supabase SQL Editor

-- Включаем расширение для UUID (если еще не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Создаем таблицу tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#2196f3', -- Цвет тега в hex формате
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000', -- ID пользователя
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальное ограничение: один пользователь не может иметь два тега с одинаковым именем
  CONSTRAINT unique_tag_name_per_user UNIQUE (name, user_id)
);

-- 2. Создаем связующую таблицу card_tags (many-to-many)
CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Составной первичный ключ
  PRIMARY KEY (card_id, tag_id)
);

-- 3. Обновляем таблицу cards (удаляем поле tags)
-- ВАЖНО: Это нужно выполнить отдельно после миграции данных!
-- ALTER TABLE cards DROP COLUMN IF EXISTS tags;

-- Создаем индексы для лучшей производительности

-- Индексы для таблицы tags
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags (created_at);

-- Индексы для связующей таблицы
CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags (card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags (tag_id);

-- Обновляем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_tags_updated_at 
  BEFORE UPDATE ON tags 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Включаем Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;

-- Временные политики безопасности (разрешить все операции)
-- В будущем заменить на строгие политики с аутентификацией

CREATE POLICY "Allow all operations on tags temporarily" ON tags
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on card_tags temporarily" ON card_tags
  FOR ALL USING (true) WITH CHECK (true);

-- Будущие политики безопасности (закомментированы):
/*
-- Политики для таблицы tags
CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- Политики для связующей таблицы card_tags
CREATE POLICY "Users can view card_tags for own cards" ON card_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert card_tags for own cards" ON card_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM tags 
      WHERE tags.id = card_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete card_tags for own cards" ON card_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
  );
*/

-- Создаем стандартные теги (грамматические типы слов) для всех пользователей
INSERT INTO tags (name, color, user_id) VALUES
  ('Существительное', '#2196f3', '00000000-0000-0000-0000-000000000000'),
  ('Глагол', '#4caf50', '00000000-0000-0000-0000-000000000000'),
  ('Прилагательное', '#ff9800', '00000000-0000-0000-0000-000000000000'),
  ('Наречие', '#9c27b0', '00000000-0000-0000-0000-000000000000'),
  ('Предлог', '#f44336', '00000000-0000-0000-0000-000000000000'),
  ('Местоимение', '#e91e63', '00000000-0000-0000-0000-000000000000'),
  ('Артикль', '#795548', '00000000-0000-0000-0000-000000000000'),
  ('Союз', '#607d8b', '00000000-0000-0000-0000-000000000000'),
  ('Частица', '#ff5722', '00000000-0000-0000-0000-000000000000'),
  ('Междометие', '#8bc34a', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name, user_id) DO NOTHING; 