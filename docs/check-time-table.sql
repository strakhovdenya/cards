-- Скрипт для проверки и создания таблицы time_questions

-- Проверяем, существует ли таблица
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'time_questions'
) as table_exists;

-- Если таблица не существует, создаем её
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'time_questions'
    ) THEN
        -- Создаем таблицу
        CREATE TABLE time_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            time_value VARCHAR(5) NOT NULL UNIQUE,
            hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
            minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 55 AND minute % 5 = 0),
            formal_description TEXT NOT NULL,
            formal_words TEXT[] NOT NULL,
            informal_description TEXT NOT NULL,
            informal_words TEXT[] NOT NULL,
            word_pool TEXT[] NOT NULL,
            difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Создаем индексы
        CREATE INDEX idx_time_questions_time_value ON time_questions(time_value);
        CREATE INDEX idx_time_questions_hour ON time_questions(hour);
        CREATE INDEX idx_time_questions_minute ON time_questions(minute);
        CREATE INDEX idx_time_questions_active ON time_questions(is_active);

        -- Создаем триггер для обновления updated_at
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

        -- Включаем RLS
        ALTER TABLE time_questions ENABLE ROW LEVEL SECURITY;

        -- Создаем политики
        CREATE POLICY "Users can view active time questions" ON time_questions
            FOR SELECT USING (is_active = true);

        CREATE POLICY "Admins can manage all time questions" ON time_questions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE auth.users.id = auth.uid() 
                    AND auth.users.raw_user_meta_data->>'role' = 'admin'
                )
            );

        RAISE NOTICE 'Table time_questions created successfully';
    ELSE
        RAISE NOTICE 'Table time_questions already exists';
    END IF;
END $$;

-- Проверяем количество записей
SELECT COUNT(*) as total_records FROM time_questions;

-- Показываем несколько примеров
SELECT 
    time_value,
    formal_description,
    informal_description,
    difficulty_level
FROM time_questions 
ORDER BY hour, minute 
LIMIT 10; 