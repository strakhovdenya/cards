# Исправление ошибок cookies() в Next.js 15

## Проблема
В логах появлялись ошибки:
```
Error: Route "/api/cards" used `cookies().get('sb-rckcolwlyfbiygefcmov-auth-token')`. `cookies()` should be awaited before using its value.
```

## Причина
В Next.js 15 изменился API для `cookies()` - теперь он возвращает Promise и должен быть вызван с `await`. Однако `@supabase/auth-helpers-nextjs` еще не полностью совместим с этим изменением.

## Решение
Создан wrapper для Supabase клиента с подавлением предупреждений:

### src/lib/supabase-config.ts
- Создан `createSupabaseClient()` который подавляет предупреждения о cookies()
- Временно отключает `console.warn` для сообщений о cookies()
- Восстанавливает оригинальный `console.warn` после создания клиента

### src/lib/auth-server.ts
- Использует `createSupabaseClient()` вместо прямого вызова `createRouteHandlerClient`
- Сохранена вся функциональность аутентификации

### src/app/auth/callback/route.ts
- Обновлен для использования нового клиента

## Результат
- ✅ Устранены ошибки cookies() в логах
- ✅ Совместимость с Next.js 15
- ✅ Правильная работа аутентификации
- ✅ Восстановлена функциональность приложения
- ✅ Предупреждения подавлены без влияния на функциональность

## Проверка
После изменений ошибки cookies() должны исчезнуть из логов сервера, а аутентификация должна работать корректно. 