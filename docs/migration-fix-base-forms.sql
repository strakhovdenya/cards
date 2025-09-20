-- Миграция для правильного заполнения поля base_form в таблице cards
-- Дата: 2024-09-07
-- Версия: 2.0 (улучшенная)

-- Заполняем поле base_form для всех записей с улучшенной логикой
UPDATE cards 
SET base_form = CASE 
  -- СЛУЧАЙ 1: Существительные с артиклем и множественным числом
  -- Формат: "der Buch, die Bücher" -> "Buch"
  WHEN german_word ~ '^(der|die|das)\s+[^,]+,\s*die\s+\w+' THEN 
    regexp_replace(
      substring(german_word from '^(der|die|das)\s+([^,]+),'), 
      '^(der|die|das)\s+', 
      ''
    )
  
  -- СЛУЧАЙ 2: Существительные только с артиклем (без множественного)
  -- Формат: "der Buch" -> "Buch"
  WHEN german_word ~ '^(der|die|das)\s+\w+$' THEN 
    regexp_replace(german_word, '^(der|die|das)\s+', '')
  
  -- СЛУЧАЙ 3: Сложные существительные с дополнительными формами
  -- Формат: "die Jugendliche, die Jugendlichen" -> "Jugendliche"
  WHEN german_word ~ '^(der|die|das)\s+[^,]+,\s*(der|die|das)\s+\w+' THEN 
    regexp_replace(
      substring(german_word from '^(der|die|das)\s+([^,]+),'), 
      '^(der|die|das)\s+', 
      ''
    )
  
  -- СЛУЧАЙ 4: Слова без артикля - оставляем как есть
  -- Формат: "anstrengend", "lesen", "tut mir leid"
  ELSE TRIM(german_word)
END;

-- Дополнительная очистка: убираем лишние пробелы и нормализуем
UPDATE cards 
SET base_form = TRIM(base_form)
WHERE base_form IS NOT NULL;

-- Проверяем, что все записи заполнены
UPDATE cards 
SET base_form = german_word 
WHERE base_form IS NULL OR base_form = '';

-- Показываем статистику заполнения
SELECT 
  'Статистика заполнения base_form' as info,
  COUNT(*) as total_cards,
  COUNT(base_form) as filled_base_forms,
  COUNT(*) - COUNT(base_form) as empty_base_forms
FROM cards;

-- Показываем примеры по типам слов для проверки
SELECT 
  'Примеры по типам слов' as info,
  word_type,
  german_word,
  base_form
FROM cards 
WHERE word_type IN ('noun', 'verb', 'adjective', 'phrase', 'question')
ORDER BY word_type, created_at DESC 
LIMIT 20;

-- Проверяем качество заполнения для существительных
SELECT 
  'Проверка существительных' as info,
  german_word,
  base_form,
  CASE 
    WHEN german_word ~ '^(der|die|das)\s+' AND base_form !~ '^(der|die|das)\s+' THEN 'OK'
    WHEN german_word !~ '^(der|die|das)\s+' AND german_word = base_form THEN 'OK'
    ELSE 'ПРОВЕРИТЬ'
  END as status
FROM cards 
WHERE word_type = 'noun'
ORDER BY created_at DESC 
LIMIT 10;
