-- Создание таблиц в Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Включаем расширение для UUID (если еще не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем таблицу cards (БЕЗ поля tags - оно уже удалено)
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  german_word TEXT NOT NULL,
  translation TEXT NOT NULL,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000', -- Временно опциональный с default значением
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2196f3',
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: один пользователь не может иметь два тега с одинаковым именем
  UNIQUE(name, user_id)
);

-- Создаем таблицу связей card_tags (many-to-many)
CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Первичный ключ - комбинация card_id и tag_id
  PRIMARY KEY (card_id, tag_id)
);

-- Создаем индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards (user_id);
CREATE INDEX IF NOT EXISTS idx_cards_learned ON cards (learned);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards (created_at);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags (user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags (name);

CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags (card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags (tag_id);

-- Включаем Row Level Security (RLS)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_tags ENABLE ROW LEVEL SECURITY;

-- Временно отключаем строгие политики безопасности
-- В будущем можно будет раскомментировать эти политики когда добавим аутентификацию

-- Временные политики - разрешить все операции
CREATE POLICY "Allow all operations temporarily on cards" ON cards
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations temporarily on tags" ON tags
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations temporarily on card_tags" ON card_tags
  FOR ALL USING (true) WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_cards_updated_at 
  BEFORE UPDATE ON cards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at 
  BEFORE UPDATE ON tags 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка стандартных тегов (грамматические типы слов)
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