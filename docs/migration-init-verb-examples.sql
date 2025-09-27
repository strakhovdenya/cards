-- Инициализация поля examples для глаголов (инфинитивы из списка)
-- Безопасно добавляем столбец, если он ещё не создан
ALTER TABLE verbs ADD COLUMN IF NOT EXISTS examples JSONB;

-- Заполняем examples пустыми значениями, чтобы UI мог работать сразу
-- (вы можете позже обновить каждую запись реальными примерами)
UPDATE verbs
SET examples = jsonb_build_object(
  'affirmativeSentence', '',
  'affirmativeTranslation', '',
  'questionSentence', '',
  'shortAnswer', ''
)
WHERE examples IS NULL
  AND infinitive IN (
    'abfahren',
    'abholen',
    'abschließen',
    'abstellen',
    'abwaschen',
    'anbieten',
    'anfangen',
    'ankommen',
    'anmachen',
    'anrufen',
    'arbeiten',
    'aufhören',
    'aufräumen',
    'aufstehen',
    'ausfüllen',
    'ausmachen',
    'aussteigen',
    'backen',
    'baden',
    'bedeuten',
    'beginnen',
    'benutzen',
    'beraten',
    'besichtigen',
    'besprechen',
    'bestätigen',
    'bestellen',
    'besuchen',
    'bezahlen',
    'brauchen',
    'danken',
    'dauern',
    'decken',
    'denken',
    'dürfen',
    'einkaufen',
    'einladen',
    'einsteigen',
    'einziehen',
    'ergänzen',
    'essen',
    'fahren',
    'fernsehen',
    'finden',
    'formulieren',
    'gefallen',
    'gehören',
    'gratulieren',
    'grillen',
    'haben',
    'haben (präteritum)',
    'heißen',
    'helfen',
    'holen',
    'hören',
    'kennen',
    'kennenlernen',
    'kommen',
    'können',
    'krankschreiben',
    'kreuzen',
    'kriegen',
    'laufen',
    'leihen',
    'lernen',
    'lesen',
    'liefern',
    'liegen',
    'machen',
    'markieren',
    'mieten',
    'mitbringen',
    'mitkommen',
    'möchten',
    'mögen',
    'müssen',
    'nehmen',
    'öffnen',
    'parken',
    'programmieren',
    'putzen',
    'rauchen',
    'reservieren',
    'sammeln',
    'schauen',
    'schenken',
    'schicken',
    'schlafen',
    'schließen',
    'schmecken',
    'schneiden',
    'schwimmen',
    'sehen',
    'sein',
    'sein (präteritum)',
    'sollen',
    'sprechen',
    'stattfinden',
    'studieren',
    'suchen',
    'tauschen',
    'tragen',
    'trainieren',
    'treffen',
    'übernachten',
    'umsteigen',
    'umziehen',
    'unterschreiben',
    'vereinbaren',
    'vergessen',
    'vergleichen',
    'verstehen',
    'vorschlagen',
    'wandern',
    'warten',
    'waschen',
    'wehtun',
    'wiederkommen',
    'wohnen',
    'wollen',
    'wünschen',
    'zeichnen',
    'zeigen'
  );

-- Опционально: обновляем updated_at, если столбец существует
UPDATE verbs
SET updated_at = NOW()
WHERE examples IS NOT NULL
  AND infinitive IN (
    'abfahren','abholen','abschließen','abstellen','abwaschen','anbieten','anfangen','ankommen','anmachen','anrufen','arbeiten','aufhören','aufräumen','aufstehen','ausfüllen','ausmachen','aussteigen','backen','baden','bedeuten','beginnen','benutzen','beraten','besichtigen','besprechen','bestätigen','bestellen','besuchen','bezahlen','brauchen','danken','dauern','decken','denken','dürfen','einkaufen','einladen','einsteigen','einziehen','ergänzen','essen','fahren','fernsehen','finden','formulieren','gefallen','gehören','gratulieren','grillen','haben','haben (präteritum)','heißen','helfen','holen','hören','kennen','kennenlernen','kommen','können','krankschreiben','kreuzen','kriegen','laufen','leihen','lernen','lesen','liefern','liegen','machen','markieren','mieten','mitbringen','mitkommen','möchten','mögen','müssen','nehmen','öffnen','parken','programmieren','putzen','rauchen','reservieren','sammeln','schauen','schenken','schicken','schlafen','schließen','schmecken','schneiden','schwimmen','sehen','sein','sein (präteritum)','sollen','sprechen','stattfinden','studieren','suchen','tauschen','tragen','trainieren','treffen','übernachten','umsteigen','umziehen','unterschreiben','vereinbaren','vergessen','vergleichen','verstehen','vorschlagen','wandern','warten','waschen','wehtun','wiederkommen','wohnen','wollen','wünschen','zeichnen','zeigen'
  );











