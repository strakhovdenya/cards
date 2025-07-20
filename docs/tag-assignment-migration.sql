-- Миграция для назначения тегов "Существительное" существующим карточкам
-- Выполните этот SQL ПОСЛЕ создания системы тегов

-- Находим ID тега "Существительное"
DO $$
DECLARE
    noun_tag_id UUID;
    card_record RECORD;
BEGIN
    -- Получаем ID тега "Существительное"
    SELECT id INTO noun_tag_id 
    FROM tags 
    WHERE name = 'Существительное' 
    AND user_id = '00000000-0000-0000-0000-000000000000'
    LIMIT 1;
    
    IF noun_tag_id IS NULL THEN
        RAISE EXCEPTION 'Тег "Существительное" не найден. Сначала выполните создание стандартных тегов.';
    END IF;
    
    -- Назначаем тег всем карточкам с указанными переводами (существительные)
    FOR card_record IN 
        SELECT id FROM cards 
        WHERE translation IN (
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
    LOOP
        -- Добавляем связь карточка-тег, если её еще нет
        INSERT INTO card_tags (card_id, tag_id)
        VALUES (card_record.id, noun_tag_id)
        ON CONFLICT (card_id, tag_id) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Тег "Существительное" назначен карточкам с существительными';
END $$;

-- Проверочный запрос: показать результаты назначения тегов
SELECT 
    c.german_word,
    c.translation,
    t.name as tag_name,
    t.color as tag_color
FROM cards c
JOIN card_tags ct ON c.id = ct.card_id
JOIN tags t ON ct.tag_id = t.id
WHERE c.translation IN (
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
ORDER BY c.german_word;

-- Статистика назначения тегов
SELECT 
    'Карточек с тегом "Существительное":' as description,
    COUNT(*) as count
FROM cards c
JOIN card_tags ct ON c.id = ct.card_id
JOIN tags t ON ct.tag_id = t.id
WHERE t.name = 'Существительное'
AND c.translation IN (
    'дом', 'шариковая ручка', 'карандаш', 'ключ', 'ноутбук',
    'стул', 'стол', 'окно', 'машина', 'тетрадь', 'стакан',
    'планшет', 'мобильный телефон', 'книга', 'мышь', 'очки',
    'доска', 'ножницы', 'сумка', 'лампа', 'дверь', 'учитель',
    'велосипед', 'собака', 'кошка', 'рюкзак'
);

-- Альтернативный подход: если хотите назначить теги по немецким словам
/*
-- Назначение тегов по немецким словам (закомментировано)
INSERT INTO card_tags (card_id, tag_id)
SELECT 
    c.id,
    t.id
FROM cards c
CROSS JOIN tags t
WHERE t.name = 'Существительное' 
AND t.user_id = '00000000-0000-0000-0000-000000000000'
AND c.german_word IN (
    'das Haus',
    'der Kugelschreiber', 
    'der Bleistift',
    'der Schlüssel',
    'der Laptop',
    'das Notebook',
    'der Stuhl',
    'der Tisch',
    'das Fenster', 
    'das Auto',
    'der Wagen',
    'das Heft',
    'das Glas',
    'das Tablet',
    'das Handy',
    'das Mobiltelefon',
    'das Buch',
    'die Maus',
    'die Brille',
    'die Tafel',
    'die Schere',
    'die Tasche',
    'die Lampe',
    'die Tür',
    'der Lehrer',
    'das Fahrrad',
    'der Hund',
    'die Katze',
    'der Rucksack'
)
ON CONFLICT (card_id, tag_id) DO NOTHING;
*/ 