
-- ============================================================================
-- Миграция: Генерация примеров (examples) для популярных глаголов
-- ============================================================================

-- 1. Добавляем колонку examples, если отсутствует
ALTER TABLE verbs ADD COLUMN IF NOT EXISTS examples JSONB;

-- 2. Генерация примеров на основе контекста с корректной формой ich (DE/RU)
WITH base AS (
  SELECT
    v.id,
    v.infinitive,
    v.translation AS inf_ru,
    (
      SELECT e->>'form'
      FROM jsonb_array_elements(v.conjugations) e
      WHERE e->>'person' = 'ich'
      LIMIT 1
    ) AS ich_form_de,
    (
      SELECT e->>'translation'
      FROM jsonb_array_elements(v.conjugations) e
      WHERE e->>'person' = 'ich'
      LIMIT 1
    ) AS ich_form_ru,
    abs(hashtext(v.infinitive)) AS h
  FROM verbs v
  WHERE v.infinitive IN (
    'abfahren','abholen','abschließen','abstellen','abwaschen','anbieten','anfangen','ankommen','anmachen','anrufen',
    'arbeiten','aufhören','aufräumen','aufstehen','ausfüllen','ausmachen','aussteigen','backen','baden','bedeuten',
    'beginnen','benutzen','beraten','besichtigen','besprechen','bestätigen','bestellen','besuchen','bezahlen','brauchen',
    'danken','dauern','decken','denken','dürfen','einkaufen','einladen','einsteigen','einziehen','ergänzen','essen',
    'fahren','fernsehen','finden','formulieren','gefallen','gehören','gratulieren','grillen','haben','haben (präteritum)',
    'heißen','helfen','holen','hören','kennen','kennenlernen','kommen','können','krankschreiben','kreuzen','kriegen',
    'laufen','leihen','lernen','lesen','liefern','liegen','machen','markieren','mieten','mitbringen','mitkommen',
    'möchten','mögen','müssen','nehmen','öffnen','parken','programmieren','putzen','rauchen','reservieren','сammeln',
    'schauen','schenken','schicken','schlafen','schließen','schmecken','schneiden','schwimmen','sehen','sein',
    'sein (präteritum)','sollen','sprechen','stattfinden','studieren','suchen','tauschen','tragen','trainieren',
    'treffen','übernachten','umsteigen','umziehen','unterschreiben','vereinbaren','vergessen','vergleichen','verstehen',
    'vorschlagen','wandern','warten','waschen','wehtun','wiederkommen','wohnen','wollen','wünschen','zeichnen','zeigen'
  )
),
ctx AS (
  SELECT
    ARRAY['heute','morgen','am Abend','am Wochenende','bald','gleich','später','oft','selten','manchmal'] AS time_de,
    ARRAY['сегодня','завтра','вечером','на выходных','скоро','сейчас','позже','часто','редко','иногда'] AS time_ru,
    ARRAY['zu Hause','im Park','im Büro','in der Stadt','in der Schule','im Zug','im Café','im Supermarkt','im Auto','am Bahnhof'] AS place_de,
    ARRAY['дома','в парке','в офисе','в городе','в школе','в поезде','в кафе','в супермаркете','в машине','на вокзале'] AS place_ru,
    ARRAY['mit Freunden','mit der Familie','allein','mit Kollegen','mit dem Lehrer','mit dem Kind','mit dem Hund','mit der Gruppe','mit dem Chef','mit der Nachbarin'] AS with_de,
    ARRAY['с друзьями','с семьёй','один','с коллегами','с учителем','с ребёнком','с собакой','с группой','с начальником','с соседкой'] AS with_ru
),
generated AS (
  SELECT
    b.id,
    COALESCE(NULLIF(TRIM(b.ich_form_de), ''), b.infinitive) AS ich_de,
    COALESCE(NULLIF(TRIM(b.ich_form_ru), ''), 'Я ' || b.inf_ru) AS ich_ru,
    s.time_de[(b.h % array_length(s.time_de,1)) + 1] AS t_de,
    s.time_ru[(b.h % array_length(s.time_ru,1)) + 1] AS t_ru,
    s.place_de[((b.h/3) % array_length(s.place_de,1)) + 1] AS p_de,
    s.place_ru[((b.h/3) % array_length(s.place_ru,1)) + 1] AS p_ru,
    s.with_de[((b.h/7) % array_length(s.with_de,1)) + 1] AS w_de,
    s.with_ru[((b.h/7) % array_length(s.with_ru,1)) + 1] AS w_ru,
    b.infinitive,
    b.inf_ru
  FROM base b
  CROSS JOIN LATERAL (
    SELECT * FROM ctx
  ) AS s
)
UPDATE verbs v
SET examples = jsonb_build_object(
  'affirmativeSentence', generated.ich_de || ' ' || generated.t_de || ' ' || generated.p_de || ' ' || generated.w_de || '.',
  'affirmativeTranslation', generated.ich_ru || ' ' || generated.t_ru || ' ' || generated.p_ru || ' ' || generated.w_ru || '.',
  'questionSentence', 'Kannst du ' || generated.t_de || ' ' || generated.p_de || ' ' || generated.w_de || ' ' || generated.infinitive || '?',
  'questionTranslation', 'Ты можешь ' || generated.t_ru || ' ' || generated.p_ru || ' ' || generated.w_ru || ' ' || generated.inf_ru || '?',
  'shortAnswer', 'Ja, ich kann.',
  'shortAnswerTranslation', 'Да, могу.'
)
FROM generated
WHERE v.id = generated.id;

-- 3. Обновляем updated_at
UPDATE verbs v
SET updated_at = NOW()
WHERE v.examples IS NOT NULL
  AND v.examples <> '{}'::jsonb;
