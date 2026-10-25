# Golden set Acceptance Verifier (Cards)

Golden case — замороженные входы одного уже разобранного PR с заранее установленным владельцем
вердиктом. Ручной eval (`.github/workflows/acceptance-verifier-eval.yml`, только
`workflow_dispatch`) прогоняет текущий verifier фабрики на этих входах и сравнивает результат с
`expected`. Формат кейса, чтение и сверка — штатные для установленного dark-factory v0.1.3
(commit `33fa44be6803ad8c2190c3a60cd6ce41ff42b5df`): `verifier/eval/verifier-eval.js`
(`readCases`, `checkGoldenSet`, `summarize`) и `verifier/eval/golden-mutation.js`. Каталог задаётся
полем профиля `verifier.goldenDir` (`.factory/profile.json`).

**Статус: набор подготовлен, eval не запускался.** Ни один кейс ещё не прогонялся моделью; совпадение
ожиданий с фактическими вердиктами не подтверждено. Это делает отдельная подзадача приёмки #82
координатора #77, и только после merge набора в main: eval читает кейсы, профиль и trusted-конфиги
только с default-ветки, а не из PR.

## Состав

Все три кейса построены на одном реальном PR — #80 (issue #76, «CodeQL в CI cards и trusted-список
обязательных проверок»), по решению владельца в #77/#81.

| Кейс | expected | expected_reason_code | expected_criterion_id | Что проверяет |
| --- | --- | --- | --- | --- |
| `80` | PASS | null | null | правильный PR #80 распознаётся как выполняющий #76 |
| `80-model-fail` | FAIL | `criterion_failed` | `AC-4` | мутация CLAUDE.md, которую ловит только модель |
| `80-out-of-scope` | FAIL | `out_of_scope_file` | null | мутация с файлом вне Affects, ловится детерминированно |

Исходный PR:

- PR: https://github.com/strakhovdenya/cards/pull/80, merged 2026-10-25T20:34:22Z, merge commit
  `99da93864f83cdb74c42b877dc3582f23ef29770`.
- `base_sha`: `6755e0d7f8c90b22c0ae52cefb4f234e6708c088` (main после PR #79; он же merge-base).
- `head_sha`: `4e97212ebf6217392de4632d35e5a5a3ab4d94ac` (единственный commit PR), tree
  `a1f788183b72a91fb8e7ce5f1e9b282a0828efaf`.
- Изменённые файлы (`git diff --name-status base...head`): `.github/verifier/required-checks.json`,
  `.github/workflows/ci.yml`, `CLAUDE.md` — все три входят в Affects #76.

Оба SHA получены из `gh api repos/strakhovdenya/cards/pulls/80` (`base.sha`, `head.sha`) и доступны в
истории main (`git cat-file -t` → `commit`).

## Файлы кейса

Каждый каталог самодостаточен: `case.json`, `issue.md`, `ci.json`, `exceptions.json`; у мутаций ещё
`mutation.patch`. Файлы `issue.md`, `ci.json`, `exceptions.json` всех трёх кейсов побайтно одинаковы
(это проверяет тест); различаются только `case.json` и `mutation.patch`.

### issue.md — снимок спецификации #76

- Источник: `gh issue view 76 --json title,body --jq '"# " + .title + "\n\n" + .body'` — та же форма,
  которую пишет шаг `Collect inputs` штатного `acceptance-verifier.yml`. Получен 2026-10-25T21:15:26Z.
- Тело #76 последний раз правилось 2026-10-25T20:27:17Z (GraphQL `lastEditedAt`), то есть до запуска
  CI PR #80 (20:31:29Z) и до verifier (20:33:30Z): снимок совпадает с тем, что видел исходный
  verifier. Issue не редактировалась ради набора.
- `issue-lint.js` с overlay проекта: `format: v2`, `problems: []`.
- Хеши:
  - `sha256sum issue.md` → `65aea511e4a3aa4606e78cb83628866586cec03f0e75b25040da819ba39545c8`;
  - `node node_modules/dark-factory/verifier/spec-hash.js hash issue.md` →
    `984f0e9b58531d30966c340f3cb63179c4948d8f869ed4c8416840d6cb3b42e9` (так eval считает
    `issue_body_sha256` в `provenance.json`);
  - то же для одного тела без заголовка (`gh api repos/strakhovdenya/cards/issues/76 --jq '.body'`,
    как читает spec approval) → `674ca4d7ae3c0099202fa328069df9c5af038ecbab24343775f15bafbffe7e5f`.

### ci.json — снимок CI head PR #80

- Источник — те же вызовы, что в `Collect inputs`, получены 2026-10-25T21:15:26Z:
  `gh api repos/strakhovdenya/cards/commits/4e97212…/check-runs` (`{name, status, conclusion}`),
  `gh api repos/strakhovdenya/cards/commits/4e97212…/status` (`{name: context, state}`) и
  `ci_workflow_conclusion` из CI run https://github.com/strakhovdenya/cards/actions/runs/40231170511
  (`pull_request`, attempt 1, `success`).
- Снимок не дополнялся и не правился. У head ровно один запуск каждого job, перезапусков нет, поэтому
  текущее состояние API совпадает с состоянием на момент исходного verifier.
- Все пять required checks из `.github/verifier/required-checks.json` присутствуют по одному разу и
  `completed`/`success`: `Check (lint + format + types)`, `Test (unit)`, `Build`,
  `Factory separation`, `Analyze (javascript-typescript)`. Кроме них в снимке есть реальные
  `CodeQL`, `Vercel Preview Comments`, `Factory separation core / Factory separation` и статусы
  `Vercel`, `Acceptance Verifier`.
- Статус `Acceptance Verifier` имеет state `success`, но описание «Advisory, verdict: FAIL»: в
  advisory-режиме статус не падает. `verdict/ci.js` исключает собственные статусы verifier
  (`OWN_CHECKS`) из проверки CI, поэтому на вердикт replay он не влияет.

### exceptions.json

`{ "manual_verified": false, "test_removal_approved": false }`. У PR #80 и issue #76 не было меток
`manual-verified` и `test-removal-approved`, поэтому разрешённых исключений нет.

### approval.json отсутствует — spec approval этим набором не покрыт

Ни в одном кейсе нет `approval.json`, и это решение владельца (#77 INV-6, #81 INV-2). Если файла нет,
eval не передаёт `--approval`, и проверка `spec-approval` в replay не применяется: при
`approval === undefined` `checkApproval` не возвращает причин. Поэтому набор **не проверяет** spec
approval. У #76 не было метки `spec-approved`, а вымышленный `approved_hash` не создаётся.

Профиль при этом не ослаблен: `spec-approval` остаётся в `verifier.checks`, и живой verifier на
настоящих PR по-прежнему требует одобрения. Живая контрольная issue в #82 обязана иметь настоящую
метку `spec-approved` и актуальный hash-комментарий.

### Прежний вердикт verifier на PR #80

Исходный advisory-запуск (https://github.com/strakhovdenya/cards/actions/runs/40231333601 — на него
ссылается `target_url` статуса `Acceptance Verifier` head `4e97212…`; комментарий
https://github.com/strakhovdenya/cards/pull/80#issuecomment-6402887458) дал FAIL с причинами
`report not readable: ENOENT`, `provenance missing`, `spec not approved`, `no report`. Это проблемы
настройки среды (модель не отработала, одобрения не было), а не оценка содержания PR, поэтому
ожиданием кейса этот вердикт не стал. Replay его не воспроизводит и не подменяет.

## Решение владельца об ожиданиях

Ожидания утвердил владелец (strakhovdenya) 2026-10-25 в интерактивной сессии подготовки #81, до
любого eval. Он оценивал содержание PR #80 против неизменённого тела #76, а не ответ модели:

- `80` — PASS. Job `codeql` с точным именем, `ubuntu-latest`, job-level permissions,
  `needs: [check, test, build, factory-separation]`, `if: always()`, шаги checkout → init
  (`javascript-typescript`, `build-mode: none`) → analyze без `continue-on-error` и `upload: false`
  (AC-1, AC-5, TR-1, TR-2). В `required-checks.json` ровно пять имён (AC-2). CLAUDE.md перечисляет пять
  проверок, отличает успешный анализ от alerts и оставляет golden set, ADR и Ralph за #77 (AC-4).
  Все пять required checks успешны (AC-3, DOD-1…4).
- `80-model-fail` — FAIL `criterion_failed` / `AC-4`.
- `80-out-of-scope` — FAIL `out_of_scope_file` / null.

Если фактический вердикт eval разойдётся с ожиданием, `expected` не подгоняется: расхождение
записывается в протокол #82 и получает отдельное решение.

## Мутации

Каждая мутация — FAIL-кейс с `pair_of: "80"`, непустым `mutation_kind` и `mutation.patch`, который
применяется поверх настоящего head #80 как данные (`git apply`, ничего из дерева не исполняется).
Оба patch сняты `git diff` в отдельном scratch-клоне head.

### 80-model-fail (`mutation_kind: doc_required_checks_drift`)

Patch возвращает в CLAUDE.md прежнюю фразу «`required-checks.json` сейчас содержит четыре
CI-проверки: … `Factory separation`» без `Analyze (javascript-typescript)` и без оговорки о merge
#76. При этом сам PR по-прежнему добавляет пятое имя в `required-checks.json`, так что документ
перестаёт перечислять все пять required checks: нарушен AC-4 (`[doc]`, его оценивает модель). Patch
меняет только `CLAUDE.md`, а этот файл есть в Affects.

### 80-out-of-scope (`mutation_kind: file_outside_affects`)

Patch добавляет новый файл `docs/codeql.md` с корректным по содержанию описанием CodeQL. Каталог
`docs/` не входит в Affects #76, поэтому детерминированная проверка `affects-scope` должна дать
`out_of_scope_file` (без ID критерия).

## Проверка применимости мутаций (без модели)

Проверка 2026-10-25 на Windows 11 (git 2.53.0.windows.2, node v22.23.0). Scratch-клон локального
репозитория, `core.autocrlf=false` (в репозитории и так `* text=auto eol=lf`), detached checkout
настоящего head. Приложение мутированного дерева не запускалось, CI мутаций тоже. Перед каждым
применением клон сбрасывался к head:

```sh
git clone --no-checkout <cards> clone && git -C clone checkout 4e97212ebf6217392de4632d35e5a5a3ab4d94ac
git -C clone reset --hard 4e97212ebf6217392de4632d35e5a5a3ab4d94ac && git -C clone clean -fd
node node_modules/dark-factory/verifier/eval/golden-mutation.js --repo clone \
  --base 6755e0d7f8c90b22c0ae52cefb4f234e6708c088 \
  --head 4e97212ebf6217392de4632d35e5a5a3ab4d94ac \
  --patch .github/verifier/golden/<case>/mutation.patch --out-dir out-<case>
```

Обе команды завершились с exit 0 (`golden-mutation.js` при успехе ничего не печатает и пишет
`mutation.json`, `files.txt`, `diff.patch`). После применения `git rev-parse HEAD` по-прежнему
`4e97212…`: head остался commit-ом, а мутированное дерево существует только как git-объект
(`tree_sha`) и изменение рабочей копии.

| | 80-model-fail | 80-out-of-scope |
| --- | --- | --- |
| `patch_sha256` | `f3ace0c2e0ae968db6c12504f93a904b84294c9ccd2e4177313512c99d7575bf` | `33456560fb92d430bf190cae1338b9412f5eeb71896e69947ef80416b78d43ef` |
| исходный head tree | `a1f788183b72a91fb8e7ce5f1e9b282a0828efaf` | `a1f788183b72a91fb8e7ce5f1e9b282a0828efaf` |
| `tree_sha` мутации | `592b8e4ff3d60ac4005f7f724af763224f418bf8` | `e653ac72c62d67b00712b5a613cb1b715b924841` |
| `git diff --stat head tree_sha` | `CLAUDE.md \| 5 ++---` | `docs/codeql.md \| 4 ++++` |
| sha256 `diff.patch` (base→tree) | `a1fead379222c7dd9da2c401a8555e6abcaf33c6f407b328682002a8a83c4a8d` | `a0bcb205f2217c188c27463553422eddc0b245358b4ecbd13f68cd0be833f91e` |

`files.txt` (base → мутированное дерево):

```text
80-model-fail:                         80-out-of-scope:
M  .github/verifier/required-checks.json   M  .github/verifier/required-checks.json
M  .github/workflows/ci.yml                M  .github/workflows/ci.yml
M  CLAUDE.md                               M  CLAUDE.md
                                           A  docs/codeql.md
```

В мутированном дереве 80-model-fail CLAUDE.md:294 читается «сейчас содержит четыре CI-проверки».

Детерминированные входы verifier, посчитанные штатными CLI фабрики на этих `files.txt`/`diff.patch`
(для `80` — на `git diff base...head`) и на `issue.md`/`ci.json` кейса:

| Проверка (команда) | 80 | 80-model-fail | 80-out-of-scope |
| --- | --- | --- | --- |
| `test-tampering-scan.js diff.patch --config .github/verifier/tampering-scan.json` | findings `[]`, losses `[]` | findings `[]`, losses `[]` | findings `[]`, losses `[]` |
| `affects-scope.js issue.md files.txt` | `out_of_scope: []` | `out_of_scope: []` | `out_of_scope: ["docs/codeql.md"]` |
| `issue-lint.js issue.md --overlay …` | v2, 0 problems | v2, 0 problems | v2, 0 problems |
| `verdict/ci.js` `parseCiFailures(ci.json, required-checks)` | `[]` | `[]` | `[]` |
| `verdict/computed.js` `computeCiItems` (AC-3, DOD-1…4) | все PASS | все PASS | все PASS |

Итог: у модельной мутации нет постороннего детерминированного FAIL (scope, CI, tampering, computed),
и её единственный дефект — AC-4. Scope-мутация нарушает Affects ровно одним файлом
`docs/codeql.md`. Применение patch в штатном eval повторит шаг `Apply mutation patch (data only)`
на Linux runner; расхождение `tree_sha` будет видно по `mutation.json` артефакта.

## Структурный тест

`src/__factory__/golden-set.test.ts` (обычный `npm run test`, без сети, git, Docker и модели) читает
этот каталог штатными `readCases` и `checkGoldenSet` установленного пакета. Он сверяет число
прочитанных кейсов со всеми подкаталогами: битый `case.json`, который `readCases` молча пропускает,
считается ошибкой. Ещё тест проверяет `pr`, SHA, `reason`, null-поля PASS, наличие и разбор входов,
`ci.head_sha`, пять required checks, отсутствие `approval.json`, равенство входов пары, что ID
модельного FAIL — пункт #76, который судит модель, и scope обоих patch. Отрицательные примеры строятся
из копии набора и должны отклоняться той же функцией.

## Добавление или изменение кейса

Новый кейс — отдельная задача: реальный PR и SHA, снимки через те же команды, решение владельца по
содержанию, проверка patch через `golden-mutation.js` и обновление этого README и теста. Ожидание не
меняется ради совпадения с ответом модели.
