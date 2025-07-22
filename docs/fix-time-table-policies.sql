-- Скрипт для исправления RLS политик таблицы time_questions

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Users can view active time questions" ON time_questions;
DROP POLICY IF EXISTS "Admins can manage all time questions" ON time_questions;
DROP POLICY IF EXISTS "Allow read access to active time questions" ON time_questions;
DROP POLICY IF EXISTS "Allow admin full access" ON time_questions;

-- Создаем политику для чтения активных вопросов (доступно всем, включая анонимных)
CREATE POLICY "Allow read access to active time questions" ON time_questions
    FOR SELECT USING (is_active = true);

-- Создаем политику для аутентифицированных пользователей (полный доступ)
CREATE POLICY "Allow authenticated users full access" ON time_questions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Проверяем политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'time_questions';

-- Проверяем, что таблица доступна для чтения
SELECT COUNT(*) as active_questions FROM time_questions WHERE is_active = true; 