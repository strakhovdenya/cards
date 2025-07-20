-- Миграция для присваивания тегов всем существующим карточкам
-- Выполните этот SQL ПОСЛЕ создания таблиц и стандартных тегов

DO $$
DECLARE
    noun_tag_id UUID;
    card_record RECORD;
    user_uuid UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Получаем ID тега "Существительное"
    SELECT id INTO noun_tag_id FROM tags WHERE name = 'Существительное' AND user_id = user_uuid;
    
    -- Проверяем что тег найден
    IF noun_tag_id IS NULL THEN
        RAISE EXCEPTION 'Тег "Существительное" не найден. Сначала создайте стандартные теги.';
    END IF;
    
    RAISE NOTICE 'Начинаем присваивание тегов существующим карточкам...';
    
    -- Присваиваем тег "Существительное" всем существующим карточкам
    -- Определяем существительные по артиклям der/die/das и известным переводам
    FOR card_record IN 
        SELECT id, german_word, translation FROM cards 
        WHERE (
            german_word ILIKE 'der %' OR 
            german_word ILIKE 'die %' OR 
            german_word ILIKE 'das %' OR
            -- Известные существительные по переводам из ваших карточек
            translation IN (
                'дом',
                'шариковая ручка',
                'карандаш', 
                'ключ',
                'ноутбук',
                'стул',
                'стол',
                'окно',
                'машина',
                'тетрадь',
                'стакан',
                'планшет',
                'мобильный телефон',
                'книга',
                'мышь',
                'очки',
                'доска',
                'ножницы',
                'сумка',
                'лампа',
                'дверь',
                'учитель',
                'велосипед',
                'собака',
                'кошка',
                'рюкзак'
            )
        )
    LOOP
        -- Добавляем связь карточка-тег, если её еще нет
        INSERT INTO card_tags (card_id, tag_id)
        VALUES (card_record.id, noun_tag_id)
        ON CONFLICT (card_id, tag_id) DO NOTHING;
        
        RAISE NOTICE 'Назначен тег "Существительное" для карточки: % - %', 
                     card_record.german_word, card_record.translation;
    END LOOP;
    
    RAISE NOTICE 'Присваивание тегов завершено';
END $$;

-- Статистика результатов
SELECT 
    'Всего карточек в базе:' as description,
    COUNT(*) as count
FROM cards

UNION ALL

SELECT 
    'Карточек с тегом "Существительное":' as description,
    COUNT(DISTINCT ct.card_id) as count
FROM card_tags ct
JOIN tags t ON ct.tag_id = t.id
WHERE t.name = 'Существительное'

UNION ALL

SELECT 
    'Карточек без тегов:' as description,
    COUNT(*) as count
FROM cards c
WHERE NOT EXISTS (
    SELECT 1 FROM card_tags ct WHERE ct.card_id = c.id
);

-- Показать все карточки с назначенными тегами
SELECT 
    c.german_word,
    c.translation,
    COALESCE(STRING_AGG(t.name, ', ' ORDER BY t.name), 'Нет тегов') as assigned_tags
FROM cards c
LEFT JOIN card_tags ct ON c.id = ct.card_id
LEFT JOIN tags t ON ct.tag_id = t.id
GROUP BY c.id, c.german_word, c.translation
ORDER BY c.german_word; 