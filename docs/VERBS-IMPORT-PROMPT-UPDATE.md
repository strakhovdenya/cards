# Обновление промпта для импорта глаголов

## Проблема

Исходный промпт генерировал ответы в текстовом формате вместо JSON:

```
heißen - называться
ich - heiße - я называюсь
du - heißt - ты называешься
er/sie/es - heißt - он/она/оно называется
```

Такой формат не может быть обработан парсером, который ожидает строгий JSON.

## Решение

Обновлен промпт в `docs/GPT-VERBS-IMPORT-PROMPT.md` с добавлением:

### 1. Критически важные предупреждения
- Явный запрет на использование списков и текстовых описаний
- Указание отвечать ТОЛЬКО в JSON формате
- Запрет на дополнительные комментарии

### 2. Примеры неправильных форматов
```
❌ Список:
heißen - называться
ich - heiße - я называюсь

❌ Текст с разделителями:
arbeiten → ich arbeite → я работаю

❌ Простой список:
sein, haben, machen, lernen
```

### 3. Пример правильного формата
```json
{
  "verbs": [
    {
      "infinitive": "heißen",
      "translation": "называться", 
      "conjugations": [
        {
          "person": "ich",
          "form": "heiße",
          "translation": "я называюсь"
        }
      ]
    }
  ]
}
```

### 4. Финальное предупреждение
- Указание начинать ответ с `{` и заканчивать на `}`
- Запрет на markdown разметку
- Запрет на комментарии типа "Вот JSON:"

## Ожидаемый результат

Теперь GPT должен генерировать ответы в таком формате:

```json
{
  "verbs": [
    {
      "infinitive": "heißen",
      "translation": "называться",
      "conjugations": [
        {
          "person": "ich",
          "form": "heiße",
          "translation": "я называюсь"
        },
        {
          "person": "du", 
          "form": "heißt",
          "translation": "ты называешься"
        },
        {
          "person": "er/sie/es",
          "form": "heißt", 
          "translation": "он/она/оно называется"
        },
        {
          "person": "wir",
          "form": "heißen",
          "translation": "мы называемся"
        },
        {
          "person": "ihr",
          "form": "heißt",
          "translation": "вы называетесь"
        },
        {
          "person": "sie / Sie",
          "form": "heißen",
          "translation": "они/Вы называетесь"
        }
      ]
    },
    {
      "infinitive": "lernen",
      "translation": "учить, учиться",
      "conjugations": [
        {
          "person": "ich",
          "form": "lerne",
          "translation": "я учу"
        },
        {
          "person": "du",
          "form": "lernst", 
          "translation": "ты учишь"
        },
        {
          "person": "er/sie/es",
          "form": "lernt",
          "translation": "он/она/оно учит"
        },
        {
          "person": "wir",
          "form": "lernen",
          "translation": "мы учим"
        },
        {
          "person": "ihr",
          "form": "lernt",
          "translation": "вы учите"
        },
        {
          "person": "sie / Sie",
          "form": "lernen",
          "translation": "они/Вы учат"
        }
      ]
    }
  ]
}
```

## Тестирование

Для проверки работы обновленного промпта:

1. Скопируйте содержимое `docs/GPT-VERBS-IMPORT-PROMPT.md`
2. Добавьте список глаголов для перевода
3. Отправьте GPT
4. Проверьте, что ответ начинается с `{` и заканчивается на `}`
5. Убедитесь, что JSON валиден

## Совместимость

Обновленный промпт полностью совместим с существующим парсером в `BulkVerbImport.tsx` и не требует изменений в коде приложения. 