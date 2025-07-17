-- БЕЗОПАСНАЯ МИГРАЦИЯ: Очистка данных от всех пользователей кроме 00000000-0000-0000-0000-000000000000
-- С созданием backup таблиц и возможностью отката
-- Выполните этот SQL в Supabase Dashboard

-- ====== СОЗДАНИЕ BACKUP ТАБЛИЦ ======
-- Создаем backup таблицы на случай необходимости отката
CREATE TABLE IF NOT EXISTS backup_cards_before_cleanup AS 
SELECT * FROM cards WHERE user_id != '00000000-0000-0000-0000-000000000000';

CREATE TABLE IF NOT EXISTS backup_tags_before_cleanup AS 
SELECT * FROM tags WHERE user_id != '00000000-0000-0000-0000-000000000000';

CREATE TABLE IF NOT EXISTS backup_card_tags_before_cleanup AS 
SELECT ct.* FROM card_tags ct
JOIN cards c ON ct.card_id = c.id
WHERE c.user_id != '00000000-0000-0000-0000-000000000000';

-- ====== ИНФОРМАЦИЯ О BACKUP ======
DO $$
DECLARE
    backup_cards INTEGER;
    backup_tags INTEGER;
    backup_card_tags INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_cards FROM backup_cards_before_cleanup;
    SELECT COUNT(*) INTO backup_tags FROM backup_tags_before_cleanup;
    SELECT COUNT(*) INTO backup_card_tags FROM backup_card_tags_before_cleanup;
    
    RAISE NOTICE 'BACKUP СОЗДАН:';
    RAISE NOTICE 'Карточек в backup: %', backup_cards;
    RAISE NOTICE 'Тегов в backup: %', backup_tags;
    RAISE NOTICE 'Связей в backup: %', backup_card_tags;
END $$;

-- ====== ИНФОРМАЦИЯ ПЕРЕД УДАЛЕНИЕМ ======
DO $$
DECLARE
    cards_to_delete INTEGER;
    tags_to_delete INTEGER;
    card_tags_to_delete INTEGER;
    cards_to_keep INTEGER;
    tags_to_keep INTEGER;
    target_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Подсчитываем что будет удалено
    SELECT COUNT(*) INTO cards_to_delete 
    FROM cards 
    WHERE user_id != target_user_id;
    
    SELECT COUNT(*) INTO tags_to_delete 
    FROM tags 
    WHERE user_id != target_user_id;
    
    SELECT COUNT(*) INTO card_tags_to_delete 
    FROM card_tags ct
    JOIN cards c ON ct.card_id = c.id
    WHERE c.user_id != target_user_id;
    
    -- Подсчитываем что останется
    SELECT COUNT(*) INTO cards_to_keep 
    FROM cards 
    WHERE user_id = target_user_id;
    
    SELECT COUNT(*) INTO tags_to_keep 
    FROM tags 
    WHERE user_id = target_user_id;
    
    RAISE NOTICE '=== ПЛАН ОЧИСТКИ ===';
    RAISE NOTICE 'БУДЕТ УДАЛЕНО:';
    RAISE NOTICE '  Карточек: %', cards_to_delete;
    RAISE NOTICE '  Тегов: %', tags_to_delete;
    RAISE NOTICE '  Связей: %', card_tags_to_delete;
    RAISE NOTICE '';
    RAISE NOTICE 'БУДЕТ СОХРАНЕНО для пользователя %:', target_user_id;
    RAISE NOTICE '  Карточек: %', cards_to_keep;
    RAISE NOTICE '  Тегов: %', tags_to_keep;
END $$;

-- ====== ТРАНЗАКЦИОННОЕ УДАЛЕНИЕ ======
BEGIN;

    -- Удаляем связи карточки-теги для карточек других пользователей
    DELETE FROM card_tags 
    WHERE card_id IN (
        SELECT id FROM cards 
        WHERE user_id != '00000000-0000-0000-0000-000000000000'
    );

    -- Удаляем карточки других пользователей
    DELETE FROM cards 
    WHERE user_id != '00000000-0000-0000-0000-000000000000';

    -- Удаляем теги других пользователей
    DELETE FROM tags 
    WHERE user_id != '00000000-0000-0000-0000-000000000000';

COMMIT;

-- ====== ПРОВЕРКА РЕЗУЛЬТАТА ======
DO $$
DECLARE
    remaining_cards INTEGER;
    remaining_tags INTEGER;
    remaining_card_tags INTEGER;
    target_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Подсчитываем что осталось
    SELECT COUNT(*) INTO remaining_cards FROM cards;
    SELECT COUNT(*) INTO remaining_tags FROM tags;
    SELECT COUNT(*) INTO remaining_card_tags FROM card_tags;
    
    RAISE NOTICE '=== РЕЗУЛЬТАТ ОЧИСТКИ ===';
    RAISE NOTICE 'В базе осталось:';
    RAISE NOTICE '  Карточек: %', remaining_cards;
    RAISE NOTICE '  Тегов: %', remaining_tags;
    RAISE NOTICE '  Связей: %', remaining_card_tags;
    
    -- Проверяем что остались только данные целевого пользователя
    IF EXISTS (SELECT 1 FROM cards WHERE user_id != target_user_id) THEN
        RAISE EXCEPTION 'ОШИБКА: Найдены карточки других пользователей!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM tags WHERE user_id != target_user_id) THEN
        RAISE EXCEPTION 'ОШИБКА: Найдены теги других пользователей!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ УСПЕХ: Очистка выполнена успешно!';
    RAISE NOTICE '✅ Все данные других пользователей удалены';
    RAISE NOTICE '✅ Данные пользователя % сохранены', target_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'ℹ️  Backup таблицы созданы:';
    RAISE NOTICE '   - backup_cards_before_cleanup';
    RAISE NOTICE '   - backup_tags_before_cleanup';
    RAISE NOTICE '   - backup_card_tags_before_cleanup';
END $$;

-- ====== ИНСТРУКЦИИ ПО ОТКАТУ (НЕ ВЫПОЛНЯТЬ!) ======
/*
ЕСЛИ НУЖНО ОТКАТИТЬ ИЗМЕНЕНИЯ, ВЫПОЛНИТЕ:

-- 1. Восстановить карточки
INSERT INTO cards SELECT * FROM backup_cards_before_cleanup;

-- 2. Восстановить теги
INSERT INTO tags SELECT * FROM backup_tags_before_cleanup;

-- 3. Восстановить связи
INSERT INTO card_tags SELECT * FROM backup_card_tags_before_cleanup;

-- 4. Удалить backup таблицы
DROP TABLE backup_cards_before_cleanup;
DROP TABLE backup_tags_before_cleanup;
DROP TABLE backup_card_tags_before_cleanup;
*/

-- ====== ОЧИСТКА BACKUP ТАБЛИЦ (ВЫПОЛНИТЬ ПОЗЖЕ) ======
/*
КОГДА УБЕДИТЕСЬ ЧТО ВСЕ РАБОТАЕТ, УДАЛИТЕ BACKUP:

DROP TABLE IF EXISTS backup_cards_before_cleanup;
DROP TABLE IF EXISTS backup_tags_before_cleanup;
DROP TABLE IF EXISTS backup_card_tags_before_cleanup;
*/ 