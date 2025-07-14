-- Создание таблицы cards в Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Включаем расширение для UUID (если еще не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем таблицу cards
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  german_word TEXT NOT NULL,
  translation TEXT NOT NULL,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000', -- Временно опциональный с default значением
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards (user_id);
CREATE INDEX IF NOT EXISTS idx_cards_learned ON cards (learned);
CREATE INDEX IF NOT EXISTS idx_cards_tags ON cards USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards (created_at);

-- Включаем Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Временно отключаем строгие политики безопасности
-- В будущем можно будет раскомментировать эти политики когда добавим аутентификацию

-- Пользователи могут видеть только свои карточки
-- CREATE POLICY "Users can view own cards" ON cards
--   FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут создавать карточки только для себя
-- CREATE POLICY "Users can insert own cards" ON cards
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только свои карточки
-- CREATE POLICY "Users can update own cards" ON cards
--   FOR UPDATE USING (auth.uid() = user_id);

-- Пользователи могут удалять только свои карточки
-- CREATE POLICY "Users can delete own cards" ON cards
--   FOR DELETE USING (auth.uid() = user_id);

-- Временная политика - разрешить все операции
CREATE POLICY "Allow all operations temporarily" ON cards
  FOR ALL USING (true) WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_cards_updated_at 
  BEFORE UPDATE ON cards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Пример вставки тестовых данных (замените user_id на реальный UUID)
INSERT INTO cards (german_word, translation, user_id, tags, learned) VALUES
('der Hund', 'собака', 'your-user-uuid-here', ARRAY['животные', 'базовый'], false),
('die Katze', 'кошка', 'your-user-uuid-here', ARRAY['животные', 'базовый'], false),
('das Haus', 'дом', 'your-user-uuid-here', ARRAY['дом', 'базовый'], true); 