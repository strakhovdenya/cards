-- Миграция для добавления полей word_type и grammar_data в таблицу cards
-- Дата: 2024-09-07

-- Добавляем поле для типа слова
ALTER TABLE cards ADD COLUMN word_type VARCHAR(20) DEFAULT 'noun';

-- Добавляем поле для грамматических данных в формате JSON
ALTER TABLE cards ADD COLUMN grammar_data JSONB DEFAULT '{}';

-- Добавляем поле для базовой формы слова (без артикля, без множественного числа и т.д.)
ALTER TABLE cards ADD COLUMN base_form VARCHAR(255);

-- Создаем индекс для быстрого поиска по типу слова
CREATE INDEX idx_cards_word_type ON cards(word_type);

-- Создаем GIN индекс для быстрого поиска по JSON полю
CREATE INDEX idx_cards_grammar_data ON cards USING GIN(grammar_data);

-- Создаем индекс для быстрого поиска по базовой форме
CREATE INDEX idx_cards_base_form ON cards(base_form);

-- Добавляем ограничение для валидных типов слов
ALTER TABLE cards ADD CONSTRAINT check_word_type 
CHECK (word_type IN (
  'noun',        -- существительное
  'verb',        -- глагол
  'adjective',   -- прилагательное
  'adverb',      -- наречие
  'phrase',      -- фраза/выражение
  'question',    -- вопрос
  'preposition', -- предлог
  'pronoun',     -- местоимение
  'conjunction', -- союз
  'other'        -- прочее
));

-- Комментарии к полям
COMMENT ON COLUMN cards.word_type IS 'Тип слова: noun, verb, adjective, adverb, phrase, question, preposition, pronoun, conjunction, other';
COMMENT ON COLUMN cards.grammar_data IS 'Дополнительные грамматические данные в формате JSON, специфичные для каждого типа слова';
COMMENT ON COLUMN cards.base_form IS 'Базовая форма слова без артикля, множественного числа и других грамматических модификаций';

-- Примеры использования grammar_data:
-- Существительные: {"article": "der", "plural": "die Bücher", "genitive": "des Buches"}
-- Прилагательные: {"comparative": "besser", "superlative": "am besten"}
-- Глаголы: {"past": "las", "past_participle": "gelesen", "auxiliary": "haben"}
-- Фразы: {"category": "greeting", "formality": "informal"}
