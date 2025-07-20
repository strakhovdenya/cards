-- Миграция от массива тегов к системе отдельных таблиц
-- Выполните этот SQL ПОСЛЕ создания новых таблиц из database-schema-with-tags.sql

-- Шаг 1: Создать теги из существующих массивов tags в карточках
INSERT INTO tags (name, color, user_id)
SELECT DISTINCT 
  unnest(tags) as name,
  '#2196f3' as color, -- Цвет по умолчанию
  user_id
FROM cards 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
ON CONFLICT (name, user_id) DO NOTHING;

-- Шаг 2: Создать связи в таблице card_tags
INSERT INTO card_tags (card_id, tag_id)
SELECT DISTINCT
  c.id as card_id,
  t.id as tag_id
FROM cards c
CROSS JOIN unnest(c.tags) as tag_name
JOIN tags t ON t.name = tag_name AND t.user_id = c.user_id
WHERE c.tags IS NOT NULL 
  AND array_length(c.tags, 1) > 0;

-- Шаг 3: Проверить результаты миграции
-- Выводим статистику для проверки

SELECT 
  'Всего тегов:' as description,
  COUNT(*) as count
FROM tags

UNION ALL

SELECT 
  'Всего связей карточка-тег:' as description,
  COUNT(*) as count
FROM card_tags

UNION ALL

SELECT 
  'Карточки с тегами (старая система):' as description,
  COUNT(*) as count
FROM cards 
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0

UNION ALL

SELECT 
  'Карточки с тегами (новая система):' as description,
  COUNT(DISTINCT card_id) as count
FROM card_tags;

-- Шаг 4: ОСТОРОЖНО! Удаляем поле tags из таблицы cards
-- Выполните этот шаг только после проверки что миграция прошла успешно!

-- Проверочный запрос - сравнить количество тегов до и после миграции
/*
SELECT 
  c.id,
  c.german_word,
  array_length(c.tags, 1) as old_tags_count,
  COUNT(ct.tag_id) as new_tags_count,
  c.tags as old_tags,
  array_agg(t.name ORDER BY t.name) as new_tags
FROM cards c
LEFT JOIN card_tags ct ON c.id = ct.card_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.tags IS NOT NULL 
  AND array_length(c.tags, 1) > 0
GROUP BY c.id, c.german_word, c.tags
HAVING array_length(c.tags, 1) != COUNT(ct.tag_id)
ORDER BY c.german_word;
*/

-- Если проверочный запрос выше не возвращает строк (или возвращает только ожидаемые различия),
-- то можно безопасно удалить старое поле:

-- ALTER TABLE cards DROP COLUMN tags;

-- Примечание: После удаления поля tags нужно будет обновить код приложения
-- для работы с новой системой тегов через таблицы tags и card_tags 