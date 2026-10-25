# EPIC-28: CodeQL в CI cards и trusted-список обязательных проверок

## Контекст

Проблема: после #75 в CI Cards уже есть Check, Test, Build и два job Factory separation — проверка совместного изменения контракта issue и настроек верификатора и передача её результата, — но анализа безопасности JavaScript/TypeScript через CodeQL ещё нет. Trusted-список обязательных проверок — required-checks.json, который Acceptance Verifier читает с main, — уже содержит четыре имени, поэтому эта задача расширяет существующее подключение, а не создаёт его заново.

Почему важно: Cards — публичное Next.js-приложение с API-роутами и доступом к общей для production и preview базе Supabase. CodeQL добавляет статический поиск уязвимостей без обращения к этой базе, а обязательное имя анализа не позволяет верификатору выдать PASS при отсутствующей, незавершённой, неоднозначной или неуспешной проверке.

После задачи: CI на PR в main и push в main выполняет CodeQL после остальных проверок, в том числе при их падении или пропуске. Job публикует результаты в GitHub Code scanning, а после merge его имя становится пятым в trusted-списке для следующих PR; успешный запуск анализа не объявляется доказательством отсутствия всех уязвимостей.

Граница: задача выполняется интерактивно владельцем с Claude Code, поскольку .github защищён от автономного контроллера Ralph. Режим verifier остаётся advisory — вердикт не блокирует merge; branch protection, пороги блокировки по severity, версия фабрики, продуктовый код и Supabase не меняются. Эталонный набор PR (golden set), документ решения о подключении (ADR) и первый ограниченный живой прогон Cards после #74–#76 остаются в #77. Трекер эпика: strakhovdenya/jobflow-cv-pipeline#491.

## Affects

- `.github/workflows/ci.yml` — один обычный job codeql с точным публичным именем Analyze (javascript-typescript); существующие пять jobs и события CI сохраняются
- `.github/verifier/required-checks.json` — существующий файл из #75: добавить пятое имя CodeQL, сохранив четыре исходных
- `CLAUDE.md` — только описание пяти required checks, факта подключения CodeQL и оставшейся границы #77; продуктовые правила и прочие разделы сохраняются

## Docs to Read

- Cards main 6755e0d7f8c90b22c0ae52cefb4f234e6708c088: CLAUDE.md, .github/workflows/ci.yml, .github/verifier/required-checks.json, .github/verifier/factory-separation.json, .factory/profile.json, package.json и lock; #75 и PR #79 — уже завершённое подключение
- Jobflow main 69f0484a134462c4ab9087e12471ab69f7ca7f97: .github/workflows/ci.yml:454-487, .github/workflows/codeql.yml, .github/codeql/codeql-config.yml, .github/verifier/required-checks.json; внутри CI у Jobflow только PR, push/cron обслуживает отдельный workflow, а config-file исключает только его docs/mockups/** — эти особенности в Cards не переносятся
- dark-factory v0.1.3, commit 33fa44be6803ad8c2190c3a60cd6ce41ff42b5df: verifier/verdict/ci.js, verifier/checks/ci-checks.js и .github/workflows/acceptance-verifier.yml — точное сопоставление имени, отказ на duplicate/missing/skipped и источник trusted-списка
- https://github.com/github/codeql-action/blob/main/README.md — init/analyze, permissions и режим без сборки; https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options — javascript-typescript
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs — needs и always(); https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/results-different-than-expected — конфликт default и advanced setup
- https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/triage-alerts-in-pull-requests — различие analysis job и Code scanning results
- #77; strakhovdenya/jobflow-cv-pipeline project-management/plan/PLAN-dark-factory-extraction.md (Фаза 7) и project-management/prd/PRD-dark-factory-extraction.md («В скоупе» п. 14, решение 5 о Cards)

## Key Invariants

- INV-1 **Resolved decision (do not re-litigate/ask):** CodeQL входит в CI Cards и в trusted-список обязательных проверок. Verifier остаётся advisory; VERIFIER_ENFORCE и branch protection не меняются.
- INV-2 **Resolved decision (do not re-litigate/ask):** обычный job codeql имеет точное name: Analyze (javascript-typescript), без matrix и reusable-вызова. В required-checks используется ровно это имя; второй CodeQL workflow или другой job с тем же именем не добавляется.
- INV-3 **Resolved decision (do not re-litigate/ask):** CodeQL исполняется в существующем CI на pull_request в main и push в main, имеет needs: [check, test, build, factory-separation] и job-level if: always() без дополнительного ограничения только PR. Он ждёт итоговый factory-separation, не только core; failure или skipped зависимого job не исключает запуск анализа. Общая concurrency CI и отмена устаревших запусков сохраняются.
- INV-4 Существующие job check, test, build, factory-separation-core и factory-separation, их имена, команды, permissions, условия и зависимости сохраняются. Не меняются прежние версии actions, настройки npm, переменные сборки, структура и триггеры CI; добавляется только CodeQL job.
- INV-5 **Resolved decision (do not re-litigate/ask):** required-checks.json уже создан #75. Здесь сохраняются Check (lint + format + types), Test (unit), Build и Factory separation и добавляется Analyze (javascript-typescript). Итог — ровно пять различных непустых строк; Factory separation не подключается повторно, verifier и Judge в список не входят.
- INV-6 **Resolved decision (do not re-litigate/ask):** CodeQL job на ubuntu-latest имеет permissions contents: read и security-events: write на уровне job. Его последовательность: actions/checkout@v4, github/codeql-action/init@v4 с languages: javascript-typescript и build-mode: none, github/codeql-action/analyze@v4 с загрузкой результатов в GitHub. npm ci, Next build, autobuild, config-file Jobflow, пользовательские query packs и дополнительные секреты этому анализу не нужны и не добавляются.
- INV-7 Профиль после #75 уже включает ci-checks, версия пакета и обёрток остаётся v0.1.3/33fa44be6803ad8c2190c3a60cd6ce41ff42b5df. .factory/profile.json, package.json/lock, обёртки verifier/Judge, SQL, src/, исторические ADR, настройки Ralph, хуков и Husky не меняются. Нет новых расписаний, workflow-файлов и тестовых систем.
- INV-8 Trusted required-checks читается verifier с default-ветки. PR этой задачи ещё проверяется по четырём обязательным именам; полный список из пяти действует после установки изменений на main. Зелёный CodeQL на установочном PR не является доказательством применения нового trusted-списка.
- INV-9 Успех analysis job означает выполнение анализа и загрузки его результатов, а не ноль security alerts. Code scanning results — отдельная проверка GitHub; новые пороги severity и правила merge в эту задачу не входят. Ошибки init, analyze и загрузки не маскируются; job/steps не используют continue-on-error, отключающие условия или upload: false.
- INV-10 Наблюдения независимого ревью о формальном прохождении закрываются совместной проверкой: AC-1/TR-1/TR-2 требуют весь эффективный job, AC-5 — сохранность прежнего CI относительно указанного main, AC-4 — согласованность всего документа и diff продуктовых правил. Происхождение CI checks сопоставляется с jobs этого workflow; зелёный одноимённый посторонний job не является доказательством. Отсутствие второго workflow и изменений вне INV-7 проверяется по полному diff и Affects, а не только по трём итоговым файлам. Новый тестовый framework отвергнут: статические конфиги проверяются непосредственно, последующие push и применение trusted-списка подтверждаются в Manual verification.

## Acceptance Criteria

- [ ] AC-1 [config] CI содержит один обычный job codeql с name: Analyze (javascript-typescript), ubuntu-latest, job-level permissions contents: read и security-events: write; в указанном порядке выполняются actions/checkout@v4, github/codeql-action/init@v4 с languages: javascript-typescript и build-mode: none, github/codeql-action/analyze@v4 с включённой загрузкой результатов; события CI сохраняют PR в main и push в main. Verify: .github/workflows/ci.yml
- [ ] AC-2 [config] Из существующего required-checks.json сохранены четыре имени #75 и добавлено Analyze (javascript-typescript); итоговый массив содержит ровно пять различных строк из INV-5 без дополнительных обязательных проверок. Verify: .github/verifier/required-checks.json
- [ ] AC-3 [ci] CodeQL с согласованным публичным именем на голове PR успешен. Verify: ci "Analyze (javascript-typescript)"
- [ ] AC-4 [doc] CLAUDE.md перечисляет все пять required checks, описывает CodeQL как подключённый анализ в CI и различает успешное выполнение анализа и security findings; golden set, ADR и живой Ralph остаются неподтверждёнными до #77, а advisory и продуктовые правила сохранены. Verify: CLAUDE.md
- [ ] AC-5 [config] Относительно Cards main 6755e0d7f8c90b22c0ae52cefb4f234e6708c088 все пять прежних jobs и остальная конфигурация CI сохранены по INV-4; добавлен только job codeql без переименования, замены или отключения прежних команд и без изменения передачи результата Factory separation. Verify: .github/workflows/ci.yml

## Test Requirement

- [ ] TR-1 [config] Job codeql имеет ровно needs: [check, test, build, factory-separation] и if: always() на уровне job без проверки события только pull_request; сохранены оба события CI, а зависимость от пропущенного на push factory-separation не превращается в условие пропуска CodeQL. Verify: .github/workflows/ci.yml
- [ ] TR-2 [config] CodeQL init/analyze не отключены дополнительными if, их отказы не подавляются через continue-on-error или shell-обходы; анализ не заменён echo/заглушкой и загрузка результатов не отключена, job не повторяет npm ci/build и не ссылается на отсутствующий config-file. Verify: .github/workflows/ci.yml

## Definition of Done

- [ ] DOD-1 [ci] Проверка lint, формата и типов на голове PR успешна. Verify: ci "Check (lint + format + types)"
- [ ] DOD-2 [ci] Сборка на голове PR успешна. Verify: ci "Build"
- [ ] DOD-3 [ci] Юнит-тесты на голове PR успешны. Verify: ci "Test (unit)"
- [ ] DOD-4 [ci] Итоговая проверка разделения сторон на голове PR успешна. Verify: ci "Factory separation"

## Dependencies

Depends on #75. Она закрыта через PR #79, merge commit 6755e0d7f8c90b22c0ae52cefb4f234e6708c088. #77 следует после #74, #75 и #76 и использует расширенный trusted-список. Обновление фабрики и её итоговая задача #14 не являются prerequisite.

## Manual verification (owner, not gated)

- Перед реализацией перечитать main и проверить существующие CI, четыре required checks и включённый ci-checks профиля. Задачу выполнять в интерактивной сессии, не через Ralph: её файлы защищены от автономных изменений.
- Проверить в GitHub состояние CodeQL default setup. В отчёте исследования Сонета API вернул state: not-configured; это свидетельство на момент проверки, не вывод из отсутствия YAML. Для принятого advanced setup не включать параллельно default setup, который блокирует его SARIF uploads. Не менять правила доступа, branch protection или security severity ради зелёного статуса.
- На PR убедиться, что ровно один check имеет имя Analyze (javascript-typescript), открыть лог и подтвердить реальные init, анализ JavaScript/TypeScript и успешную загрузку результатов. Зелёное имя, skipped job, upload: false или continue-on-error не считать выполнением анализа. Условие always() проверяется также на прохождение при failure/skipped needs; ради этого не портить продуктовые тесты.
- Не переносить отдельный codeql.yml, расписание, matrix, Jobflow config-file или его исключение docs/mockups/**. Не обновлять actions остальных jobs и версию dark-factory. Дополнительный npm ci/build внутри CodeQL не требуется; обычные проверки проекта сохраняются.
- После merge проверить запуск CodeQL на push в main. На следующем обычном PR, например #77, подтвердить, что verifier читает уже пять имён с main. На PR #76 действует старый trusted-список: красный CodeQL всё равно может дать FAIL по общему правилу failed CI, но его обязательность по имени начинает действовать после merge.
- Установочный PR служит обычным следующим PR для проверок подключения #75: проверить штатный verifier и отсутствие пропуска классификатора Factory separation из-за отсутствующего конфига. Секреты/метки/переменные #75 не заменять фиктивными значениями и не обходить при диагностике; платные дополнительные eval и живой Ralph не запускать.
- #77 учитывает уже обновлённое здесь описание CodeQL в CLAUDE.md; за ней остаются golden set, ссылка на руководство, ADR и отдельно разрешённый ограниченный живой прогон после всех этапов. Эти работы и изменения тела #77 не входят в PR #76. Владелец выполняет обычную проверку Vercel preview перед merge.

---
Сгенерировано из strakhovdenya/jobflow-cv-pipeline `project-management/plan/PLAN-dark-factory-extraction.md` (PRD: `project-management/prd/PRD-dark-factory-extraction.md`), EPIC-28 · Фаза 7. Трекер: strakhovdenya/jobflow-cv-pipeline#491. Уточнено после #75 по текущему Cards, опыту Jobflow и официальным интерфейсам CodeQL.

