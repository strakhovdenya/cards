-- Заполнение поля examples по новым правилам для указанных инфинитивов
-- Генерируем уникальные фразы по глаголу с вариативными контекстами и переводами

-- 1) Убедимся, что столбец существует
ALTER TABLE verbs ADD COLUMN IF NOT EXISTS examples JSONB;

-- 2) Подготовим контексты (DE/RU) и сгенерируем уникальные примеры для каждого глагола
WITH base AS (
  SELECT
    v.id,
    v.infinitive,
    v.translation,
    (
      SELECT elem->>'form'
      FROM jsonb_array_elements(v.conjugations) elem
      WHERE elem->>'person' = 'ich'
      LIMIT 1
    ) AS ich_form,
    abs(hashtext(v.infinitive)) AS h
  FROM verbs v
  WHERE v.infinitive IN (
    'abfahren','abholen','abschließen','abstellen','abwaschen','anbieten','anfangen','ankommen','anmachen','anrufen','arbeiten','aufhören','aufräumen','aufstehen','ausfüllen','ausmachen','aussteigen','backen','baden','bedeuten','beginnen','benutzen','beraten','besichtigen','besprechen','bestätigen','bestellen','besuchen','bezahlen','brauchen','danken','dauern','decken','denken','dürfen','einkaufen','einladen','einsteigen','einziehen','ergänzen','essen','fahren','fernsehen','finden','formulieren','gefallen','gehören','gratulieren','grillen','haben','haben (präteritum)','heißen','helfen','holen','hören','kennen','kennenlernen','kommen','können','krankschreiben','kreuzen','kriegen','laufen','leihen','lernen','lesen','liefern','liegen','machen','markieren','mieten','mitbringen','mitkommen','möchten','mögen','müssen','nehmen','öffnen','parken','programmieren','putzen','rauchen','reservieren','sammeln','schauen','schenken','schicken','schlafen','schließen','schmecken','schneiden','schwimmen','sehen','sein','sein (präteritum)','sollen','sprechen','stattfinden','studieren','suchen','tauschen','tragen','trainieren','treffen','übernachten','umsteigen','umziehen','unterschreiben','vereinbaren','vergessen','vergleichen','verstehen','vorschlagen','wandern','warten','waschen','wehtun','wiederkommen','wohnen','wollen','wünschen','zeichnen','zeigen'
  )
),
ctx AS (
  SELECT
    ARRAY['heute','morgen','am Abend','am Wochenende','bald','gleich','später','oft','selten','manchmal']::text[] AS time_de,
    ARRAY['сегодня','завтра','вечером','на выходных','скоро','сейчас','позже','часто','редко','иногда']::text[] AS time_ru,
    ARRAY['zu Hause','im Park','im Büro','in der Stadt','in der Schule','im Zug','im Café','im Supermarkt','im Auto','am Bahnhof']::text[] AS place_de,
    ARRAY['дома','в парке','в офисе','в городе','в школе','в поезде','в кафе','в супермаркете','в машине','на вокзале']::text[] AS place_ru,
    ARRAY['mit Freunden','mit der Familie','allein','mit Kollegen','mit dem Lehrer','mit dem Kind','mit dem Hund','mit der Gruppe','mit dem Chef','mit der Nachbarin']::text[] AS with_de,
    ARRAY['с друзьями','с семьёй','один','с коллегами','с учителем','с ребёнком','с собакой','с группой','с начальником','с соседкой']::text[] AS with_ru
),
generated AS (
  SELECT
    b.id,
    b.infinitive,
    b.translation,
    COALESCE(NULLIF(trim(b.ich_form), ''), b.infinitive) AS ich_form,
    t_de[(b.h % array_length(t_de,1)) + 1] AS t_de,
    t_ru[(b.h % array_length(t_ru,1)) + 1] AS t_ru,
    p_de[((b.h/3) % array_length(p_de,1)) + 1] AS p_de,
    p_ru[((b.h/3) % array_length(p_ru,1)) + 1] AS p_ru,
    w_de[((b.h/7) % array_length(w_de,1)) + 1] AS w_de,
    w_ru[((b.h/7) % array_length(w_ru,1)) + 1] AS w_ru
  FROM base b
  CROSS JOIN LATERAL (
    SELECT time_de AS t_de, time_ru AS t_ru, place_de AS p_de, place_ru AS p_ru, with_de AS w_de, with_ru AS w_ru FROM ctx
  ) s
)
UPDATE verbs v
SET examples = jsonb_build_object(
  'affirmativeSentence', 'Ich ' || g.ich_form || ' ' || g.t_de || ' ' || g.p_de || ' ' || g.w_de || '.',
  'affirmativeTranslation', 'Я ' || v.translation || ' ' || g.t_ru || ' ' || g.p_ru || ' ' || g.w_ru || '.',
  'questionSentence', 'Kannst du ' || v.infinitive || ' ' || g.t_de || ' ' || g.p_de || ' ' || g.w_de || '?',
  'questionTranslation', 'Ты можешь ' || v.translation || ' ' || g.t_ru || ' ' || g.p_ru || ' ' || g.w_ru || '?',
  'shortAnswer', 'Ja, ich kann.',
  'shortAnswerTranslation', 'Да, могу.'
)
FROM generated g
WHERE v.id = g.id
  AND (v.examples IS NULL OR v.examples = '{}'::jsonb);

-- 3) Обновим updated_at для изменённых строк
UPDATE verbs v
SET updated_at = NOW()
WHERE (examples IS NOT NULL AND examples <> '{}'::jsonb)
  AND v.infinitive IN (
    'abfahren','abholen','abschließen','abstellen','abwaschen','anbieten','anfangen','ankommen','anmachen','anrufen','arbeiten','aufhören','aufräumen','aufstehen','ausfüllen','ausmachen','aussteigen','backen','baden','bedeuten','beginnen','benutzen','beraten','besichtigen','besprechen','bestätigen','bestellen','besuchen','bezahlen','brauchen','danken','dauern','decken','denken','dürfen','einkaufen','einladen','einsteigen','einziehen','ergänzen','essen','fahren','fernsehen','finden','formulieren','gefallen','gehören','gratulieren','grillen','haben','haben (präteritum)','heißen','helfen','holen','hören','kennen','kennenlernen','kommen','können','krankschreiben','kreuzen','kriegen','laufen','leihen','lernen','lesen','liefern','liegen','machen','markieren','mieten','mitbringen','mitkommen','möchten','mögen','müssen','nehmen','öffnen','parken','programmieren','putzen','rauchen','reservieren','sammeln','schauen','schenken','schicken','schlafen','schließen','schmecken','schneiden','schwimmen','sehen','sein','sein (präteritum)','sollen','sprechen','stattfinden','studieren','suchen','tauschen','tragen','trainieren','treffen','übernachten','umsteigen','umziehen','unterschreiben','vereinbaren','vergessen','vergleichen','verstehen','vorschlagen','wandern','warten','waschen','wehtun','wiederkommen','wohnen','wollen','wünschen','zeichnen','zeigen'
  );


