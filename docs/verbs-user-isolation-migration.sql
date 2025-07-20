-- Миграция для настройки изоляции пользователей в таблице verbs
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Обновляем структуру таблицы verbs
-- Делаем user_id обязательным полем
ALTER TABLE verbs ALTER COLUMN user_id SET NOT NULL;

-- 2. Удаляем временные политики безопасности
DROP POLICY IF EXISTS "Allow all operations temporarily on verbs" ON verbs;

-- 3. Создаем правильные политики безопасности для изоляции пользователей
CREATE POLICY "Users can view own verbs" ON verbs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verbs" ON verbs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verbs" ON verbs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own verbs" ON verbs
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Проверяем, что RLS включен
ALTER TABLE verbs ENABLE ROW LEVEL SECURITY;

-- 5. Создаем индекс для user_id если его нет
CREATE INDEX IF NOT EXISTS idx_verbs_user_id ON verbs (user_id);

-- Проверка: убедитесь, что все глаголы имеют правильный user_id
-- SELECT id, infinitive, user_id FROM verbs WHERE user_id IS NULL; 