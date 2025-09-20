-- Миграция для обновления типов слов в таблице cards
-- Дата: 2024-09-07

-- Обновляем тип слов на основе наличия артикля
-- Слова с артиклем der/die/das становятся существительными (noun)
UPDATE cards 
SET word_type = 'noun'
WHERE german_word ~ '^(der|die|das)\s+';

-- Слова без артикля, которые выглядят как глаголы (заканчиваются на -en, -n)
UPDATE cards 
SET word_type = 'verb'
WHERE word_type = 'noun' 
  AND german_word ~ '(en|n)$'
  AND german_word !~ '^(der|die|das)\s+';

-- Слова без артикля, которые выглядят как прилагательные (заканчиваются на -ig, -lich, -isch, -sam)
UPDATE cards 
SET word_type = 'adjective'
WHERE word_type = 'noun'
  AND german_word ~ '(ig|lich|isch|sam)$'
  AND german_word !~ '^(der|die|das)\s+';

-- Слова без артикля, которые содержат пробелы или знаки препинания - фразы
UPDATE cards 
SET word_type = 'phrase'
WHERE word_type = 'noun'
  AND (german_word ~ '\s+' OR german_word ~ '[?!.,]')
  AND german_word !~ '^(der|die|das)\s+';

-- Слова без артикля, которые являются вопросами
UPDATE cards 
SET word_type = 'question'
WHERE word_type = 'noun'
  AND german_word ~ '\?$'
  AND german_word !~ '^(der|die|das)\s+';

-- Все остальные слова без артикля становятся типом 'other'
UPDATE cards 
SET word_type = 'other'
WHERE word_type = 'noun'
  AND german_word !~ '^(der|die|das)\s+';

-- Заполняем grammar_data для существительных (извлекаем артикль и множественное число)
UPDATE cards 
SET grammar_data = jsonb_build_object(
  'article', CASE 
    WHEN german_word ~ '^der\s+' THEN 'der'
    WHEN german_word ~ '^die\s+' THEN 'die'
    WHEN german_word ~ '^das\s+' THEN 'das'
    ELSE NULL
  END,
  'plural', CASE 
    WHEN german_word ~ ',\s*die\s+\w+' THEN 
      'die ' || substring(german_word from ',\s*die\s+([^,]+)')
    ELSE NULL
  END
)
WHERE word_type = 'noun'
  AND german_word ~ '^(der|die|das)\s+';

-- Показываем статистику обновления типов слов
SELECT 
  word_type,
  COUNT(*) as count
FROM cards 
GROUP BY word_type 
ORDER BY count DESC;
