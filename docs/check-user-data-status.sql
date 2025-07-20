-- СКРИПТ ПРОВЕРКИ: Анализ данных пользователей в базе
-- Выполните этот SQL в Supabase Dashboard для анализа текущего состояния

-- ====== ОБЩАЯ СТАТИСТИКА ======
DO $$
DECLARE
    total_cards INTEGER;
    total_tags INTEGER;
    total_card_tags INTEGER;
    unique_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_cards FROM cards;
    SELECT COUNT(*) INTO total_tags FROM tags;
    SELECT COUNT(*) INTO total_card_tags FROM card_tags;
    SELECT COUNT(DISTINCT user_id) INTO unique_users FROM (
        SELECT user_id FROM cards 
        UNION 
        SELECT user_id FROM tags
    ) users;
    
    RAISE NOTICE '=== ОБЩАЯ СТАТИСТИКА ===';
    RAISE NOTICE 'Всего карточек: %', total_cards;
    RAISE NOTICE 'Всего тегов: %', total_tags;
    RAISE NOTICE 'Всего связей карточки-теги: %', total_card_tags;
    RAISE NOTICE 'Уникальных пользователей: %', unique_users;
END $$;

-- ====== СТАТИСТИКА ПО ПОЛЬЗОВАТЕЛЯМ ======
RAISE NOTICE '';
RAISE NOTICE '=== СТАТИСТИКА ПО ПОЛЬЗОВАТЕЛЯМ ===';

-- Карточки по пользователям
SELECT 
    user_id,
    COUNT(*) as cards_count,
    CASE 
        WHEN user_id = '00000000-0000-0000-0000-000000000000' THEN 'TARGET USER ⭐'
        ELSE 'OTHER USER'
    END as user_type
FROM cards 
GROUP BY user_id 
ORDER BY 
    CASE WHEN user_id = '00000000-0000-0000-0000-000000000000' THEN 0 ELSE 1 END,
    cards_count DESC;

-- Теги по пользователям
SELECT 
    'TAGS BY USER' as table_name,
    user_id,
    COUNT(*) as tags_count,
    CASE 
        WHEN user_id = '00000000-0000-0000-0000-000000000000' THEN 'TARGET USER ⭐'
        ELSE 'OTHER USER'
    END as user_type
FROM tags 
GROUP BY user_id 
ORDER BY 
    CASE WHEN user_id = '00000000-0000-0000-0000-000000000000' THEN 0 ELSE 1 END,
    tags_count DESC;

-- ====== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О ЦЕЛЕВОМ ПОЛЬЗОВАТЕЛЕ ======
DO $$
DECLARE
    target_user_id UUID := '00000000-0000-0000-0000-000000000000';
    target_cards INTEGER;
    target_tags INTEGER;
    target_card_tags INTEGER;
BEGIN
    SELECT COUNT(*) INTO target_cards 
    FROM cards 
    WHERE user_id = target_user_id;
    
    SELECT COUNT(*) INTO target_tags 
    FROM tags 
    WHERE user_id = target_user_id;
    
    SELECT COUNT(*) INTO target_card_tags 
    FROM card_tags ct
    JOIN cards c ON ct.card_id = c.id
    WHERE c.user_id = target_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ЦЕЛЕВОЙ ПОЛЬЗОВАТЕЛЬ % ===', target_user_id;
    RAISE NOTICE 'Карточек: %', target_cards;
    RAISE NOTICE 'Тегов: %', target_tags;
    RAISE NOTICE 'Связей карточки-теги: %', target_card_tags;
END $$;

-- ====== ИНФОРМАЦИЯ О ДРУГИХ ПОЛЬЗОВАТЕЛЯХ ======
DO $$
DECLARE
    other_cards INTEGER;
    other_tags INTEGER;
    other_card_tags INTEGER;
    target_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    SELECT COUNT(*) INTO other_cards 
    FROM cards 
    WHERE user_id != target_user_id;
    
    SELECT COUNT(*) INTO other_tags 
    FROM tags 
    WHERE user_id != target_user_id;
    
    SELECT COUNT(*) INTO other_card_tags 
    FROM card_tags ct
    JOIN cards c ON ct.card_id = c.id
    WHERE c.user_id != target_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== ДРУГИЕ ПОЛЬЗОВАТЕЛИ (БУДУТ УДАЛЕНЫ) ===';
    RAISE NOTICE 'Карточек других пользователей: %', other_cards;
    RAISE NOTICE 'Тегов других пользователей: %', other_tags;
    RAISE NOTICE 'Связей других пользователей: %', other_card_tags;
    
    IF other_cards = 0 AND other_tags = 0 THEN
        RAISE NOTICE '✅ База уже очищена! Нет данных других пользователей.';
    ELSE
        RAISE NOTICE '⚠️  Требуется очистка! Есть данные других пользователей.';
    END IF;
END $$;

-- ====== ПРИМЕРЫ ДАННЫХ ЦЕЛЕВОГО ПОЛЬЗОВАТЕЛЯ ======
RAISE NOTICE '';
RAISE NOTICE '=== ПРИМЕРЫ КАРТОЧЕК ЦЕЛЕВОГО ПОЛЬЗОВАТЕЛЯ ===';

SELECT 
    c.id,
    c.german_word,
    c.translation,
    c.learned,
    STRING_AGG(t.name, ', ') as tags
FROM cards c
LEFT JOIN card_tags ct ON c.id = ct.card_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.user_id = '00000000-0000-0000-0000-000000000000'
GROUP BY c.id, c.german_word, c.translation, c.learned
ORDER BY c.created_at DESC
LIMIT 5;

-- ====== ПРИМЕРЫ ТЕГОВ ЦЕЛЕВОГО ПОЛЬЗОВАТЕЛЯ ======
RAISE NOTICE '';
RAISE NOTICE '=== ТЕГИ ЦЕЛЕВОГО ПОЛЬЗОВАТЕЛЯ ===';

SELECT 
    t.id,
    t.name,
    t.color,
    COUNT(ct.card_id) as cards_using_tag
FROM tags t
LEFT JOIN card_tags ct ON t.id = ct.tag_id
WHERE t.user_id = '00000000-0000-0000-0000-000000000000'
GROUP BY t.id, t.name, t.color
ORDER BY cards_using_tag DESC, t.name;

-- ====== ПРОВЕРКА BACKUP ТАБЛИЦ ======
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_cards_before_cleanup') THEN
        RAISE NOTICE '';
        RAISE NOTICE '=== BACKUP ТАБЛИЦЫ ===';
        RAISE NOTICE '✅ backup_cards_before_cleanup существует';
        RAISE NOTICE '✅ backup_tags_before_cleanup существует';
        RAISE NOTICE '✅ backup_card_tags_before_cleanup существует';
        RAISE NOTICE 'ℹ️  Можно безопасно выполнять миграцию или откатить изменения';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '=== BACKUP ТАБЛИЦЫ ===';
        RAISE NOTICE '❌ Backup таблицы не найдены';
        RAISE NOTICE 'ℹ️  Рекомендуется использовать safe-cleanup-user-data-migration.sql';
    END IF;
END $$; 