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
  components/   UI-компоненты (+ auth/, navigation/); navigation/ModeSelectSheet.tsx — общий
                bottom-sheet компонент для меню выбора режима, переиспользуй его вместо нового
                Dialog > List > ListItemButton
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
src/__factory__/  интеграционный тест пакетного closure-gate хука на профиле Cards
.factory/       профиль dark-factory (profile.json) и PRD-overlay (overlays/prd.json)
.github/        workflows/ (CI и обёртки фабрики), verifier/ и calibration/ (trusted-конфиги)
.claude/        settings.json (пакетные хуки), skills/ (проектные tracked + управляемые копии пакета),
                agents/ (управляемые копии пакета)
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
`fetch`; timeService через мок `getServiceSupabase()`). `src/__factory__/closure-gate.test.ts` — интеграционный тест установленных хуков
`closure-gate.js`/`skill-marker.js` фабрики на профиле Cards (без реальных git-команд). `speechService.ts` и `migrateData.ts` вне
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
Для одиночной задачи PRD и план не нужны — сразу GitHub Issue по контракту
`node_modules/dark-factory/verifier/issue-contract.md` (скилл `issues`; проверка —
`node node_modules/dark-factory/verifier/issue-lint.js <file> --require-v2`). Процедура задачи от
одобренного плана до PR — скилл `task-lifecycle`.

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
- [ ] Код сверен со скилами, загруженными до написания (см. «Скиллы, агенты и хуки dark-factory»)
- [ ] Спросить пользователя, нужен ли `/code-review` по этому дифу
- [ ] Спросить, нужно ли обновить `README.md`

Пакетный хук `closure-gate.js` блокирует `git commit`/`git push`, пока в сессии не загружен
`task-lifecycle`, а затем спрашивает подтверждение закрытия.

## Скиллы, агенты и хуки dark-factory

Процессные скиллы, базовые JS-метаскиллы, агенты и хуки приходят из установленного пакета
`dark-factory` (`devDependencies`, закреплён на `github:strakhovdenya/dark-factory#v0.1.3`,
commit `33fa44be6803ad8c2190c3a60cd6ce41ff42b5df`). Проектные значения — в `.factory/profile.json`.

**Provisioning.** Отдельного корневого `postinstall` нет: обычный `npm install`/`npm ci` запускает
`postinstall` самой зависимости (`node_modules/dark-factory/bin/setup.js`), и тот раскладывает
управляемые копии базового набора — `prd`, `plan`, `issues`, `task-lifecycle`, `epic-discovery`,
`adr`, `js-conventions`, `js-gof`, `js-data-structures`, `error-handling`, `modern-javascript`,
`data-structures` в `.claude/skills/` и `research`, `codebase-scan`, `verify`, `pr-writer` в
`.claude/agents/` — плюс список `.claude/.factory-installed.json`. Все эти пути поимённо в
`.gitignore`; ручное копирование не нужно. Setup не усыновляет чужие каталоги и не переписывает
tracked-файлы: старая копия с тем же именем — конфликт, который разбирается руками, а не
расширением `.gitignore`. Проектные tracked-скиллы (`material-ui-nextjs`, `material-ui-styling`,
`tailwind-4-docs`, `ui-ux-pro-max`, `vercel-react-best-practices`, `vitest`) setup не трогает.
Обновление фабрики — отдельной задачей по `docs/upgrading.md` нового тега, а не `npm update`.

**Путь → скиллы.** Единая таблица пакета (`node_modules/dark-factory/profile/skill-rules.js`) плюс
`skillRules` профиля; её применяют и хук `skill-gate.js`, и Ralph:

- любой `.js`/`.mjs`/`.cjs`/`.ts`/`.tsx`/`.jsx` — `js-conventions`, `js-gof`,
  `js-data-structures`, `error-handling`, `modern-javascript`;
- `src/**/*.test.ts` — дополнительно `vitest` (профиль);
- `project-management/DECISIONS.md` (`docs.adr`) — `adr`.

Загружай скиллы через Skill до правки файла, а не после: `skill-gate.js` блокирует Write/Edit,
пока нужные скиллы не отмечены в сессии. Скиллы, на которые ссылается issue (`Docs to Read`),
читаются обязательно.

**Хуки.** `.claude/settings.json` содержит шесть записей пяти пакетных хуков ровно в форме
`node_modules/dark-factory/hooks/README.md`: гейты `closure-gate.js` (Bash и
`mcp__github__issue_write`) и `skill-gate.js` (Write|Edit) заканчиваются на `|| exit 2`, помощники
`skill-marker.js` (Skill), `lint.js` и `typecheck.js` (Write|Edit) — на `|| true`. Команды lint и
typecheck берутся из `hooks` профиля.

**Восстановление.** Гейты fail-closed: если `node_modules/dark-factory` отсутствует или сломан
(свежий клон без установки, удалённый `node_modules`, битый релиз), Bash-гейт блокирует **любую**
Bash-команду в Claude Code, включая `npm install`. Чинить из обычного терминала вне Claude Code:
`npm ci` (или откат закрепления на предыдущий релиз), затем вернуться в сессию. Сломанный профиль
блокирует только commit/push, запись issue и любые Write/Edit (skill-gate читает профиль), а обычные
Bash-команды проходят — профиль чинится из сессии через Bash или из внешнего терминала.

**Порядок переключения на пакет (выполнен в #74; повторять при переподключении).** В обычном
терминале: просмотреть личные изменения старых копий и сохранить нужное → `git rm` только
tracked-копий → профиль, `package.json` и поимённые исключения `.gitignore` →
`npm install --ignore-scripts --save-dev "github:strakhovdenya/dark-factory#v0.1.3"` → сверить, что
`packages["node_modules/dark-factory"].resolved` в lock оканчивается на `#<commit тега>` →
`node node_modules/dark-factory/bin/setup.js --consumer-root .` → только после его успеха
подключить settings-хуки. Ignored личные файлы (`.claude/ralph/config.json`, `state.json`,
`.ralph-runs/`, `.claude/settings.local.json`, `scripts/*.log`) при этом не удаляются.
Симлинк `.claude/skills/metaskills` setup не принадлежит и не удаляется.

## Документация

- Изменил структуру, архитектурное правило или схему данных — обнови этот файл в том же PR.
- Решение, которое не хочется передоговаривать заново, — в `project-management/DECISIONS.md`.
- Не коммить секреты, `.env`, ключи Supabase.

## Автономный цикл (Ralph)

Ralph — контроллер пакета, а не копия в репозитории: берёт готовый GitHub Issue, реализует его
агентом в Docker (host fallback нет) без доступа к git/gh, прогоняет два независимых ревью
(`self-review` с бюджетом 4, `code-review` с бюджетом 2; `enabledSteps` в профиле нет), финальный
гейт и создаёт PR. Мёрдж всегда делает человек (ADR-001). Контракт —
`node_modules/dark-factory/ralph/README.md`.

- **Профиль** (`.factory/profile.json`, tracked): имя ветки — `branchTemplate`
  `task/ISSUE-{issue}-{slug}`; гейт — прямые node-бинари без shell в порядке ESLint →
  `prettier --check` → `tsc --noEmit` → `node node_modules/vitest/vitest.mjs run` → `next build`;
  широких разрешений `npm run *`/`npx *` у агента нет. Защищённые пути (`docs/` в том числе),
  `humanNeededVerdict` `BLOCKED-DB-CHANGE` и метка `ralph-needs-db-change`, ограничения окружения
  (нет dev-сервера, реальной Supabase, браузера). Финальный гейт идёт без сети; `codeload.github.com`
  в `sandbox.allowedHosts` нужен только install-шагу для GitHub-зависимости.
- **Личный конфиг запуска** — ignored `.ralph/config.json` (очередь `issues`, лимиты
  `maxIterations`/`maxTurns`/`reviewMaxTurns`, бюджеты, `agentModel`, `runsRoot`). `runsRoot` —
  абсолютный путь **вне домашнего каталога** оператора. `branchPrefix` больше не поддерживается —
  имя ветки задаёт профиль. Старые `.claude/ralph/config.json`/`state.json` несовместимы с новым
  форматом и остаются только как личный архив; credentials (`ANTHROPIC_API_KEY` или
  `CLAUDE_CODE_OAUTH_TOKEN`) — только в окружении процесса, никогда в файлах репозитория.
- **Запуск:** `node node_modules/dark-factory/ralph/run.js --config .ralph/config.json`.

## Acceptance Verifier и Calibration Judge (#75)

Обе части работают через короткие обёртки в `.github/workflows/`, которые вызывают reusable
workflows фабрики по полному commit тега v0.1.3 (`33fa44be…`, тот же, что в `package-lock.json`);
`uses@` и `with.factory-sha` всегда совпадают и переносятся вместе при обновлении фабрики.

- **Acceptance Verifier** (`acceptance-verifier.yml`, `workflow_run` после CI) проверяет PR против
  его issue и публикует статус `Acceptance Verifier` и комментарий с вердиктом. Режим —
  **advisory**: переменная `VERIFIER_ENFORCE` не задана, не-PASS вердикт статус не роняет, в branch
  protection он не требуется. Включены ровно семь детерминированных проверок `verifier.checks`
  профиля. Модель — переменная `VERIFIER_MODEL`, ключ — секрет `OPENAI_API_KEY` (только у обёрток
  verifier, eval и Judge).
- **Spec approval** (`spec-approval.yml`): владелец из `owners.json` ставит на issue метку
  `spec-approved` — фабрика замораживает тело issue хешем. Правка тела после этого требует повторной
  метки, иначе verifier даёт FAIL.
- **Calibration Judge** (`calibration-judge.yml`, `judge.enabled: true`) только наблюдает:
  автоматически разбирает раунд FAIL/NEEDS_HUMAN, только если владелец поставил метку `calibrate`
  на PR или его issue (стартует при постановке метки или по завершении раунда verifier). Ручной
  запуск (`workflow_dispatch` с номером PR) проверку вердикта и метки пропускает. Вердикты, статусы
  и метки Judge не меняет. Модель — `CALIBRATION_JUDGE_MODEL`; `VERIFIER_MODEL` используется,
  только если в записи раунда модель не указана.
- **Factory separation** — job в `ci.yml`: `factory-separation-core` вызывает классификатор фабрики,
  итоговый `Factory separation` пропускает только его точный `success`. PR, меняющий и сторону
  спецификации, и сторону верификатора (`factory-separation.json`), требует метку
  `factory-cross-change` от владельца. В отличие от обёрток ниже это `pull_request`-job: он
  исполняется из `ci.yml` самого PR, а стороны и владельцев читает с main; пока на main нет
  `factory-separation.json`, core пропускает классификацию с notice — такой зелёный статус не
  доказывает работу классификатора.
- **Eval** (`acceptance-verifier-eval.yml`) — только ручной запуск; golden set в
  `.github/verifier/golden` появится в #77.

**Trusted-конфиги** читаются фабрикой **с main**, а не из PR: `.github/verifier/` (`owners.json`,
`required-checks.json`, `allowed-models.json`, `tampering-scan.json`, `risk-zones.json`,
`factory-separation.json`, `issue-contract.overlay.json`) и `.github/calibration/`
(`allowed-models.json`, `taxonomy.json` — полная копия словаря релиза, проектных значений в ней
нет). Поэтому изменение конфига или обёртки действует только после merge, а обёртки на
`workflow_run`/`issues` не проверяют PR, который их впервые добавляет. `required-checks.json`
сейчас содержит четыре CI-проверки: `Check (lint + format + types)`, `Test (unit)`, `Build`,
`Factory separation`. Имена этих job в `ci.yml` не переименовывать без правки списка.

**Граница этапов подключения.** #74 подключил пакет, профиль, setup и хуки; #75 — verifier,
spec approval, Judge и Factory separation. CodeQL (`Analyze (javascript-typescript)` в
`required-checks.json`) добавляет #76. Golden set, ADR и первый живой прогон Ralph на Cards — #77
после #74–#76, с выбранной задачей, моделью и отдельно согласованными лимитами. До них CodeQL,
golden eval и живой Ralph не считаются подтверждёнными.

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
