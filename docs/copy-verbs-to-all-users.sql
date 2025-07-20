-- Миграция для копирования глаголов от пользователя cac55133-1b29-46b8-bd86-eac548c60e1c всем остальным пользователям
-- Выполняется в транзакции для безопасности

BEGIN;

-- Создаем временную таблицу для хранения всех пользователей кроме исходного
CREATE TEMP TABLE target_users AS
SELECT u.id 
FROM auth.users u
WHERE u.id != 'cac55133-1b29-46b8-bd86-eac548c60e1c'
  AND EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = u.id
  );

-- Проверяем, что исходный пользователь существует и у него есть глаголы
DO $$
DECLARE
    source_user_exists BOOLEAN;
    verbs_count INTEGER;
BEGIN
    -- Проверяем существование исходного пользователя
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = 'cac55133-1b29-46b8-bd86-eac548c60e1c') INTO source_user_exists;
    
    IF NOT source_user_exists THEN
        RAISE EXCEPTION 'Исходный пользователь cac55133-1b29-46b8-bd86-eac548c60e1c не найден';
    END IF;
    
    -- Проверяем количество глаголов у исходного пользователя
    SELECT COUNT(*) INTO verbs_count FROM verbs WHERE user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c';
    
    IF verbs_count = 0 THEN
        RAISE EXCEPTION 'У исходного пользователя нет глаголов для копирования';
    END IF;
    
    RAISE NOTICE 'Найдено % глаголов у исходного пользователя', verbs_count;
END $$;

-- Копируем глаголы всем пользователям
INSERT INTO verbs (
    user_id,
    infinitive,
    translation,
    conjugations,
    learned,
    created_at,
    updated_at
)
SELECT 
    tu.id as user_id,
    v.infinitive,
    v.translation,
    v.conjugations,
    v.learned,
    NOW() as created_at,
    NOW() as updated_at
FROM verbs v
CROSS JOIN target_users tu
WHERE v.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'
  AND NOT EXISTS (
    -- Проверяем, что у пользователя еще нет этого глагола
    SELECT 1 
    FROM verbs existing 
    WHERE existing.user_id = tu.id 
      AND existing.infinitive = v.infinitive
  );

-- Выводим статистику
DO $$
DECLARE
    target_users_count INTEGER;
    copied_verbs_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO target_users_count FROM target_users;
    SELECT COUNT(*) INTO copied_verbs_count 
    FROM verbs 
    WHERE user_id IN (SELECT id FROM target_users)
      AND created_at >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE 'Копирование завершено:';
    RAISE NOTICE '- Целевых пользователей: %', target_users_count;
    RAISE NOTICE '- Скопировано глаголов: %', copied_verbs_count;
END $$;

-- Удаляем временную таблицу
DROP TABLE target_users;

COMMIT; 