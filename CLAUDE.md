# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

@project-management/DECISIONS.md

## Что это за проект

`cards` — веб-приложение для изучения языков по карточкам: флеш-карточки, тренажёр артиклей,
просмотр глаголов, мини-квиз по временам. Есть публичный демо-режим (`/demo`) без входа, который
показывает данные одного демо-пользователя в режиме только для чтения.

Проект одновременно является портфолио-проектом: код и процесс разработки должны выдерживать
взгляд со стороны на собеседовании.

**Прод живой.** `main` автоматически деплоится на Vercel (https://cards-indol-eight.vercel.app).
Supabase — один и тот же проект для прода и для preview-деплоев. Из этого следует почти всё, что
написано ниже про осторожность с изменениями.

## Стек и структура

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · MUI 7 (единственная UI-библиотека) ·
Supabase (БД + auth).

```
src/
  app/          роуты App Router; app/api — route handlers, app/auth — вход/регистрация,
                app/demo — публичный гостевой режим
  components/   UI-компоненты (+ auth/, navigation/)
  hooks/        useAuth, useCards, useVerbs, useLocalStorage
  services/     весь доступ к данным: cardService, nounService, tagService, timeService,
                verbService, speechService
  strategies/   стратегии режимов: карточки, редактор карточек, массовый импорт
                (Basic/Adaptive/Noun варианты + общие интерфейсы)
  lib/          supabase-клиенты (supabase.ts, auth.ts, auth-server.ts)
  types/        общие типы и интерфейсы стратегий
  data/         статические данные (sampleCards)
  utils/        cardUtils, verbUtils, migrateData
  constants/    userRoles
docs/           SQL-схемы, миграции и заметки по настройке Supabase
project-management/  DECISIONS.md, prd/, plan/
scripts/        хуки Claude Code (lint, typecheck, pre-commit gate)
.claude/        settings.json, ralph/ (автономный цикл), skills/
```

## Команды

```bash
npm run dev           # next dev --turbopack
npm run check         # lint:strict + format:check + tsc --noEmit — основной гейт
npm run build         # то, что реально валит прод-деплой, если сломано
npm run fix           # lint:fix + prettier --write
npm run test          # vitest run — юнит/интеграционные тесты (Vitest)
npm run test:watch    # vitest в watch-режиме
npm run test:coverage # vitest run --coverage
npm run test:e2e      # Playwright E2E против /demo — только вручную, только локально (см. ниже)
```

`npm run check` — обязателен перед каждым коммитом. `npm run build` — обязателен, если изменения
могут повлиять на сборку (новые импорты, server/client-компоненты, `next.config.ts`,
`NEXT_PUBLIC_*` переменные).

### E2E-тесты (Playwright)

`npm run test:e2e` запускает Playwright локально против `/demo`. Автоматический запуск в CI —
вне скоупа (требует секретов в GitHub Actions — отдельная будущая задача).

**Перед первым запуском:**

```bash
npx playwright install   # установить браузеры Playwright (один раз)
```

**Необходимые переменные окружения** (должны быть в `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` — URL Supabase-проекта (клиентский)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный anon-ключ Supabase
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — для серверного клиента (нужны в рантайме)
- `DEMO_USER_ID` — UUID демо-пользователя в Supabase Auth

Если переменные не заданы, `test:e2e` выдаёт явную ошибку конфигурации до запуска тестов.

Тесты поднимают приложение через `npm run build && npm run start` (прод-бандл, не dev-сервер) и
гоняются против реального Supabase-проекта с демо-данными. Данные только читаются — никакой
мутации. Не запускай тесты в цикле/retry без паузы: guest API лимитирован 60 req/min (ADR-005).

Юнит-тесты покрывают: `src/utils/` (cardUtils, verbUtils — полностью), `src/strategies/` (все 9
файлов — полностью), `src/services/` (cardService, tagService, nounService, verbService через мок
`fetch`; timeService через мок `getServiceSupabase()`). `speechService.ts` и `migrateData.ts` вне
скоупа: первый требует DOM-окружения (jsdom/happy-dom), второй — только приватная логика без
публичных точек входа. `npm run test` — добавить к обязательным проверкам перед коммитом,
если изменения затрагивают services/utils/strategies.

## Архитектурные правила

- **Доступ к данным живёт в `src/services`.** Компоненты и роуты не обращаются к Supabase
  напрямую — через сервис или хук. Не дублируй запрос в компоненте, если он уже есть в сервисе.
- **Новый режим тренировки/импорта — это стратегия**, а не ещё один `if` в существующем
  компоненте. Смотри существующие `*Strategy.ts` и их интерфейсы в `src/types`.
- **Демо-режим всегда read-only.** Гость (`DEMO_USER_ID`) видит данные, но не может создавать,
  редактировать, удалять или помечать выученным. Любая новая мутация обязана это учитывать.
- **Изоляция данных между пользователями не ослабевает.** RLS-политики в Supabase — единственное,
  что отделяет данные одного пользователя от другого; см. заметки в `docs/` про user-isolation и
  card-tags security. Изменение, расширяющее доступ, требует явного решения человека.
- **Мобильный вид — основной.** Приложением пользуются в основном с телефона, есть нижняя
  навигация; проверяй изменения в узком вьюпорте, а не только на десктопе.
- **Стили — только MUI** (`sx`, `styled`, тема в `ThemeProvider.tsx`); глобальные правила — через
  `MuiCssBaseline.styleOverrides`, без отдельных CSS-файлов и без Tailwind.
- **Rate limiting — в `src/proxy.ts`** (Next.js 16 proxy, аналог middleware). Публичные
  `guest=1` API-эндпоинты и `/auth/**` ограничены скользящим окном (`src/lib/rate-limit.ts`):
  основной путь — Upstash Redis (`@upstash/ratelimit`, общий счётчик на все Edge-инстансы,
  требует `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`), при недоступности Redis или
  отсутствии этих переменных — деградация на in-memory лимитер (счётчик локален для инстанса).
  Реальные вызовы Supabase Auth (signIn/signUp) идут браузер → Supabase напрямую и покрываются
  встроенным rate limiting Supabase.

## Изменения схемы БД

SQL-схемы и миграции лежат в `docs/*.sql` и применяются **вручную человеком** в Supabase SQL
editor — против того же проекта, на котором работает живое приложение.

- Ломающая миграция (`DROP`, `RENAME`, сужение типа, ужесточение `NOT NULL`) роняет прод
  немедленно, ещё до того, как связанный PR будет смёржен.
- Поэтому порядок всегда такой: **аддитивная миграция → код, работающий с новым вариантом →
  выкатка → отдельной задачей удаление старого.**
- Автономный агент (Ralph) не имеет прав на `docs/**` вообще и обязан ответить
  `BLOCKED-DB-CHANGE`, если задача требует изменения схемы.

## Рабочий процесс

Цепочка для крупной фичи: `/prd` → `/plan` → `/issues` → реализация → PR → мёрдж человеком.
Для одиночной задачи PRD и план не нужны — сразу GitHub Issue по формату из
`.claude/skills/issues/SKILL.md`.

- **Plan-first**: перед изменениями кода покажи план (файлы, подход, риски) и дождись
  подтверждения.
- **Issue-first**: у задачи должен быть GitHub Issue с заполненным телом (не только заголовок) —
  он же спецификация для автономного агента.
- **Branch-first**: ветка `task/ISSUE-<n>-short-description` от свежего `main`. Прямые коммиты в
  `main` запрещены.
- PR обязан содержать `Closes #<n>`. Мёрдж делает человек, после того как посмотрел Vercel
  preview этого PR.
- Работай над одной задачей за раз. Не смешивай несвязанные изменения в одном PR.
- **Находка вне скоупа активной задачи** (баг, замеченный попутно): если она не нужна для того,
  чтобы текущая задача работала — не чини сейчас, заведи отдельный issue и продолжай. Если нужна —
  чини в этом же PR и упомяни в описании PR.

## Перед коммитом

- [ ] `npm run check` зелёный
- [ ] `npm run build` зелёный (если изменения могли повлиять на сборку)
- [ ] Acceptance Criteria в issue отмечены и соответствуют тому, что реально сделано
- [ ] Спросить пользователя, нужен ли `/code-review` по этому дифу
- [ ] Спросить, нужно ли обновить `README.md`

Хук `scripts/pre-commit-gate-hook.js` показывает часть этих вопросов автоматически перед
`git commit`/`git push`.

## Документация

- Изменил структуру, архитектурное правило или схему данных — обнови этот файл в том же PR.
- Решение, которое не хочется передоговаривать заново, — в `project-management/DECISIONS.md`.
- Не коммить секреты, `.env`, ключи Supabase.

## Автономный цикл (Ralph)

`.claude/ralph/` — оркестратор, который берёт готовый GitHub Issue, реализует его отдельным
`claude -p` без доступа к git/gh, прогоняет два независимых ревью-пасса и создаёт PR. Мёрдж
всегда делает человек. Подробности, ограничения и запуск — `.claude/ralph/README.md`.

## Context management

For tasks that require understanding unfamiliar parts of the codebase,
delegate broad exploration to the research subagent first.

Use subagents for:

- discovering relevant files
- tracing dependencies and call sites
- understanding unfamiliar implementations
- broad repository searches

Keep the main context focused on files that will actually be modified.

Do not delegate active implementation work or files currently being edited.
