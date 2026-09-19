# Система аутентификации German Word Cards

## Обзор

Приложение German Word Cards использует систему аутентификации на основе Supabase с приглашениями и ролевой моделью доступа.

## Основные возможности

### 🔐 Аутентификация
- **Вход по email/паролю** через Supabase Auth
- **Регистрация только по приглашениям** (после первого админа)
- **Автоматические профили пользователей** через триггеры БД
- **Защищенные маршруты** через Next.js middleware

### 👥 Роли пользователей
- **Админ** (`admin`): полный доступ + управление приглашениями
- **Пользователь** (`user`): доступ только к своим карточкам

### 📨 Система приглашений
- **Админы создают приглашения** с уникальными кодами
- **Универсальные приглашения** (без привязки к email)
- **Именные приглашения** (для конкретного email)
- **Срок действия 7 дней** с момента создания
- **Одноразовые коды** - после использования становятся недоступными

## Архитектура

### Компоненты
```
src/
├── constants/userRoles.ts          # Константы ролей и главный админ
├── lib/auth.ts                     # Основная библиотека аутентификации
├── middleware.ts                   # Защита маршрутов
├── components/
│   ├── AuthenticatedApp.tsx        # Обертка для аутентифицированных пользователей
│   └── auth/
│       ├── AuthForm.tsx            # Форма входа
│       ├── SignUpForm.tsx          # Форма регистрации
│       └── InviteManager.tsx       # Управление приглашениями (админы)
└── app/auth/
    ├── page.tsx                    # Страница входа
    ├── signup/page.tsx             # Страница регистрации
    └── callback/route.ts           # Обработка callback'ов Supabase
```

### База данных
```sql
-- Основные таблицы
profiles     # Профили пользователей (id, email, first_name, last_name, role)
invites      # Приглашения (invite_code, email, invited_by, used, expires_at)
cards        # Карточки с привязкой к user_id
tags         # Теги с привязкой к user_id
card_tags    # Связи карточек и тегов

-- Безопасность
Row Level Security (RLS) на всех таблицах
Триггеры для автоматического создания профилей
```

## Настройка

### 1. Константы пользователей
```typescript
// src/constants/userRoles.ts
export const ADMIN_EMAIL = 'strakhov.denya@gmail.com';
export const ROLE_ADMIN = 'admin';
export const ROLE_USER = 'user';
```

### 2. Переменные окружения (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. База данных
Выполните SQL из `database-schema-with-auth.sql` в Supabase Dashboard:
```bash
# Создает таблицы, политики RLS, триггеры
```

## Использование

### Первый запуск
1. **Первый пользователь** с email `strakhov.denya@gmail.com` автоматически получает роль админа
2. **Последующие регистрации** блокируются без кода приглашения

### Создание приглашений (для админов)
```typescript
// Универсальное приглашение
await createInvite('', userId);

// Именное приглашение
await createInvite('user@example.com', userId);
```

### Ссылки приглашений
```
https://your-app.com/auth/signup?invite=INVITE_CODE
```

## Логика защиты маршрутов

### Middleware (`src/middleware.ts`)
- **`/`** - требует аутентификации, иначе редирект на `/auth`
- **`/auth`** - для аутентифицированных редирект на `/`
- **`/auth/signup`** - блокируется если есть админы без валидного инвайт-кода

### Компоненты
- **`AuthenticatedApp`** - проверяет аутентификацию при загрузке
- Гидратацию обрабатывает `ThemeProvider` (`useServerInsertedHTML` для Emotion SSR) -
  отдельный компонент `ClientApp` для этого не нужен и удалён как мёртвый код (issue #6)

## Безопасность

### Row Level Security (RLS)
- **Карточки**: пользователь видит только свои
- **Теги**: пользователь видит только свои  
- **Профили**: пользователь видит только свой
- **Приглашения**: админы видят созданные ими, пользователи - отправленные им

### Триггеры
- **Автоматическое создание профиля** при регистрации пользователя
- **Автоматическое обновление** `updated_at` при изменениях

## Миграция данных

При включении аутентификации существующие карточки без `user_id` станут недоступными. Для миграции:

1. **Добавьте столбец user_id** в существующие таблицы
2. **Привяжите данные** к конкретному пользователю
3. **Включите RLS** после миграции

## Отладка

### Частые проблемы

1. **Ошибки при регистрации**
   - Проверьте настройки Supabase Auth
   - Убедитесь что профили создаются автоматически

2. **Карточки не отображаются**
   - Проверьте RLS политики
   - Убедитесь что у карточек есть user_id

3. **Приглашения не работают**
   - Проверьте права админа в таблице profiles
   - Убедитесь что срок действия не истёк

### Логирование
```typescript
// Включите логирование в компонентах
console.log('User:', user);
console.log('Profile:', profile);
console.log('Admin status:', isAdmin);
```

## API

### Основные функции

#### Аутентификация
```typescript
signInWithEmail(email, password)       # Вход
signUpWithEmail(signUpData)            # Регистрация
signOut()                              # Выход
getCurrentUser()                       # Получить текущего пользователя
```

#### Управление приглашениями
```typescript
createInvite(email, invitedBy)         # Создать приглашение
getInvites(userId)                     # Получить приглашения пользователя
validateInviteCode(code)               # Проверить код приглашения
```

#### Проверки
```typescript
isAdmin(userId)                        # Проверить права админа
checkIfAdminsExist()                   # Есть ли админы в системе
```

## Структура данных

### SignUpData
```typescript
interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  inviteCode?: string;
}
```

### Profile
```typescript
interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}
```

### Invite
```typescript
interface Invite {
  id: string;
  email: string;
  invite_code: string;
  invited_by: string;
  used: boolean;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}
``` 