# Приёмка фабрики dark-factory в Cards (#82)

Протокол итогов golden eval и живого прогона Ralph на Cards. Пишется по фактическим результатам
и исходным артефактам; недоступное помечено как недоступное, а не заменено нулём. Контекст:
координатор #77, подготовка набора — #81, ADR-006.

## Итог

| Что проверялось                               | Результат                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Golden eval, три кейса (шесть вызовов модели) | **Не подтверждён.** Совпал 1 кейс из 3; false FAIL 1, needs human 1                                                          |
| Живой Ralph на #84                            | **Подтверждён на второй платной попытке** после исправления профиля (#85, PR #86); первая попытка завершилась `agent_failed` |
| CI на head PR Ralph                           | Все пять required checks успешны                                                                                             |
| Acceptance Verifier на head PR Ralph          | **PASS**                                                                                                                     |

Совпадение вердиктов golden set фабрикой v0.1.3 на Cards **не достигнуто**, поэтому переход
verifier в enforce-режим (ADR-006) по этим данным не обоснован. Решение остаётся за владельцем.

## Окружение и ограничения

- Фабрика: `dark-factory` v0.1.3, commit `33fa44be6803ad8c2190c3a60cd6ce41ff42b5df`; Codex CLI
  0.156.1; модель verifier `gpt-6-luna` (`VERIFIER_MODEL`).
- Ralph запускался штатной командой `node node_modules/dark-factory/bin/ralph-wsl.js` на
  Windows 11 + WSL Ubuntu + Docker (29.8.0), Node v22 в песочнице; агент `claude-sonnet-5-5`,
  Claude Code 2.1.283. Результат не переносится на другие платформы без отдельной проверки.
- Лимиты запуска: `maxIterations` 1, `maxTurns` 150, `reviewMaxTurns` 40, `agentTimeoutMinutes` 45,
  `taskMaxMinutes` 60, `taskMaxUsd` 10. Личный конфиг `.ralph/config.json` не публикуется.
- Golden set не содержит `approval.json`, поэтому **spec approval набором не покрыт**. В живом
  прогоне контрольная issue #84 имела настоящую метку `spec-approved`, и verifier увидел её хеш
  (`e55297ed…af2dc4`).
- Выводы относятся к одному живому прогону и одному eval. Недетерминизм модели не оценивался.

## 1. Golden eval

Запуск: workflow «Acceptance Verifier Eval», `workflow_dispatch`, `main` на `5634962a…`,
https://github.com/strakhovdenya/cards/actions/runs/40238097434. Один запуск, шесть вызовов
модели, повторов не было. Все семь job'ов проверки кейсов завершились `success`, job `Summarize`
— `failure` (exit 1).

Мутации применились: `tree_sha` в `mutation.json` артефактов совпал с README набора —
`592b8e4ff3d60ac4005f7f724af763224f418bf8` (`80-model-fail`) и
`e653ac72c62d67b00712b5a613cb1b715b924841` (`80-out-of-scope`). Обработаны ровно три кейса.

| Кейс              | expected                      | actual      | Причины (expected → actual)                                                                | Исход           |
| ----------------- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------ | --------------- |
| `80`              | PASS                          | FAIL        | — → `bad_reference`, `bad_reference`                                                       | **false FAIL**  |
| `80-model-fail`   | FAIL, `criterion_failed#AC-4` | NEEDS_HUMAN | `criterion_failed#AC-4` найден; прогоны разошлись по INV-7 (PASS/N/A) и INV-10 (FAIL/PASS) | **needs human** |
| `80-out-of-scope` | FAIL, `out_of_scope_file`     | FAIL        | `out_of_scope_file`, а также `invariant_failed#INV-10`, `bad_reference`                    | matched         |

Счётчики из summary: false PASS 0, false FAIL 1, run failures 0, needs human 1, reason
mismatches 0. Зелёные job'ы проверки кейсов не означают успеха: критерий приёмки (все три строки
matched) не выполнен.

Что удалось установить о причинах (по артефактам прогона):

- Кейс `80`, второй прогон: `refs-problems2.json` содержит «quote not found within 2 lines» для
  цитаты по `.github/workflows/ci.yml:107` (критерий AC-1 и инвариант INV-9): модель привела
  фразу, которой нет в указанном месте. Для первого прогона `refs-problems.json` пуст, причина
  его `bad_reference` по артефактам не установлена.
- Кейс `80-model-fail`: расхождение двух прогонов модели по INV-10 — недетерминизм модели на
  одинаковых входах.
- Кейс `80-out-of-scope`: код `invariant_failed#INV-10` отсутствует в expected; не разбирался.

Классификация: окружение исключено (секрет, переменные, фабрика и workflow отработали, run
failures 0). Остаётся подготовка (формулировка INV-10 в снимке #76 может быть неоднозначной) или
продукт (нестабильные цитаты и вердикты модели). Различить без нового платного прогона нельзя,
поэтому вывод предварительный. Expected не менялись, кейсы не правились, eval не повторялся.

Стоимость eval в USD недоступна: workflow её не публикует.

## 2. Живой Ralph на #84

Контрольная issue: #84 «Вынести общую нормализацию немецких слов из cardUtils и verbUtils в
germanWordUtils» (v2-спецификация, метка `spec-approved`, тело не менялось).

### Попытки

| №   | Результат                                                                                           | Платный вызов        | Классификация                                                     |
| --- | --------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| 1   | Остановка до агента: `CLAUDE_CODE_OAUTH_TOKEN is not set in WSL`                                    | нет                  | окружение: процесс VS Code не унаследовал переменную пользователя |
| 2   | `agent_failed`: `agent did not return DONE or BLOCKED`, шаг `implement` `unparseable`, PR не создан | да (29 ходов, 114 с) | подготовка: gate-команда prettier с glob недоступна агенту        |
| 3   | `done`, PR https://github.com/strakhovdenya/cards/pull/87                                           | да                   | —                                                                 |

Запуск 3 разрешён владельцем отдельно после исправления профиля. Попытка 1 токен в WSL не
получила; запуски 2 и 3 выполнены командой через PowerShell, где токен брался из пользовательского
окружения Windows и подставлялся только в дочерний процесс, значение нигде не печаталось.

### Причина неуспеха попытки 2

Ralph выдаёт агенту команду gate как точный текст `argv` через пробелы (плюс тот же текст с ` *`)
(`ralph/workspace.js`, `gateCommandRules`). В профиле Cards prettier был записан с
`src/**/*.{js,jsx,ts,tsx,css,md,json}`. Журнал агента показывает: форма с `;`/`|` требовала
подтверждения, глоб в кавычках не совпал с правилом, без кавычек Claude Code ответил
`Brace expansion`, явный список файлов тоже не совпал. Агент по промпту завершил отчётом с
`BLOCKED: access denied …`, но не последней строкой, и контроллер счёл ответ неразборным.
Исправление: issue #85, PR #86 (`prettier --check src` и структурный тест `gate-argv.test.ts`).
Профиль читается с main, поэтому действует после merge.

### Результат попытки 3

`state.json`: `lastResult.status` = `done`, `pr` = PR #87, четыре шага без пропусков:

| Шаг         | Исход                       |
| ----------- | --------------------------- |
| implement   | passed                      |
| self-review | passed (`REVIEW: PASS`)     |
| code-review | passed (`CODEREVIEW: PASS`) |
| final-gate  | passed                      |

- **Реальный Skill `code-review`.** Журнал третьего вызова агента
  (`03-code-review/projects/-workspace/*.jsonl`) содержит `tool_use` Skill
  `{"skill":"code-review","args":"medium"}` в 2026-10-25T22:41:25.810Z; затем идут чтение diff,
  `ReportFindings` и вердикт `CODEREVIEW: PASS` того же прохода. Шаг `implement` загрузил
  шесть skills (`js-conventions`, `js-gof`, `js-data-structures`, `error-handling`,
  `modern-javascript`, `vitest`).
- **Gate контроллера** (все успешны): ESLint, `prettier --check src`, `tsc --noEmit`, Vitest,
  `next build`. Проверки самого агента (Vitest 22 файла / 358 тестов; `next build` он не запускал)
  в счёт гейта не идут.
- **PR** создан контроллером: ветка `task/ISSUE-84-cardutils-verbutils-germanwordutils`, head SHA
  `aca33413de8e80f970b1ecc8b11f28e6ce561f19`, `Closes #84`, четыре изменённых файла — ровно
  `Affects` issue. Не смёржен.
- **CI на этом head** (run 40241451633): `Check (lint + format + types)`, `Test (unit)`, `Build`,
  `Factory separation`, `Analyze (javascript-typescript)` — success; Vercel preview ready.
- **Acceptance Verifier** (run 40241603695, статус «Verdict: PASS»): комментарий в PR указывает
  `PR head: aca33413…`, хеш тела issue `e55297ed…af2dc4`, verifier commit `33fa44be…`, модель
  `gpt-6-luna`. Вердикт PASS относится к тому же head, что и CI. В `workflow_run` этого запуска
  `head_sha` — SHA `main` (`da5efc3`), поэтому привязку к PR подтверждает комментарий, а не поле
  запуска.

### Оценка, стоимость, argv, модель

- **Стоимость.** USD недоступен: журналы сессий не содержат поля стоимости, а контроллер её в
  `state.json` и stdout не вывел. Время третьей попытки по меткам install-логов и `state.json` —
  около семи минут (22:35:54 → 22:42:34 UTC, включая установку). Лимит `taskMaxUsd` 10 не
  сработал; о фактической сумме утверждений нет.
- **argv.** Реальная командная строка вызова `claude` не записана. Сверка `buildClaudeArgs`
  пакета с фактически записанным в этом протоколе **не выполнялась**; доказательство работы
  вызова — завершение агентских проходов и записи в журналах.
- **`unrecognized_model`.** В stderr каждой попытки `[claude-code:unrecognized_model]
{"model":"claude-sonnet-5-5"}`; в журналах сессий модель ответов записана как
  `claude-sonnet-5-5`, то есть совпадает с запрошенной, но независимой установки модели (кроме
  собственной записи Claude Code) нет. Предупреждение — свойство среды, на результат прогона не
  повлияло, но запрошенная модель не подтверждена независимо.

## Артефакты

Хранятся вне репозитория у оператора (`cards-82-evidence/`): артефакты и лог eval, stdout/stderr
всех запусков Ralph, `state.json`, каталоги sessions и install/gate-логи, журналы агента. Токены
и личный конфиг в протокол и репозиторий не попадают.

## Решения владельца

1. Результат eval принят как есть (1 из 3 matched), повтор не запускается; расхождения остаются
   открытым вопросом о стабильности verifier на модели `gpt-6-luna`.
2. Verifier остаётся в advisory-режиме (ADR-006).
3. Merge PR #87 (контрольный PR Ralph) выполняет человек; автоматически он не мёржится.
