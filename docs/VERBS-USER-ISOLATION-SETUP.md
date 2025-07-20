# Настройка изоляции пользователей для глаголов

## Обзор

Система глаголов теперь полностью поддерживает изоляцию пользователей. Каждый пользователь может видеть и управлять только своими глаголами.

## Что было изменено

### 1. База данных

#### Обновленная схема таблицы `verbs`:
```sql
CREATE TABLE IF NOT EXISTS verbs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  infinitive TEXT NOT NULL,
  translation TEXT NOT NULL,
  conjugations JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_id UUID NOT NULL, -- Обязательное поле для изоляции
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Политики безопасности (RLS):
- `Users can view own verbs` - пользователи видят только свои глаголы
- `Users can insert own verbs` - пользователи могут создавать только свои глаголы
- `Users can update own verbs` - пользователи могут обновлять только свои глаголы
- `Users can delete own verbs` - пользователи могут удалять только свои глаголы

### 2. API маршруты

Все API маршруты для глаголов теперь фильтруют данные по `user_id`:

#### `/api/verbs` (GET, POST)
- GET: возвращает только глаголы текущего пользователя
- POST: создает глагол с `user_id` текущего пользователя

#### `/api/verbs/[id]` (GET, PUT, DELETE)
- Все операции проверяют принадлежность глагола текущему пользователю

#### `/api/verbs/random` (GET)
- Возвращает случайный глагол только из глаголов текущего пользователя

#### `/api/verbs/by-learned-status` (GET)
- Фильтрует по статусу изучения и принадлежности пользователю

#### `/api/verbs/search` (GET)
- Поиск только среди глаголов текущего пользователя

### 3. Аутентификация

Все API маршруты используют `getAuthenticatedUser()` для получения текущего пользователя:
```typescript
const { user, supabase } = await getAuthenticatedUser();
```

## Миграция

### Для существующих баз данных:

1. Выполните SQL скрипт `verbs-user-isolation-migration.sql` в Supabase SQL Editor
2. Убедитесь, что все существующие глаголы имеют правильный `user_id`

### Для новых установок:

1. Выполните обновленный `verbs-schema.sql`
2. Все новые глаголы будут автоматически привязаны к создавшему их пользователю

## Проверка работы

### 1. Создание глагола
```typescript
const response = await fetch('/api/verbs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    infinitive: 'arbeiten',
    translation: 'работать',
    conjugations: [...]
  })
});
```
Глагол автоматически получит `user_id` текущего пользователя.

### 2. Получение глаголов
```typescript
const response = await fetch('/api/verbs');
const { data } = await response.json();
// data содержит только глаголы текущего пользователя
```

### 3. Обновление глагола
```typescript
const response = await fetch(`/api/verbs/${verbId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ learned: true })
});
```
Обновление возможно только для глаголов текущего пользователя.

## Безопасность

### Row Level Security (RLS)
- Все операции с глаголами защищены на уровне базы данных
- Пользователи не могут получить доступ к глаголам других пользователей
- Даже если API фильтрация будет отключена, RLS продолжит защищать данные

### API уровень
- Все запросы проверяют аутентификацию
- Все операции фильтруют по `user_id`
- Ошибки аутентификации возвращают 401 статус

## Отладка

### Проверка пользователя в API:
```typescript
console.log('Current user ID:', user.id);
console.log('User email:', user.email);
```

### Проверка данных в базе:
```sql
-- Проверить глаголы конкретного пользователя
SELECT * FROM verbs WHERE user_id = 'user-uuid-here';

-- Проверить глаголы без user_id (не должно быть)
SELECT * FROM verbs WHERE user_id IS NULL;
```

## Возможные проблемы

### 1. Глаголы не отображаются
- Проверьте, что пользователь аутентифицирован
- Проверьте, что глаголы имеют правильный `user_id`
- Проверьте логи API для ошибок

### 2. Ошибки 401 Unauthorized
- Проверьте, что пользователь вошел в систему
- Проверьте, что токен аутентификации действителен

### 3. Ошибки 404 Not Found
- Проверьте, что глагол принадлежит текущему пользователю
- Проверьте, что `user_id` в базе данных соответствует текущему пользователю

## Тестирование

### Создание тестовых данных:
```sql
-- Создать глагол для конкретного пользователя
INSERT INTO verbs (infinitive, translation, conjugations, user_id) VALUES
('testen', 'тестировать', '[]'::jsonb, 'user-uuid-here');
```

### Проверка изоляции:
1. Войдите как пользователь A
2. Создайте глагол
3. Войдите как пользователь B
4. Убедитесь, что глагол пользователя A не виден пользователю B 