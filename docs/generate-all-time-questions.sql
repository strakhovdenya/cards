-- Скрипт для генерации всех вариантов времени (288 вариантов)
-- 24 часа × 12 минут (00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)

-- Функция для генерации немецких числительных
CREATE OR REPLACE FUNCTION get_german_number(num INTEGER) RETURNS TEXT AS $$
BEGIN
    CASE num
        WHEN 0 THEN RETURN 'null';
        WHEN 1 THEN RETURN 'eins';
        WHEN 2 THEN RETURN 'zwei';
        WHEN 3 THEN RETURN 'drei';
        WHEN 4 THEN RETURN 'vier';
        WHEN 5 THEN RETURN 'fünf';
        WHEN 6 THEN RETURN 'sechs';
        WHEN 7 THEN RETURN 'sieben';
        WHEN 8 THEN RETURN 'acht';
        WHEN 9 THEN RETURN 'neun';
        WHEN 10 THEN RETURN 'zehn';
        WHEN 11 THEN RETURN 'elf';
        WHEN 12 THEN RETURN 'zwölf';
        WHEN 13 THEN RETURN 'dreizehn';
        WHEN 14 THEN RETURN 'vierzehn';
        WHEN 15 THEN RETURN 'fünfzehn';
        WHEN 16 THEN RETURN 'sechzehn';
        WHEN 17 THEN RETURN 'siebzehn';
        WHEN 18 THEN RETURN 'achtzehn';
        WHEN 19 THEN RETURN 'neunzehn';
        WHEN 20 THEN RETURN 'zwanzig';
        WHEN 21 THEN RETURN 'einundzwanzig';
        WHEN 22 THEN RETURN 'zweiundzwanzig';
        WHEN 23 THEN RETURN 'dreiundzwanzig';
        WHEN 24 THEN RETURN 'vierundzwanzig';
        WHEN 25 THEN RETURN 'fünfundzwanzig';
        WHEN 30 THEN RETURN 'dreißig';
        WHEN 35 THEN RETURN 'fünfunddreißig';
        WHEN 40 THEN RETURN 'vierzig';
        WHEN 45 THEN RETURN 'fünfundvierzig';
        WHEN 50 THEN RETURN 'fünfzig';
        WHEN 55 THEN RETURN 'fünfundfünfzig';
        ELSE RETURN num::TEXT;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации формального описания времени
CREATE OR REPLACE FUNCTION get_formal_time_description(hour INTEGER, minute INTEGER) RETURNS TEXT AS $$
BEGIN
    RETURN get_german_number(hour) || ' Uhr ' || get_german_number(minute);
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации неформального описания времени
CREATE OR REPLACE FUNCTION get_informal_time_description(hour INTEGER, minute INTEGER) RETURNS TEXT AS $$
DECLARE
    next_hour INTEGER;
    informal_desc TEXT;
BEGIN
    -- Определяем следующий час для неформального описания
    next_hour := CASE WHEN hour = 23 THEN 0 ELSE hour + 1 END;
    
    -- Генерируем неформальное описание
    CASE minute
        WHEN 0 THEN
            IF hour = 0 THEN
                informal_desc := 'Mitternacht';
            ELSIF hour = 12 THEN
                informal_desc := 'Mittag';
            ELSE
                informal_desc := get_informal_hour(hour) || ' Uhr';
            END IF;
        WHEN 5 THEN
            informal_desc := 'fünf nach ' || get_informal_hour(hour);
        WHEN 10 THEN
            informal_desc := 'zehn nach ' || get_informal_hour(hour);
        WHEN 15 THEN
            informal_desc := 'viertel nach ' || get_informal_hour(hour);
        WHEN 20 THEN
            informal_desc := 'zwanzig nach ' || get_informal_hour(hour);
        WHEN 25 THEN
            informal_desc := 'fünf vor halb ' || get_informal_hour(next_hour);
        WHEN 30 THEN
            informal_desc := 'halb ' || get_informal_hour(next_hour);
        WHEN 35 THEN
            informal_desc := 'fünf nach halb ' || get_informal_hour(next_hour);
        WHEN 40 THEN
            informal_desc := 'zwanzig vor ' || get_informal_hour(next_hour);
        WHEN 45 THEN
            informal_desc := 'viertel vor ' || get_informal_hour(next_hour);
        WHEN 50 THEN
            informal_desc := 'zehn vor ' || get_informal_hour(next_hour);
        WHEN 55 THEN
            informal_desc := 'fünf vor ' || get_informal_hour(next_hour);
        ELSE
            informal_desc := get_informal_hour(hour) || ' Uhr ' || get_german_number(minute);
    END CASE;
    
    RETURN informal_desc;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации массива слов формального описания
CREATE OR REPLACE FUNCTION get_formal_words(hour INTEGER, minute INTEGER) RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY[get_german_number(hour), 'Uhr', get_german_number(minute)];
END;
$$ LANGUAGE plpgsql;



-- Функция для генерации массива слов неформального описания
CREATE OR REPLACE FUNCTION get_informal_words(hour INTEGER, minute INTEGER) RETURNS TEXT[] AS $$
DECLARE
    next_hour INTEGER;
    informal_words TEXT[];
BEGIN
    next_hour := CASE WHEN hour = 23 THEN 0 ELSE hour + 1 END;
    
    CASE minute
        WHEN 0 THEN
            IF hour = 0 THEN
                informal_words := ARRAY['Mitternacht'];
            ELSIF hour = 12 THEN
                informal_words := ARRAY['Mittag'];
            ELSE
                informal_words := ARRAY[get_informal_hour(hour), 'Uhr'];
            END IF;
        WHEN 5 THEN
            informal_words := ARRAY['fünf', 'nach', get_informal_hour(hour)];
        WHEN 10 THEN
            informal_words := ARRAY['zehn', 'nach', get_informal_hour(hour)];
        WHEN 15 THEN
            informal_words := ARRAY['viertel', 'nach', get_informal_hour(hour)];
        WHEN 20 THEN
            informal_words := ARRAY['zwanzig', 'nach', get_informal_hour(hour)];
        WHEN 25 THEN
            informal_words := ARRAY['fünf', 'vor', 'halb', get_informal_hour(next_hour)];
        WHEN 30 THEN
            informal_words := ARRAY['halb', get_informal_hour(next_hour)];
        WHEN 35 THEN
            informal_words := ARRAY['fünf', 'nach', 'halb', get_informal_hour(next_hour)];
        WHEN 40 THEN
            informal_words := ARRAY['zwanzig', 'vor', get_informal_hour(next_hour)];
        WHEN 45 THEN
            informal_words := ARRAY['viertel', 'vor', get_informal_hour(next_hour)];
        WHEN 50 THEN
            informal_words := ARRAY['zehn', 'vor', get_informal_hour(next_hour)];
        WHEN 55 THEN
            informal_words := ARRAY['fünf', 'vor', get_informal_hour(next_hour)];
        ELSE
            informal_words := ARRAY[get_informal_hour(hour), 'Uhr', get_german_number(minute)];
    END CASE;
    
    RETURN informal_words;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации пула слов
CREATE OR REPLACE FUNCTION get_word_pool(hour INTEGER, minute INTEGER) RETURNS TEXT[] AS $$
DECLARE
    next_hour INTEGER;
    correct_words TEXT[];
    final_pool TEXT[];
    confusing_words TEXT[];
    hour_for_confusion INTEGER;
BEGIN
    next_hour := CASE WHEN hour = 23 THEN 0 ELSE hour + 1 END;
    
    -- Получаем правильные слова для этого времени
    correct_words := array_cat(
        get_formal_words(hour, minute),
        get_informal_words(hour, minute)
    );
    
    -- Выбираем час для создания путаницы (соседний час)
    hour_for_confusion := CASE 
        WHEN hour = 0 THEN 1
        WHEN hour = 23 THEN 22
        ELSE hour + 1
    END;
    
    -- Добавляем слова, которые теоретически могли бы использоваться, но неправильны
    -- Это слова из соседних часов или похожих времен
    confusing_words := ARRAY[
        get_german_number(hour_for_confusion),  -- число соседнего часа
        get_informal_hour(hour_for_confusion),  -- неформальное число соседнего часа
        'Uhr',  -- всегда присутствует
        'null'  -- для полночи
    ];
    
    -- Добавляем специальные слова для полночи и полдня
    IF hour = 0 AND minute = 0 THEN
        confusing_words := array_append(confusing_words, 'Mitternacht');
    END IF;
    
    IF hour = 12 AND minute = 0 THEN
        confusing_words := array_append(confusing_words, 'Mittag');
    END IF;
    
    -- Объединяем правильные слова с запутывающими
    final_pool := array_cat(correct_words, confusing_words);
    
    -- Убираем дубликаты и сортируем
    final_pool := array(
        SELECT DISTINCT unnest(final_pool)
        ORDER BY unnest
    );
    
    RETURN final_pool;
END;
$$ LANGUAGE plpgsql;

-- Функция для определения уровня сложности
CREATE OR REPLACE FUNCTION get_difficulty_level(hour INTEGER, minute INTEGER) RETURNS INTEGER AS $$
BEGIN
    -- Простые случаи (минуты 00, 15, 30, 45)
    IF minute IN (0, 15, 30, 45) THEN
        RETURN 1;
    -- Средняя сложность (минуты 05, 10, 20, 40, 50, 55)
    ELSIF minute IN (5, 10, 20, 40, 50, 55) THEN
        RETURN 2;
    -- Высокая сложность (минуты 25, 35)
    ELSE
        RETURN 3;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Генерация всех вариантов времени
DO $$
DECLARE
    hour_val INTEGER;
    minute_val INTEGER;
    time_str TEXT;
BEGIN
    -- Очищаем таблицу перед заполнением
    DELETE FROM time_questions;
    
    -- Генерируем все 288 вариантов времени
    FOR hour_val IN 0..23 LOOP
        FOR minute_val IN SELECT unnest(ARRAY[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) LOOP
            -- Формируем строку времени
            time_str := lpad(hour_val::TEXT, 2, '0') || ':' || lpad(minute_val::TEXT, 2, '0');
            
            -- Вставляем запись
            INSERT INTO time_questions (
                time_value,
                hour,
                minute,
                formal_description,
                formal_words,
                informal_description,
                informal_words,
                word_pool,
                difficulty_level
            ) VALUES (
                time_str,
                hour_val,
                minute_val,
                get_formal_time_description(hour_val, minute_val),
                get_formal_words(hour_val, minute_val),
                get_informal_time_description(hour_val, minute_val),
                get_informal_words(hour_val, minute_val),
                get_word_pool(hour_val, minute_val),
                get_difficulty_level(hour_val, minute_val)
            );
        END LOOP;
    END LOOP;
END $$;

-- Проверка количества созданных записей
SELECT COUNT(*) as total_time_questions FROM time_questions;

-- Показать несколько примеров
SELECT 
    time_value,
    formal_description,
    informal_description,
    difficulty_level
FROM time_questions 
ORDER BY hour, minute 
LIMIT 20;

-- Очистка функций после использования
DROP FUNCTION IF EXISTS get_german_number(INTEGER);
DROP FUNCTION IF EXISTS get_formal_time_description(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_informal_time_description(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_formal_words(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_informal_words(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_word_pool(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_difficulty_level(INTEGER, INTEGER); 