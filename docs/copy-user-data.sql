-- Delete and copy data between users for tables: cards, card_tags, tags (linking), verbs
-- Source user (copy from)
-- cac55133-1b29-46b8-bd86-eac548c60e1c
-- Target user (copy to)
-- 700cb6e5-9c76-4f1c-9e3f-8f7718c413c7

BEGIN;

-- 1) Delete existing data for target user
DELETE FROM public.card_tags
USING public.cards c
WHERE card_tags.card_id = c.id AND c.user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid;

DELETE FROM public.cards
WHERE user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid;

DELETE FROM public.verbs
WHERE user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid;

-- 2) Ensure tags exist for target user: create missing tags by name/color, then map
-- Create any tags that exist for source but not for target (by name)
INSERT INTO public.tags (id, name, color, user_id)
SELECT gen_random_uuid(), t.name, t.color, '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid
FROM public.tags t
LEFT JOIN public.tags tt
  ON tt.user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid AND tt.name = t.name
WHERE t.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'::uuid AND tt.id IS NULL;

-- Build mapping (source tag id -> target tag id) using names
-- Note: in SQL clients without variables, consider using a temp table
CREATE TEMP TABLE _tag_map AS
SELECT s.id AS source_tag_id, d.id AS target_tag_id
FROM public.tags s
JOIN public.tags d
  ON d.user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid AND d.name = s.name
WHERE s.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'::uuid;

-- 3) Copy cards
INSERT INTO public.cards (id, german_word, translation, user_id, learned, created_at, updated_at, word_type, base_form, grammar_data)
SELECT gen_random_uuid(), c.german_word, c.translation, '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid, c.learned, NOW(), NOW(), c.word_type, c.base_form, c.grammar_data
FROM public.cards c
WHERE c.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'::uuid;

-- 4) Copy card_tags using the new card ids and mapped tag ids
-- Create temp mapping for cards based on (german_word, translation) uniqueness per user
CREATE TEMP TABLE _card_map AS
SELECT c_src.id AS source_card_id, c_dst.id AS target_card_id
FROM public.cards c_src
JOIN public.cards c_dst
  ON c_dst.user_id = '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid
 AND c_src.german_word = c_dst.german_word
 AND c_src.translation = c_dst.translation
WHERE c_src.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'::uuid;

INSERT INTO public.card_tags (card_id, tag_id)
SELECT cm.target_card_id, tm.target_tag_id
FROM public.card_tags ct
JOIN _card_map cm ON cm.source_card_id = ct.card_id
JOIN _tag_map tm ON tm.source_tag_id = ct.tag_id;

-- 5) Copy verbs
INSERT INTO public.verbs (id, infinitive, translation, conjugations, examples, user_id, learned, created_at, updated_at)
SELECT gen_random_uuid(), v.infinitive, v.translation, v.conjugations, v.examples, '700cb6e5-9c76-4f1c-9e3f-8f7718c413c7'::uuid, v.learned, NOW(), NOW()
FROM public.verbs v
WHERE v.user_id = 'cac55133-1b29-46b8-bd86-eac548c60e1c'::uuid;

COMMIT;
