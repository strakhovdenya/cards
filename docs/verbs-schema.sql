-- Создание таблицы глаголов в Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Создаем таблицу verbs
CREATE TABLE IF NOT EXISTS verbs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  infinitive TEXT NOT NULL,
  translation TEXT NOT NULL,
  conjugations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Массив спряжений
  examples JSONB, -- Примеры предложений (утвердительное, вопрос, краткий ответ)
  user_id UUID NOT NULL, -- ID пользователя (обязательное поле)
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_verbs_user_id ON verbs (user_id);
CREATE INDEX IF NOT EXISTS idx_verbs_learned ON verbs (learned);
CREATE INDEX IF NOT EXISTS idx_verbs_created_at ON verbs (created_at);
CREATE INDEX IF NOT EXISTS idx_verbs_infinitive ON verbs (infinitive);

-- Включаем Row Level Security (RLS)
ALTER TABLE verbs ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для изоляции пользователей
CREATE POLICY "Users can view own verbs" ON verbs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verbs" ON verbs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verbs" ON verbs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verbs" ON verbs
  FOR DELETE USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_verbs_updated_at 
  BEFORE UPDATE ON verbs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка примерных глаголов (только для демонстрации)
-- В реальном приложении глаголы должны создаваться через API с правильным user_id
-- Эти записи будут видны только пользователю с указанным ID
INSERT INTO verbs (infinitive, translation, conjugations, user_id) VALUES
(
  'arbeiten',
  'работать',
  '[
    {"person": "ich", "form": "arbeite", "translation": "я работаю"},
    {"person": "du", "form": "arbeitest", "translation": "ты работаешь"},
    {"person": "er/sie/es", "form": "arbeitet", "translation": "он/она/оно работает"},
    {"person": "wir", "form": "arbeiten", "translation": "мы работаем"},
    {"person": "ihr", "form": "arbeitet", "translation": "вы (мн.) работаете"},
    {"person": "sie / Sie", "form": "arbeiten", "translation": "они / Вы работаете"}
  ]'::jsonb,
  'cc9203eb-2b32-4532-9f9b-f16b22a2438b'
),
(
  'sein',
  'быть',
  '[
    {"person": "ich", "form": "bin", "translation": "я есть"},
    {"person": "du", "form": "bist", "translation": "ты есть"},
    {"person": "er/sie/es", "form": "ist", "translation": "он/она/оно есть"},
    {"person": "wir", "form": "sind", "translation": "мы есть"},
    {"person": "ihr", "form": "seid", "translation": "вы (мн.) есть"},
    {"person": "sie / Sie", "form": "sind", "translation": "они / Вы есть"}
  ]'::jsonb,
  'cc9203eb-2b32-4532-9f9b-f16b22a2438b'
),
(
  'haben',
  'иметь',
  '[
    {"person": "ich", "form": "habe", "translation": "я имею"},
    {"person": "du", "form": "hast", "translation": "ты имеешь"},
    {"person": "er/sie/es", "form": "hat", "translation": "он/она/оно имеет"},
    {"person": "wir", "form": "haben", "translation": "мы имеем"},
    {"person": "ihr", "form": "habt", "translation": "вы (мн.) имеете"},
    {"person": "sie / Sie", "form": "haben", "translation": "они / Вы имеете"}
  ]'::jsonb,
  'cc9203eb-2b32-4532-9f9b-f16b22a2438b'
),
(
  'machen',
  'делать',
  '[
    {"person": "ich", "form": "mache", "translation": "я делаю"},
    {"person": "du", "form": "machst", "translation": "ты делаешь"},
    {"person": "er/sie/es", "form": "macht", "translation": "он/она/оно делает"},
    {"person": "wir", "form": "machen", "translation": "мы делаем"},
    {"person": "ihr", "form": "macht", "translation": "вы (мн.) делаете"},
    {"person": "sie / Sie", "form": "machen", "translation": "они / Вы делаете"}
  ]'::jsonb,
  'cc9203eb-2b32-4532-9f9b-f16b22a2438b'
),
(
  'kommen',
  'приходить',
  '[
    {"person": "ich", "form": "komme", "translation": "я прихожу"},
    {"person": "du", "form": "kommst", "translation": "ты приходишь"},
    {"person": "er/sie/es", "form": "kommt", "translation": "он/она/оно приходит"},
    {"person": "wir", "form": "kommen", "translation": "мы приходим"},
    {"person": "ihr", "form": "kommt", "translation": "вы (мн.) приходите"},
    {"person": "sie / Sie", "form": "kommen", "translation": "они / Вы приходите"}
  ]'::jsonb,
  'cc9203eb-2b32-4532-9f9b-f16b22a2438b'
)
ON CONFLICT (id) DO NOTHING; 