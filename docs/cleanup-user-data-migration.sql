-- МИГРАЦИЯ: Очистка данных от всех пользователей кроме 00000000-0000-0000-0000-000000000000
-- Выполните этот SQL в Supabase Dashboard

-- ====== ИНФОРМАЦИЯ ПЕРЕД УДАЛЕНИЕМ ======
DO $$
DECLARE
    cards_to_delete INTEGER;
    tags_to_delete INTEGER;
    card_tags_to_delete INTEGER;
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
    
    RAISE NOTICE 'ИНФОРМАЦИЯ О ПРЕДСТОЯЩЕМ УДАЛЕНИИ:';
    RAISE NOTICE 'Карточек будет удалено: %', cards_to_delete;
    RAISE NOTICE 'Тегов будет удалено: %', tags_to_delete;
    RAISE NOTICE 'Связей карточки-теги будет удалено: %', card_tags_to_delete;
    RAISE NOTICE 'Данные пользователя % будут сохранены', target_user_id;
END $$;

-- ====== УДАЛЕНИЕ ДАННЫХ ======
-- Удаляем связи карточки-теги (будут удалены автоматически через CASCADE, но для ясности)
DELETE FROM card_tags 
WHERE card_id IN (
    SELECT id FROM cards 
    WHERE user_id != '00000000-0000-0000-0000-000000000000'
);

-- Удаляем карточки всех пользователей кроме 00000000-0000-0000-0000-000000000000
DELETE FROM cards 
WHERE user_id != '00000000-0000-0000-0000-000000000000';

-- Удаляем теги всех пользователей кроме 00000000-0000-0000-0000-000000000000
DELETE FROM tags 
WHERE user_id != '00000000-0000-0000-0000-000000000000';

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
    
    RAISE NOTICE 'РЕЗУЛЬТАТ ОЧИСТКИ:';
    RAISE NOTICE 'Осталось карточек: %', remaining_cards;
    RAISE NOTICE 'Осталось тегов: %', remaining_tags;
    RAISE NOTICE 'Осталось связей карточки-теги: %', remaining_card_tags;
    
    -- Проверяем что остались только данные целевого пользователя
    IF EXISTS (SELECT 1 FROM cards WHERE user_id != target_user_id) THEN
        RAISE EXCEPTION 'ОШИБКА: Найдены карточки других пользователей!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM tags WHERE user_id != target_user_id) THEN
        RAISE EXCEPTION 'ОШИБКА: Найдены теги других пользователей!';
    END IF;
    
    RAISE NOTICE 'УСПЕХ: Все данные других пользователей удалены!';
    RAISE NOTICE 'Сохранены только данные пользователя: %', target_user_id;
END $$;

-- ====== ОБНОВЛЕНИЕ ПОСЛЕДОВАТЕЛЬНОСТЕЙ (если нужно) ======
-- Сбрасываем счетчики для экономии места (опционально)
-- ALTER SEQUENCE IF EXISTS cards_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS tags_id_seq RESTART WITH 1; 