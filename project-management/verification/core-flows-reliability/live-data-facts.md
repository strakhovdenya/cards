# Фактические значения word_type и grammar_data в общей базе (#93)

Протокол результатов read-only запросов к общей базе Supabase (прод и preview делят один проект).
Контекст: PRD `PRD-core-flows-reliability.md`, план — Phase 0, задача 0.3. Результат нужен задаче
#100 (серверная валидация `word_type`/`grammar_data`). Запросы выполнил владелец проекта в Supabase
SQL editor 2026-10-30. Схема и данные этой задачей не менялись (ADR-002). В протокол попали только
значения `word_type`, имена ключей `grammar_data`, типы значений и количества — без текстов
пользователей.

## Выполненные запросы (только SELECT)

```sql
-- Q1: применено ли check_word_type и какой у него список значений
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.cards'::regclass AND contype = 'c';

-- Q2: различные word_type с количеством, включая NULL и пустую строку
SELECT word_type, count(*) AS cards_count
FROM cards
GROUP BY word_type
ORDER BY cards_count DESC;

-- Q3: тип JSON-значения grammar_data по word_type (бывают ли не объекты)
SELECT word_type,
       CASE WHEN grammar_data IS NULL THEN 'sql-null'
            ELSE jsonb_typeof(grammar_data) END AS json_type,
       count(*) AS cards_count
FROM cards
GROUP BY 1, 2
ORDER BY 1, 2;

-- Q4: ключи grammar_data по word_type (только объекты) и тип значения ключа
SELECT c.word_type, k.key, jsonb_typeof(k.value) AS value_type, count(*) AS cards_count
FROM cards c
CROSS JOIN LATERAL jsonb_each(c.grammar_data) AS k
WHERE jsonb_typeof(c.grammar_data) = 'object'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- Q5: пустые объекты grammar_data
SELECT word_type, count(*) AS cards_count
FROM cards
WHERE grammar_data = '{}'::jsonb
GROUP BY word_type
ORDER BY word_type;
```

## Результаты

### Ограничение `check_word_type` (Q1)

Ограничение **применено** на общей базе. Единственный CHECK на `cards` — `check_word_type`, его
список значений (10) совпадает с миграцией `docs/migration-add-word-type-and-grammar.sql`:
`noun`, `verb`, `adjective`, `adverb`, `phrase`, `question`, `preposition`, `pronoun`,
`conjunction`, `other`.

### Значения `cards.word_type` (Q2)

| word_type | cards_count |
| --------- | ----------- |
| noun      | 1291        |
| other     | 134         |
| verb      | 75          |
| phrase    | 31          |
| adjective | 28          |

Всего 1559 карточек. Пустых строк и `NULL` в `word_type` нет. Значения `adverb`, `question`,
`preposition`, `pronoun`, `conjunction` в данных не встречаются.

### Форма `cards.grammar_data` (Q3)

| word_type | json_type | cards_count |
| --------- | --------- | ----------- |
| adjective | object    | 28          |
| noun      | object    | 1291        |
| other     | object    | 119         |
| other     | sql-null  | 15          |
| phrase    | object    | 31          |
| verb      | object    | 75          |

Значения, не являющиеся объектом (массив, строка, число, JSON `null`), **не встречаются**. Но есть
15 карточек `other` с SQL `NULL` в `grammar_data` (несмотря на `DEFAULT '{}'` в миграции).

### Ключи `cards.grammar_data` по типам слов (Q4)

| word_type | key     | value_type | cards_count |
| --------- | ------- | ---------- | ----------- |
| noun      | article | string     | 1287        |
| noun      | plural  | string     | 1179        |
| noun      | plural  | null       | 100         |

Других ключей нет. У `adjective`, `verb`, `phrase`, `other` ключей нет вообще: объекты пустые.
`plural` бывает JSON `null` (100 карточек), то есть значение ключа — строка или `null`.

### Пустые объекты (Q5)

| word_type | cards_count |
| --------- | ----------- |
| adjective | 28          |
| noun      | 2           |
| other     | 119         |
| phrase    | 31          |
| verb      | 75          |

Из 1291 существительного 2 имеют `{}`; ещё 2 имеют объект без `article` (только `plural`).
Остальные 1287 содержат `article`.

## Вывод для #100

**Допустимое множество `word_type` для валидации:** все 10 значений ограничения `check_word_type`.
Живые данные используют 5 из них (`noun`, `other`, `verb`, `phrase`, `adjective`). Сужать
множество до живых значений или до списка редактора нельзя: серверная валидация не должна
отвергать то, что база принимает и что уже лежит в данных (`phrase`).

**Допустимая форма `grammar_data`:** поле отсутствует, `NULL` или JSON-объект (в том числе `{}`).
Известные ключи: `article` — строка, `plural` — строка **или `null`**. Неизвестные ключи не
отбрасываются. Валидация, требующая непустой объект или обязательный `article`, сломает правку
существующих карточек: у 15 карточек `NULL`, у 253 карточек других типов и 2 существительных — `{}`,
у 4 существительных нет `article`.

**Расхождение с контрактом #100.** AC-7 #100 («отклоняет нестроковый `plural`») в буквальном
прочтении отвергнет `plural = null`, который есть у 100 существительных: после #99 повторное
сохранение такой карточки с исходным `grammar_data` получит 400. Перед реализацией #100 AC-7 нужно
уточнить: `null` для `plural` допустим. Также в разделе Context #100 упомянуты ключи `genitive`,
`comparative`, `past` как встречающиеся в данных; в живых данных их нет, это лишь примеры из
комментария миграции. Отклонять их валидация всё равно не должна (неизвестные ключи сохраняются).

### Решения владельца по расхождениям

Приняты владельцем 2026-10-30 по результатам запросов.

1. **`phrase`, `question`, `pronoun` добавляются в выпадающий список «Тип слова» редактора**
   (`src/strategies/AdaptiveCardEditorStrategy.ts`) — отдельной задачей, не в #93 и не в #100.
   Причина: после #99 `PUT` начнёт сохранять `word_type`, а карточка `phrase` (31 шт.) открывается
   в редакторе со значением вне списка — тип не виден, и его легко случайно заменить при
   сохранении. Схема не меняется: значения уже разрешены ограничением БД. Валидация #100 от этого
   не зависит и принимает все 10 значений сразу.
2. **`grammar_data = NULL` остаётся допустимым состоянием**, нормализация данных не выполняется.
   Валидация и клиент трактуют `NULL` так же, как отсутствие поля. Причина: значение безвредно,
   а правка данных потребовала бы ручного UPDATE в общей базе (ADR-002) без пользы для поведения.
3. **`plural = null` — допустимое значение** («множественного числа нет или не указано»), а не
   артефакт. Валидация #100 принимает `null` для `plural`; AC-7 #100 уточняется до реализации.
