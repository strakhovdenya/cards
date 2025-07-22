-- Создание таблицы для тренировки времени
-- Время кратно 5 минутам (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)

-- Создание таблицы
CREATE TABLE IF NOT EXISTS time_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time_value VARCHAR(5) NOT NULL UNIQUE, -- формат "HH:MM"
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 55 AND minute % 5 = 0),
    
    -- Формальное описание времени
    formal_description TEXT NOT NULL,
    formal_words TEXT[] NOT NULL, -- массив слов для формального описания
    
    -- Неформальное описание времени
    informal_description TEXT NOT NULL,
    informal_words TEXT[] NOT NULL, -- массив слов для неформального описания
    
    -- Пул слов для тренировки (включает правильные и лишние слова)
    word_pool TEXT[] NOT NULL,
    
    -- Метаданные
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_time_questions_time_value ON time_questions(time_value);
CREATE INDEX IF NOT EXISTS idx_time_questions_hour ON time_questions(hour);
CREATE INDEX IF NOT EXISTS idx_time_questions_minute ON time_questions(minute);
CREATE INDEX IF NOT EXISTS idx_time_questions_active ON time_questions(is_active);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_questions_updated_at 
    BEFORE UPDATE ON time_questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE time_questions ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все пользователи могут читать активные вопросы)
CREATE POLICY "Users can view active time questions" ON time_questions
    FOR SELECT USING (is_active = true);

-- Политика для администраторов (могут управлять всеми вопросами)
CREATE POLICY "Admins can manage all time questions" ON time_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Вставка данных для всех вариантов времени (кратных 5 минутам)
-- Примеры для нескольких часов (можно расширить для всех 24 часов)

-- 00:00 - полночь
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:00', 0, 0, 'null Uhr null', ARRAY['null', 'Uhr', 'null'], 'Mitternacht', ARRAY['Mitternacht'], ARRAY['null', 'Uhr', 'null', 'Mitternacht', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:05
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:05', 0, 5, 'null Uhr fünf', ARRAY['null', 'Uhr', 'fünf'], 'fünf nach zwölf', ARRAY['fünf', 'nach', 'zwölf'], ARRAY['null', 'Uhr', 'fünf', 'nach', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:10
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:10', 0, 10, 'null Uhr zehn', ARRAY['null', 'Uhr', 'zehn'], 'zehn nach zwölf', ARRAY['zehn', 'nach', 'zwölf'], ARRAY['null', 'Uhr', 'zehn', 'nach', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:15
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:15', 0, 15, 'null Uhr fünfzehn', ARRAY['null', 'Uhr', 'fünfzehn'], 'viertel nach zwölf', ARRAY['viertel', 'nach', 'zwölf'], ARRAY['null', 'Uhr', 'fünfzehn', 'viertel', 'nach', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:20
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:20', 0, 20, 'null Uhr zwanzig', ARRAY['null', 'Uhr', 'zwanzig'], 'zwanzig nach zwölf', ARRAY['zwanzig', 'nach', 'zwölf'], ARRAY['null', 'Uhr', 'zwanzig', 'nach', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'fünfzehn', 'dreizehn', 'vierzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:25
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:25', 0, 25, 'null Uhr fünfundzwanzig', ARRAY['null', 'Uhr', 'fünfundzwanzig'], 'fünf vor halb eins', ARRAY['fünf', 'vor', 'halb', 'eins'], ARRAY['null', 'Uhr', 'fünfundzwanzig', 'fünf', 'vor', 'halb', 'eins', 'zwei', 'drei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- 00:30
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:30', 0, 30, 'null Uhr dreißig', ARRAY['null', 'Uhr', 'dreißig'], 'halb eins', ARRAY['halb', 'eins'], ARRAY['null', 'Uhr', 'dreißig', 'halb', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1);

-- 00:35
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:35', 0, 35, 'null Uhr fünfunddreißig', ARRAY['null', 'Uhr', 'fünfunddreißig'], 'fünf nach halb eins', ARRAY['fünf', 'nach', 'halb', 'eins'], ARRAY['null', 'Uhr', 'fünfunddreißig', 'fünf', 'nach', 'halb', 'eins', 'zwei', 'drei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- 00:40
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:40', 0, 40, 'null Uhr vierzig', ARRAY['null', 'Uhr', 'vierzig'], 'zwanzig vor eins', ARRAY['zwanzig', 'vor', 'eins'], ARRAY['null', 'Uhr', 'vierzig', 'zwanzig', 'vor', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- 00:45
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:45', 0, 45, 'null Uhr fünfundvierzig', ARRAY['null', 'Uhr', 'fünfundvierzig'], 'viertel vor eins', ARRAY['viertel', 'vor', 'eins'], ARRAY['null', 'Uhr', 'fünfundvierzig', 'viertel', 'vor', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- 00:50
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:50', 0, 50, 'null Uhr fünfzig', ARRAY['null', 'Uhr', 'fünfzig'], 'zehn vor eins', ARRAY['zehn', 'vor', 'eins'], ARRAY['null', 'Uhr', 'fünfzig', 'zehn', 'vor', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- 00:55
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('00:55', 0, 55, 'null Uhr fünfundfünfzig', ARRAY['null', 'Uhr', 'fünfundfünfzig'], 'fünf vor eins', ARRAY['fünf', 'vor', 'eins'], ARRAY['null', 'Uhr', 'fünfundfünfzig', 'fünf', 'vor', 'eins', 'zwei', 'drei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- Примеры для других часов (01:00 - 01:55)
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('01:00', 1, 0, 'eins Uhr null', ARRAY['eins', 'Uhr', 'null'], 'eins Uhr', ARRAY['eins', 'Uhr'], ARRAY['eins', 'Uhr', 'null', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('01:05', 1, 5, 'eins Uhr fünf', ARRAY['eins', 'Uhr', 'fünf'], 'fünf nach eins', ARRAY['fünf', 'nach', 'eins'], ARRAY['eins', 'Uhr', 'fünf', 'nach', 'zwei', 'drei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('01:15', 1, 15, 'eins Uhr fünfzehn', ARRAY['eins', 'Uhr', 'fünfzehn'], 'viertel nach eins', ARRAY['viertel', 'nach', 'eins'], ARRAY['eins', 'Uhr', 'fünfzehn', 'viertel', 'nach', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('01:30', 1, 30, 'eins Uhr dreißig', ARRAY['eins', 'Uhr', 'dreißig'], 'halb zwei', ARRAY['halb', 'zwei'], ARRAY['eins', 'Uhr', 'dreißig', 'halb', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('01:45', 1, 45, 'eins Uhr fünfundvierzig', ARRAY['eins', 'Uhr', 'fünfundvierzig'], 'viertel vor zwei', ARRAY['viertel', 'vor', 'zwei'], ARRAY['eins', 'Uhr', 'fünfundvierzig', 'viertel', 'vor', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- Примеры для 12:00 - 12:55 (полдень)
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('12:00', 12, 0, 'zwölf Uhr null', ARRAY['zwölf', 'Uhr', 'null'], 'Mittag', ARRAY['Mittag'], ARRAY['zwölf', 'Uhr', 'null', 'Mittag', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('12:15', 12, 15, 'zwölf Uhr fünfzehn', ARRAY['zwölf', 'Uhr', 'fünfzehn'], 'viertel nach zwölf', ARRAY['viertel', 'nach', 'zwölf'], ARRAY['zwölf', 'Uhr', 'fünfzehn', 'viertel', 'nach', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('12:30', 12, 30, 'zwölf Uhr dreißig', ARRAY['zwölf', 'Uhr', 'dreißig'], 'halb eins', ARRAY['halb', 'eins'], ARRAY['zwölf', 'Uhr', 'dreißig', 'halb', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('12:45', 12, 45, 'zwölf Uhr fünfundvierzig', ARRAY['zwölf', 'Uhr', 'fünfundvierzig'], 'viertel vor eins', ARRAY['viertel', 'vor', 'eins'], ARRAY['zwölf', 'Uhr', 'fünfundvierzig', 'viertel', 'vor', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- Примеры для 14:00 - 14:55 (два часа дня)
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('14:00', 14, 0, 'vierzehn Uhr null', ARRAY['vierzehn', 'Uhr', 'null'], 'zwei Uhr', ARRAY['zwei', 'Uhr'], ARRAY['vierzehn', 'Uhr', 'null', 'zwei', 'eins', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('14:15', 14, 15, 'vierzehn Uhr fünfzehn', ARRAY['vierzehn', 'Uhr', 'fünfzehn'], 'viertel nach zwei', ARRAY['viertel', 'nach', 'zwei'], ARRAY['vierzehn', 'Uhr', 'fünfzehn', 'viertel', 'nach', 'zwei', 'eins', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('14:30', 14, 30, 'vierzehn Uhr dreißig', ARRAY['vierzehn', 'Uhr', 'dreißig'], 'halb drei', ARRAY['halb', 'drei'], ARRAY['vierzehn', 'Uhr', 'dreißig', 'halb', 'drei', 'eins', 'zwei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 1),
('14:35', 14, 35, 'vierzehn Uhr fünfunddreißig', ARRAY['vierzehn', 'Uhr', 'fünfunddreißig'], 'fünf nach halb drei', ARRAY['fünf', 'nach', 'halb', 'drei'], ARRAY['vierzehn', 'Uhr', 'fünfunddreißig', 'fünf', 'nach', 'halb', 'drei', 'eins', 'zwei', 'vier', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2),
('14:45', 14, 45, 'vierzehn Uhr fünfundvierzig', ARRAY['vierzehn', 'Uhr', 'fünfundvierzig'], 'viertel vor drei', ARRAY['viertel', 'vor', 'drei'], ARRAY['vierzehn', 'Uhr', 'fünfundvierzig', 'viertel', 'vor', 'drei', 'eins', 'zwei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'dreiundzwanzig', 'vierundzwanzig'], 2);

-- Примеры для 23:00 - 23:55 (поздний вечер)
INSERT INTO time_questions (time_value, hour, minute, formal_description, formal_words, informal_description, informal_words, word_pool, difficulty_level) VALUES
('23:00', 23, 0, 'dreiundzwanzig Uhr null', ARRAY['dreiundzwanzig', 'Uhr', 'null'], 'elf Uhr', ARRAY['elf', 'Uhr'], ARRAY['dreiundzwanzig', 'Uhr', 'null', 'elf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'vierundzwanzig'], 2),
('23:30', 23, 30, 'dreiundzwanzig Uhr dreißig', ARRAY['dreiundzwanzig', 'Uhr', 'dreißig'], 'halb zwölf', ARRAY['halb', 'zwölf'], ARRAY['dreiundzwanzig', 'Uhr', 'dreißig', 'halb', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'vierundzwanzig'], 2),
('23:45', 23, 45, 'dreiundzwanzig Uhr fünfundvierzig', ARRAY['dreiundzwanzig', 'Uhr', 'fünfundvierzig'], 'viertel vor zwölf', ARRAY['viertel', 'vor', 'zwölf'], ARRAY['dreiundzwanzig', 'Uhr', 'fünfundvierzig', 'viertel', 'vor', 'zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig', 'einundzwanzig', 'zweiundzwanzig', 'vierundzwanzig'], 3);

-- Создание представления для удобного получения случайных вопросов
CREATE OR REPLACE VIEW random_time_questions AS
SELECT 
    id,
    time_value,
    hour,
    minute,
    formal_description,
    formal_words,
    informal_description,
    informal_words,
    word_pool,
    difficulty_level,
    RANDOM() as random_order
FROM time_questions 
WHERE is_active = true
ORDER BY random_order;

-- Комментарии к таблице
COMMENT ON TABLE time_questions IS 'Таблица для тренировки времени на немецком языке';
COMMENT ON COLUMN time_questions.time_value IS 'Время в формате HH:MM';
COMMENT ON COLUMN time_questions.hour IS 'Час (0-23)';
COMMENT ON COLUMN time_questions.minute IS 'Минута (кратна 5)';
COMMENT ON COLUMN time_questions.formal_description IS 'Формальное описание времени';
COMMENT ON COLUMN time_questions.formal_words IS 'Массив слов для формального описания';
COMMENT ON COLUMN time_questions.informal_description IS 'Неформальное описание времени';
COMMENT ON COLUMN time_questions.informal_words IS 'Массив слов для неформального описания';
COMMENT ON COLUMN time_questions.word_pool IS 'Пул слов для тренировки (включает правильные и лишние)';
COMMENT ON COLUMN time_questions.difficulty_level IS 'Уровень сложности (1-3)';
COMMENT ON COLUMN time_questions.is_active IS 'Активен ли вопрос для тренировки'; 