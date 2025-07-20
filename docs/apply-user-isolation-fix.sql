-- НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ: изоляция данных по пользователям
-- Выполните этот SQL в Supabase Dashboard

-- ====== ПОЛИТИКИ ДЛЯ КАРТОЧЕК ======
DROP POLICY IF EXISTS "Users can view own cards" ON cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON cards;
DROP POLICY IF EXISTS "Users can update own cards" ON cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON cards;

CREATE POLICY "Users can view own cards" ON cards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cards" ON cards
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cards" ON cards
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cards" ON cards
  FOR DELETE USING (user_id = auth.uid());

-- ====== ПОЛИТИКИ ДЛЯ ТЕГОВ ======
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

CREATE POLICY "Users can view own tags" ON tags
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tags" ON tags
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags" ON tags
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tags" ON tags
  FOR DELETE USING (user_id = auth.uid());

-- ====== ПОЛИТИКИ ДЛЯ СВЯЗЕЙ КАРТОЧКИ-ТЕГИ ======
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;

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
  );

CREATE POLICY "Users can delete own card_tags" ON card_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM cards 
      WHERE cards.id = card_tags.card_id 
      AND cards.user_id = auth.uid()
    )
  );

-- ====== АВТОМАТИЧЕСКИЙ user_id ======
CREATE OR REPLACE FUNCTION auto_add_user_id_to_cards()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_add_user_id_to_tags()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
SELECT 'Политики применены успешно!' as status; 