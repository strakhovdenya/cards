# Настройка базы данных Supabase

## Шаги настройки

### 1. Создание проекта в Supabase
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь инициализации базы данных

### 2. Получение креденшалов
1. В панели Supabase перейдите в Settings → API
2. Скопируйте:
   - Project URL
   - Service Role Key (для серверных операций)

### 3. Настройка переменных окружения
Обновите файл `.env.local`:
```env
SUPABASE_URL=ваш-project-url
SUPABASE_SERVICE_ROLE_KEY=ваш-service-role-key
```

### 4. Создание таблицы
1. В Supabase панели перейдите в SQL Editor
2. Выполните SQL из файла `database-schema.sql`
3. Это создаст:
   - Таблицу `cards` с необходимыми полями
   - Индексы для производительности
   - Row Level Security политики
   - Триггер для автоматического обновления `updated_at`

### 5. Структура таблицы

```sql
cards (
  id UUID PRIMARY KEY,
  german_word TEXT NOT NULL,
  translation TEXT NOT NULL,
  user_id UUID NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  learned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### 6. API Endpoints

Приложение предоставляет следующие API endpoints:

#### Основные операции
- `GET /api/cards?user_id=UUID` - получить все карточки пользователя
- `POST /api/cards` - создать новую карточку
- `GET /api/cards/[id]` - получить карточку по ID
- `PUT /api/cards/[id]` - обновить карточку
- `DELETE /api/cards/[id]` - удалить карточку

#### Фильтрация
- `GET /api/cards/by-tags?user_id=UUID&tags=tag1,tag2` - карточки по тегам
- `GET /api/cards/by-learned-status?user_id=UUID&learned=true/false` - по статусу

### 7. Аутентификация

В данный момент приложение использует user_id как параметр запроса. В продакшене рекомендуется:
1. Настроить Supabase Auth
2. Использовать JWT токены
3. Получать user_id из сессии, а не из параметров

### 8. Тестирование

После настройки вы можете протестировать API:

```javascript
// Создание карточки
const response = await fetch('/api/cards', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    germanWord: 'der Test',
    translation: 'тест',
    user_id: 'your-uuid-here',
    tags: ['тестирование']
  })
});
```

### 9. Миграция данных

Приложение автоматически мигрирует данные из `sampleCards.ts` при первом запуске. 

#### Ручная миграция (опционально):
```javascript
import { migrateSampleData, clearAllCards } from '@/utils/migrateData';

// Мигрировать sample данные
await migrateSampleData();

// Очистить все карточки (для разработки)
await clearAllCards();
```

### 10. Тестирование системы

1. **Запустите приложение:**
   ```bash
   npm run dev
   ```

2. **Проверьте миграцию:**
   - При первом запуске карточки из `sampleCards.ts` автоматически загрузятся в БД
   - Откройте консоль браузера для логов миграции

3. **Протестируйте функциональность:**
   - ✅ Просмотр карточек с тегами
   - ✅ Создание новых карточек с тегами
   - ✅ Редактирование карточек
   - ✅ Удаление карточек
   - ✅ Отметка карточек как выученных
   - ✅ Переключение между режимами просмотра и редактирования

4. **API тестирование:**
   ```bash
   # Получить все карточки
   curl http://localhost:3000/api/cards
   
   # Создать карточку
   curl -X POST http://localhost:3000/api/cards \
     -H "Content-Type: application/json" \
     -d '{"germanWord":"der Test","translation":"тест","tags":["тестирование"]}'
   ```

### 11. Что было реализовано

✅ **Серверная архитектура:**
- Supabase интеграция с Service Role Key
- API routes для всех CRUD операций
- Безопасность через серверные запросы

✅ **База данных:**
- Таблица с поддержкой user_id (UUID)
- Массив тегов (TEXT[])
- Булевое поле learned
- Автоматические триггеры updated_at

✅ **Типизация:**
- Полная TypeScript типизация
- API types для запросов/ответов
- Конвертация между DB и App типами

✅ **UI компоненты:**
- Поддержка тегов в форме создания/редактирования
- Отображение тегов в карточках
- Кнопка "выучено" в режиме просмотра
- Обработка ошибок и загрузки

✅ **Автоматическая миграция:**
- Конвертация старых данных при первом запуске
- Интеллектуальные теги на основе содержимого

### 12. Готовность к продакшену

Для продакшена добавьте:
1. **Аутентификацию Supabase Auth**
2. **Настройте RLS политики** (раскомментируйте в schema)
3. **Добавьте валидацию на API уровне**
4. **Настройте переменные окружения для prod** 