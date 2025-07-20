-- Обновление RLS политик для изоляции данных по пользователям
-- Проблема: API endpoints теперь используют аутентификацию, но нужно убедиться 
-- что user_id автоматически добавляется в записи

-- ====== КАРТОЧКИ ======

-- Удаляем старые политики для карточек
DROP POLICY IF EXISTS "Users can view own cards" ON cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON cards;
DROP POLICY IF EXISTS "Users can update own cards" ON cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON cards;

-- Создаем новые политики для карточек
CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (user_id = auth.uid());

-- ====== ТЕГИ ======

-- Удаляем старые политики для тегов
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

-- Создаем новые политики для тегов
CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (user_id = auth.uid());

-- ====== СВЯЗИ КАРТОЧКИ-ТЕГИ ======

-- Удаляем старые политики для card_tags
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;

-- Создаем политики для card_tags (основаны на владельце карточки)
CREATE POLICY "Users can view own card_tags" ON card_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own card_tags" ON card_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM tags 
      WHERE tags.id = card_tags.tag_id 
      AND tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own card_tags" ON card_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
  );

-- ====== ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКОГО user_id ======

-- Функция для автоматического добавления user_id в карточки
CREATE OR REPLACE FUNCTION auto_add_user_id_to_cards()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для автоматического добавления user_id в теги
CREATE OR REPLACE FUNCTION auto_add_user_id_to_tags()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггеры для автоматического добавления user_id
DROP TRIGGER IF EXISTS auto_user_id_cards ON cards;
CREATE TRIGGER auto_user_id_cards
  BEFORE INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_user_id_to_cards();

DROP TRIGGER IF EXISTS auto_user_id_tags ON tags;
CREATE TRIGGER auto_user_id_tags
  BEFORE INSERT ON tags
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_user_id_to_tags();

-- ====== ПРОВЕРКА ======

-- Проверяем что политики применены корректно
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('cards', 'tags', 'card_tags', 'invites')
ORDER BY tablename, policyname; 