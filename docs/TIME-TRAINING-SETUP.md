# Настройка системы изучения времени

## Шаги для настройки:

### 1. Создание таблицы (если не существует)
```sql
-- Выполните в Supabase SQL Editor
\i docs/check-time-table.sql
```

### 2. Генерация данных
```sql
-- Выполните в Supabase SQL Editor
\i docs/generate-all-time-questions.sql
```

### 3. Настройка политик доступа
```sql
-- Выполните в Supabase SQL Editor
\i docs/fix-time-table-policies.sql
```

### 4. Обновление пула слов и исправление неформальных описаний
Исправлены неформальные описания времени (теперь используется 12-часовой формат) и уменьшен пул слов:
```sql
-- Выполните в Supabase SQL Editor
\i docs/generate-all-time-questions.sql
```

**Исправления:**
- **16:00** → неформальное: "vier Uhr" (вместо "sechzehn Uhr")
- **16:30** → неформальное: "halb fünf" (вместо "halb siebzehn")
- **23:30** → неформальное: "halb null" (вместо "halb vierundzwanzig")
- **Пул слов**: Теперь ~10-15 слов с умными запутывающими словами

## Структура таблицы time_questions:

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | Уникальный идентификатор |
| time_value | TIME | Время в формате HH:MM |
| hour | INTEGER | Час (0-23) |
| minute | INTEGER | Минута (0, 5, 10, ..., 55) |
| formal_description | TEXT | Формальное описание времени |
| formal_words | TEXT[] | Слова для формального описания |
| informal_description | TEXT | Неформальное описание времени |
| informal_words | TEXT[] | Слова для неформального описания |
| word_pool | TEXT[] | Пул слов для выбора (~10-15 слов) |
| difficulty_level | INTEGER | Уровень сложности (1-5) |
| is_active | BOOLEAN | Активен ли вопрос |
| created_at | TIMESTAMP | Дата создания |
| updated_at | TIMESTAMP | Дата обновления |

## Уровни сложности:
- **1**: Простые времена (00:00, 12:00, 15:30)
- **2**: Времена с "halb" (14:30, 15:30)
- **3**: Времена с "nach" и "vor" (14:05, 14:25)
- **4**: Сложные времена (14:17, 15:43)
- **5**: Очень сложные времена (23:47, 01:23)

## API Endpoints:

### GET /api/time/random
Получить случайный вопрос о времени.

**Параметры:**
- `difficulty` (опционально): уровень сложности (1-5)

**Пример ответа:**
```json
{
  "data": {
    "id": "uuid",
    "time_value": "14:35",
    "hour": 14,
    "minute": 35,
    "formal_description": "Es ist vierzehn Uhr fünfunddreißig",
    "formal_words": ["Es", "ist", "vierzehn", "Uhr", "fünfunddreißig"],
    "informal_description": "Es ist fünf nach halb drei",
    "informal_words": ["Es", "ist", "fünf", "nach", "halb", "drei"],
    "word_pool": ["Es", "ist", "fünf", "nach", "halb", "drei", "vierzehn", "Uhr", "fünfunddreißig", "vor", "vier", "fünf", "null"],
    "difficulty_level": 3,
    "is_active": true
  },
  "message": "Random time question fetched successfully"
}
```

### GET /api/time/test
Тестовый endpoint для проверки подключения к базе данных.

**Пример ответа:**
```json
{
  "data": {
    "totalQuestions": 288,
    "sampleQuestions": [...],
    "message": "Database connection successful"
  },
  "message": "Time questions test successful"
}
```

## Использование в компоненте:

Компонент `TimeTraining` автоматически загружает вопросы через API и позволяет пользователям:
- Собирать фразы из слов
- Переключаться между формальным и неформальным стилем
- Проверять правильность ответов
- Отслеживать статистику

### Улучшения интерфейса:
- **Компактный пул слов**: Сетка с фиксированной высотой и прокруткой
- **Маленькие чипы**: Уменьшенный размер для лучшего размещения
- **Ограниченная высота**: Максимум 200px для пула слов
- **Умные запутывающие слова**: Слова из соседних часов для создания путаницы

## Политики безопасности:

- **Публичное чтение**: Все активные вопросы доступны для чтения
- **Аутентифицированные пользователи**: Полный доступ к таблице
- **RLS включен**: Безопасность на уровне строк 