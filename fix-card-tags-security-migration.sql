-- ============================================================================
-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ БЕЗОПАСНОСТИ: Добавление user_id в card_tags
-- ============================================================================
-- 
-- ПРОБЛЕМА: В таблице card_tags отсутствует поле user_id, что создает 
-- уязвимость безопасности - пользователи могут получить доступ к связям 
-- карточка-тег других пользователей.
--
-- РЕШЕНИЕ: Добавляем user_id и обновляем политики безопасности
-- ============================================================================

BEGIN;

-- Шаг 1: Добавляем поле user_id в таблицу card_tags
ALTER TABLE card_tags 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Шаг 2: Заполняем user_id на основе существующих данных
-- Связываем через таблицу cards чтобы получить правильного владельца
UPDATE card_tags 
SET user_id = cards.user_id
FROM cards 
WHERE cards.id = card_tags.card_id;

-- Шаг 3: Делаем поле user_id обязательным
ALTER TABLE card_tags 
ALTER COLUMN user_id SET NOT NULL;

-- Шаг 4: Добавляем индекс для производительности
CREATE INDEX IF NOT EXISTS idx_card_tags_user_id ON card_tags (user_id);

-- Шаг 5: Удаляем старые небезопасные политики
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Allow all operations temporarily on card_tags" ON card_tags;
DROP POLICY IF EXISTS "Allow all operations on card_tags temporarily" ON card_tags;

-- Шаг 6: Создаем новые безопасные политики с прямой проверкой user_id
CREATE POLICY "Users can view own card_tags" ON card_tags
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own card_tags" ON card_tags
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own card_tags" ON card_tags
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own card_tags" ON card_tags
    FOR DELETE USING (user_id = auth.uid());

-- Шаг 7: Создаем триггер для автоматического заполнения user_id
CREATE OR REPLACE FUNCTION set_card_tags_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Получаем user_id из карточки
    SELECT user_id INTO NEW.user_id 
    FROM cards 
    WHERE id = NEW.card_id;
    
    -- Если карточка не найдена, отклоняем операцию
    IF NEW.user_id IS NULL THEN
        RAISE EXCEPTION 'Card not found or access denied';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Применяем триггер только для INSERT (user_id должен быть неизменным)
CREATE TRIGGER trigger_set_card_tags_user_id
    BEFORE INSERT ON card_tags
    FOR EACH ROW
    EXECUTE FUNCTION set_card_tags_user_id();

-- Шаг 8: Добавляем дополнительную валидацию
-- Проверяем что карточка и тег принадлежат одному пользователю
CREATE OR REPLACE FUNCTION validate_card_tags_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем что карточка принадлежит пользователю
    IF NOT EXISTS (
        SELECT 1 FROM cards 
        WHERE id = NEW.card_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Card does not belong to user';
    END IF;
    
    -- Проверяем что тег принадлежит пользователю
    IF NOT EXISTS (
        SELECT 1 FROM tags 
        WHERE id = NEW.tag_id AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Tag does not belong to user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_validate_card_tags_ownership
    BEFORE INSERT OR UPDATE ON card_tags
    FOR EACH ROW
    EXECUTE FUNCTION validate_card_tags_ownership();

-- Шаг 9: Проверяем результат миграции
DO $$
DECLARE
    total_records INTEGER;
    records_with_user_id INTEGER;
    orphaned_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM card_tags;
    SELECT COUNT(*) INTO records_with_user_id FROM card_tags WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO orphaned_records FROM card_tags WHERE user_id IS NULL;
    
    RAISE NOTICE '=== РЕЗУЛЬТАТ МИГРАЦИИ CARD_TAGS ===';
    RAISE NOTICE 'Всего записей: %', total_records;
    RAISE NOTICE 'Записей с user_id: %', records_with_user_id;
    RAISE NOTICE 'Записей без user_id: %', orphaned_records;
    
    IF orphaned_records > 0 THEN
        RAISE EXCEPTION 'Обнаружены записи без user_id! Миграция не завершена.';
    END IF;
    
    RAISE NOTICE '✅ Миграция card_tags завершена успешно!';
END;
$$;

COMMIT;

-- ============================================================================
-- ИНСТРУКЦИИ ПО ОТКАТУ (в случае проблем)
-- ============================================================================
/*

В случае необходимости отката выполните:

BEGIN;

-- Удаляем триггеры
DROP TRIGGER IF EXISTS trigger_set_card_tags_user_id ON card_tags;
DROP TRIGGER IF EXISTS trigger_validate_card_tags_ownership ON card_tags;

-- Удаляем функции
DROP FUNCTION IF EXISTS set_card_tags_user_id();
DROP FUNCTION IF EXISTS validate_card_tags_ownership();

-- Удаляем новые политики
DROP POLICY IF EXISTS "Users can view own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can insert own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can update own card_tags" ON card_tags;
DROP POLICY IF EXISTS "Users can delete own card_tags" ON card_tags;

-- Восстанавливаем старые политики (НЕБЕЗОПАСНЫЕ!)
CREATE POLICY "Users can view own card_tags" ON card_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM cards WHERE cards.id = card_tags.card_id AND cards.user_id = auth.uid())
    );

-- Удаляем поле user_id
ALTER TABLE card_tags DROP COLUMN IF EXISTS user_id;

COMMIT;

*/ 