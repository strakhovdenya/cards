-- Скрипт для проверки данных перед миграцией глаголов
-- Выполните этот скрипт перед copy-verbs-to-all-users.sql

-- 1. Проверяем существование исходного пользователя
SELECT 
    'Исходный пользователь' as check_type,
    CASE 
        WHEN EXISTS(SELECT 1 FROM auth.users WHERE id = 'cac55133-1b29-46b8-bd86-eac548c60e1c') 
        THEN 'Найден' 
        ELSE 'НЕ НАЙДЕН' 
    END as status;

-- 2. Проверяем количество глаголов у исходного пользователя
SELECT 
    'Глаголы исходного пользователя' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'Есть глаголы для копирования'
        ELSE 'НЕТ ГЛАГОЛОВ ДЛЯ КОПИРОВАНИЯ'
    END as status
FROM verbs 
WHERE user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c';

-- 3. Показываем список глаголов исходного пользователя
SELECT 
    'Список глаголов' as check_type,
    infinitive,
    translation,
    learned
FROM verbs 
WHERE user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'
ORDER BY infinitive;

-- 4. Проверяем количество целевых пользователей
SELECT 
    'Целевые пользователи' as check_type,
    COUNT(*) as count,
    'Пользователи с профилями (кроме исходного)' as description
FROM auth.users u
WHERE u.id != 'cac55133-1b29-46b8-bd86-eac548c60e1c'
  AND EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.id = u.id
  );

-- 5. Показываем список целевых пользователей
SELECT 
    'Список целевых пользователей' as check_type,
    u.id,
    p.first_name,
    p.last_name,
    p.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.id != 'cac55133-1b29-46b8-bd86-eac548c60e1c'
  AND EXISTS (
    SELECT 1 
    FROM profiles p2 
    WHERE p2.id = u.id
  )
ORDER BY p.first_name, p.last_name;

-- 6. Проверяем, у каких пользователей уже есть глаголы
SELECT 
    'Пользователи с существующими глаголами' as check_type,
    v.user_id,
    p.first_name,
    p.last_name,
    COUNT(v.id) as verbs_count
FROM verbs v
LEFT JOIN profiles p ON v.user_id = p.id
WHERE v.user_id != 'cac55133-1b29-46b8-bd86-eac548c60e1c'
GROUP BY v.user_id, p.first_name, p.last_name
ORDER BY verbs_count DESC; 