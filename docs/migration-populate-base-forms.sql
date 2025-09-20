-- Миграция для заполнения поля base_form в таблице cards
-- Дата: 2024-09-07

-- Заполняем поле base_form для всех записей
-- Для существительных: убираем артикль и множественное число
UPDATE cards 
SET base_form = CASE 
  -- Если есть запятая, берем часть до запятой и убираем артикль
  WHEN german_word ~ '^(der|die|das)\s+[^,]+,' THEN 
    regexp_replace(substring(german_word from '^(der|die|das)\s+([^,]+),'), '^(der|die|das)\s+', '')
  -- Если нет запятой, просто убираем артикль
  WHEN german_word ~ '^(der|die|das)\s+' THEN 
    regexp_replace(german_word, '^(der|die|das)\s+', '')
  -- Для остальных слов оставляем как есть
  ELSE german_word
END;

-- Показываем статистику заполнения
SELECT 
  COUNT(*) as total_cards,
  COUNT(base_form) as filled_base_forms,
  COUNT(*) - COUNT(base_form) as empty_base_forms
FROM cards;

-- Показываем примеры base_form для проверки
SELECT 
  german_word,
  base_form,
  word_type
FROM cards 
ORDER BY created_at DESC 
LIMIT 15;
