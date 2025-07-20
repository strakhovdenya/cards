# Парсер для импорта глаголов из GPT

## Описание

Этот документ содержит инструкции и код для парсинга JSON ответа от GPT и импорта глаголов в базу данных.

## Структура JSON ответа GPT

```json
{
  "verbs": [
    {
      "infinitive": "немецкий_инфинитив",
      "translation": "русский_перевод", 
      "conjugations": [
        {
          "person": "ich",
          "form": "форма_для_ich",
          "translation": "перевод_для_ich"
        },
        // ... остальные формы спряжения
      ]
    }
  ]
}
```

## SQL для импорта

### Вариант 1: Прямой SQL импорт

```sql
-- Функция для импорта глаголов из JSON
CREATE OR REPLACE FUNCTION import_verbs_from_json(
  json_data JSONB,
  target_user_id UUID
) RETURNS VOID AS $$
DECLARE
  verb_record RECORD;
  conjugation_record RECORD;
BEGIN
  -- Проходим по всем глаголам в JSON
  FOR verb_record IN 
    SELECT * FROM jsonb_array_elements(json_data->'verbs')
  LOOP
    -- Вставляем глагол
    INSERT INTO verbs (
      infinitive,
      translation, 
      conjugations,
      user_id,
      learned,
      created_at,
      updated_at
    ) VALUES (
      verb_record->>'infinitive',
      verb_record->>'translation',
      verb_record->'conjugations',
      target_user_id,
      FALSE,
      NOW(),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Пример использования:
-- SELECT import_verbs_from_json('{"verbs":[...]}'::jsonb, 'user-uuid-here');
```

### Вариант 2: Node.js парсер

```javascript
// verbs-import-parser.js
const { createClient } = require('@supabase/supabase-js');

// Конфигурация Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Парсит JSON ответ GPT и импортирует глаголы
 * @param {string} gptResponse - JSON ответ от GPT
 * @param {string} userId - ID пользователя
 */
async function importVerbsFromGPT(gptResponse, userId) {
  try {
    // Парсим JSON ответ
    const data = JSON.parse(gptResponse);
    
    if (!data.verbs || !Array.isArray(data.verbs)) {
      throw new Error('Неверный формат JSON ответа');
    }

    const results = [];
    
    // Импортируем каждый глагол
    for (const verb of data.verbs) {
      const { infinitive, translation, conjugations } = verb;
      
      // Проверяем обязательные поля
      if (!infinitive || !translation || !conjugations) {
        console.warn(`Пропускаем глагол с неполными данными: ${infinitive}`);
        continue;
      }

      // Проверяем, что есть все 6 форм спряжения
      if (!Array.isArray(conjugations) || conjugations.length !== 6) {
        console.warn(`Пропускаем глагол ${infinitive}: неполные спряжения`);
        continue;
      }

      // Вставляем в базу данных
      const { data, error } = await supabase
        .from('verbs')
        .insert({
          infinitive,
          translation,
          conjugations,
          user_id: userId,
          learned: false
        })
        .select();

      if (error) {
        console.error(`Ошибка импорта глагола ${infinitive}:`, error);
      } else {
        console.log(`Успешно импортирован глагол: ${infinitive}`);
        results.push(data[0]);
      }
    }

    console.log(`Импорт завершен. Импортировано: ${results.length} глаголов`);
    return results;

  } catch (error) {
    console.error('Ошибка парсинга JSON:', error);
    throw error;
  }
}

/**
 * Валидация структуры глагола
 */
function validateVerb(verb) {
  const requiredFields = ['infinitive', 'translation', 'conjugations'];
  const requiredPersons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];
  
  // Проверяем обязательные поля
  for (const field of requiredFields) {
    if (!verb[field]) {
      return { valid: false, error: `Отсутствует поле: ${field}` };
    }
  }

  // Проверяем спряжения
  if (!Array.isArray(verb.conjugations)) {
    return { valid: false, error: 'conjugations должно быть массивом' };
  }

  if (verb.conjugations.length !== 6) {
    return { valid: false, error: 'Должно быть ровно 6 форм спряжения' };
  }

  // Проверяем наличие всех форм спряжения
  const persons = verb.conjugations.map(c => c.person);
  for (const person of requiredPersons) {
    if (!persons.includes(person)) {
      return { valid: false, error: `Отсутствует форма спряжения: ${person}` };
    }
  }

  return { valid: true };
}

module.exports = {
  importVerbsFromGPT,
  validateVerb
};
```

### Вариант 3: TypeScript парсер

```typescript
// verbs-import-parser.ts
import { createClient } from '@supabase/supabase-js';

interface Conjugation {
  person: string;
  form: string;
  translation: string;
}

interface Verb {
  infinitive: string;
  translation: string;
  conjugations: Conjugation[];
}

interface GPTResponse {
  verbs: Verb[];
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

export class VerbsImporter {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Импортирует глаголы из JSON ответа GPT
   */
  async importFromGPT(gptResponse: string, userId: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedCount: 0,
      errors: []
    };

    try {
      const data: GPTResponse = JSON.parse(gptResponse);
      
      if (!data.verbs || !Array.isArray(data.verbs)) {
        throw new Error('Неверный формат JSON ответа');
      }

      for (const verb of data.verbs) {
        const validation = this.validateVerb(verb);
        
        if (!validation.valid) {
          result.errors.push(`Глагол ${verb.infinitive}: ${validation.error}`);
          continue;
        }

        try {
          const { error } = await this.supabase
            .from('verbs')
            .insert({
              infinitive: verb.infinitive,
              translation: verb.translation,
              conjugations: verb.conjugations,
              user_id: userId,
              learned: false
            });

          if (error) {
            result.errors.push(`Ошибка импорта ${verb.infinitive}: ${error.message}`);
          } else {
            result.importedCount++;
          }
        } catch (error) {
          result.errors.push(`Ошибка импорта ${verb.infinitive}: ${error.message}`);
        }
      }

      result.success = result.importedCount > 0;
      return result;

    } catch (error) {
      result.errors.push(`Ошибка парсинга JSON: ${error.message}`);
      return result;
    }
  }

  /**
   * Валидирует структуру глагола
   */
  private validateVerb(verb: Verb): { valid: boolean; error?: string } {
    const requiredPersons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie / Sie'];

    if (!verb.infinitive || !verb.translation) {
      return { valid: false, error: 'Отсутствуют обязательные поля' };
    }

    if (!Array.isArray(verb.conjugations) || verb.conjugations.length !== 6) {
      return { valid: false, error: 'Неверное количество форм спряжения' };
    }

    const persons = verb.conjugations.map(c => c.person);
    for (const person of requiredPersons) {
      if (!persons.includes(person)) {
        return { valid: false, error: `Отсутствует форма: ${person}` };
      }
    }

    return { valid: true };
  }
}
```

## Инструкции по использованию

### 1. Подготовка

1. Скопируйте промпт из `GPT-VERBS-IMPORT-PROMPT.md`
2. Отправьте его в GPT с указанием количества и категории глаголов
3. Получите JSON ответ

### 2. Импорт

#### Вариант A: Через SQL
1. Замените `[JSON_ОТВЕТ]` на полученный от GPT JSON
2. Замените `[USER_ID]` на ID пользователя
3. Выполните SQL функцию

#### Вариант B: Через Node.js
1. Установите зависимости: `npm install @supabase/supabase-js`
2. Настройте переменные окружения для Supabase
3. Запустите скрипт импорта

#### Вариант C: Через TypeScript
1. Установите зависимости: `npm install @supabase/supabase-js`
2. Настройте TypeScript конфигурацию
3. Используйте класс `VerbsImporter`

### 3. Проверка

После импорта проверьте:
- Количество импортированных глаголов
- Правильность спряжений
- Отсутствие дубликатов

## Пример использования

```javascript
// Пример использования Node.js парсера
const { importVerbsFromGPT } = require('./verbs-import-parser');

const gptResponse = `{
  "verbs": [
    {
      "infinitive": "arbeiten",
      "translation": "работать",
      "conjugations": [
        {"person": "ich", "form": "arbeite", "translation": "я работаю"},
        {"person": "du", "form": "arbeitest", "translation": "ты работаешь"},
        {"person": "er/sie/es", "form": "arbeitet", "translation": "он работает"},
        {"person": "wir", "form": "arbeiten", "translation": "мы работаем"},
        {"person": "ihr", "form": "arbeitet", "translation": "вы работаете"},
        {"person": "sie / Sie", "form": "arbeiten", "translation": "они работают"}
      ]
    }
  ]
}`;

const userId = 'your-user-id-here';

importVerbsFromGPT(gptResponse, userId)
  .then(results => {
    console.log('Импорт завершен:', results);
  })
  .catch(error => {
    console.error('Ошибка импорта:', error);
  });
``` 