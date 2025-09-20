-- Миграция для исправления поля base_form у существительных
-- Дата: 2024-09-07
-- Проблема: в base_form записывается артикль вместо самого слова

-- Исправляем base_form для существительных
-- Убираем артикль и оставляем только само слово

-- СЛУЧАЙ 1: Существительные с запятой (множественное число)
-- "die Kreide, die Kreiden" -> "Kreide"
UPDATE cards 
SET base_form = regexp_replace(
  split_part(german_word, ',', 1), 
  '^(der|die|das)\s+', 
  ''
)
WHERE word_type = 'noun' 
  AND german_word ~ '^(der|die|das)\s+'
  AND german_word ~ ',';

-- СЛУЧАЙ 2: Существительные без запятой (только артикль)
-- "die Uhr" -> "Uhr"
UPDATE cards 
SET base_form = regexp_replace(german_word, '^(der|die|das)\s+', '')
WHERE word_type = 'noun' 
  AND german_word ~ '^(der|die|das)\s+'
  AND german_word !~ ',';

-- СЛУЧАЙ 3: Если base_form все еще содержит только артикль
UPDATE cards 
SET base_form = regexp_replace(
  split_part(german_word, ',', 1), 
  '^(der|die|das)\s+', 
  ''
)
WHERE base_form IN ('der', 'die', 'das')
  AND german_word ~ '^(der|die|das)\s+';

-- Дополнительная очистка: убираем лишние пробелы
UPDATE cards 
SET base_form = TRIM(base_form)
WHERE word_type = 'noun';

-- Проверяем результат для существительных
SELECT 
  'Проверка исправления существительных' as info,
  german_word,
  base_form,
  CASE 
    WHEN base_form IN ('der', 'die', 'das') THEN 'ОШИБКА - все еще артикль'
    WHEN german_word ~ '^(der|die|das)\s+' AND base_form !~ '^(der|die|das)\s+' THEN 'OK - артикль убран'
    WHEN german_word !~ '^(der|die|das)\s+' AND german_word = base_form THEN 'OK - без артикля'
    ELSE 'ПРОВЕРИТЬ'
  END as status
FROM cards 
WHERE word_type = 'noun'
ORDER BY created_at DESC 
LIMIT 15;

-- Статистика по типам слов
SELECT 
  'Статистика по типам слов' as info,
  word_type,
  COUNT(*) as count
FROM cards 
GROUP BY word_type 
ORDER BY count DESC;
