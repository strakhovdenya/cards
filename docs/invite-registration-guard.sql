-- Регистрация только по приглашению: проверка в БД (issue #137, ADR-008)
--
-- Порядок применения (ADR-002), прод и preview делят эту базу:
--   ШАГ 1 (аддитивный) — применить ДО мёржа кода #137. Повторное применение
--          безопасно (CREATE OR REPLACE / DROP ... IF EXISTS). Старый
--          задеплоенный код продолжает работать: он не передаёт код
--          приглашения в данных регистрации, и для такой регистрации
--          временно действует проверка только по адресу.
--   ШАГ 2 (удаление старого) — применить ТОЛЬКО ПОСЛЕ выкатки кода #137 на main.
--          Убирает временную проверку по адресу (код становится обязательным)
--          и анонимную политику чтения invites. До выкатки старый код читает
--          invites анонимным ключом и не передаёт код — ШАГ 2 сломал бы ему
--          регистрацию по приглашению.
--
-- В Supabase SQL editor выделяйте и выполняйте каждый шаг отдельно.
--
-- Поведение:
--   * admins_exist() / invite_code_is_valid(code) — SECURITY DEFINER, доступны
--     anon и authenticated, возвращают только boolean.
--   * Если в profiles есть администратор, вставка в auth.users требует
--     действующего (не использованного, не истёкшего) приглашения:
--     код из raw_user_meta_data->>'invite_code' и email приглашения, совпадающий
--     с адресом регистрации без учёта регистра и пробелов. Иначе вставка
--     отклоняется, Supabase Auth отвечает ошибкой (HTTP 500, код 23514).
--   * Код удаляется из raw_user_meta_data до записи пользователя.
--   * Гасится ровно найденное приглашение (used, used_by, used_at). Его id
--     BEFORE-триггер передаёт AFTER-триггеру через транзакционную настройку
--     app.signup_invite_id: в BEFORE INSERT строки auth.users ещё нет, и внешний
--     ключ invites.used_by на неё не прошёл бы.
--   * Проверка касается ЛЮБОЙ вставки в auth.users. После ШАГА 2
--     Authentication → Users → Add user в dashboard не передаёт код и будет
--     отклонён: новых пользователей заводите через приглашение в приложении.

-- =============================================================================
-- ШАГ 1. Аддитивная миграция: функции и триггеры
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admins_exist()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.invite_code_is_valid(code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invites i
    WHERE i.invite_code = invite_code_is_valid.code
      AND COALESCE(i.used, false) = false
      AND i.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.admins_exist() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_code_is_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admins_exist() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invite_code_is_valid(text)
  TO anon, authenticated;

-- Проверка приглашения до вставки пользователя.
-- FOR UPDATE блокирует строку приглашения до конца транзакции, поэтому две
-- одновременные регистрации по одному приглашению не пройдут обе: вторая
-- дождётся первой и увидит used = true.
CREATE OR REPLACE FUNCTION public.check_invite_before_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submitted_code text := NULLIF(trim(NEW.raw_user_meta_data->>'invite_code'), '');
  invite_id uuid;
BEGIN
  NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'invite_code';
  PERFORM set_config('app.signup_invite_id', '', true);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RETURN NEW;
  END IF;

  IF submitted_code IS NOT NULL THEN
    SELECT i.id INTO invite_id
    FROM public.invites i
    WHERE i.invite_code = submitted_code
      AND lower(trim(i.email)) = lower(trim(NEW.email))
      AND COALESCE(i.used, false) = false
      AND i.expires_at > now()
    FOR UPDATE;
  ELSE
    -- ВРЕМЕННО: регистрация старым кодом без invite_code. Убирается ШАГОМ 2.
    SELECT i.id INTO invite_id
    FROM public.invites i
    WHERE lower(trim(i.email)) = lower(trim(NEW.email))
      AND COALESCE(i.used, false) = false
      AND i.expires_at > now()
    ORDER BY i.expires_at, i.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF invite_id IS NULL THEN
    RAISE EXCEPTION 'Registration requires a valid invite for this email'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.signup_invite_id', invite_id::text, true);
  RETURN NEW;
END;
$$;

-- Отметка «приглашение использовано» после вставки пользователя: ровно то
-- приглашение, которое нашла проверка выше в этой же транзакции.
CREATE OR REPLACE FUNCTION public.mark_invite_used_after_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_id text := NULLIF(current_setting('app.signup_invite_id', true), '');
BEGIN
  IF invite_id IS NOT NULL THEN
    UPDATE public.invites
    SET used = true,
        used_by = NEW.id,
        used_at = now()
    WHERE id = invite_id::uuid;

    PERFORM set_config('app.signup_invite_id', '', true);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_invite_before_signup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_invite_used_after_signup() FROM PUBLIC;

-- Отдельно от on_auth_user_created (handle_new_user), его не трогаем.
DROP TRIGGER IF EXISTS check_invite_before_signup ON auth.users;
CREATE TRIGGER check_invite_before_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_invite_before_signup();

DROP TRIGGER IF EXISTS mark_invite_used_after_signup ON auth.users;
CREATE TRIGGER mark_invite_used_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.mark_invite_used_after_signup();

-- Проверка после ШАГА 1 (под ролью anon, например через REST с anon-ключом):
--   select public.admins_exist();                     -- ожидается true
--   select public.invite_code_is_valid('нет-такого'); -- ожидается false

-- Откат ШАГА 1, если что-то пошло не так:
--   DROP TRIGGER IF EXISTS check_invite_before_signup ON auth.users;
--   DROP TRIGGER IF EXISTS mark_invite_used_after_signup ON auth.users;

-- =============================================================================
-- ШАГ 2. Удаление старого — ТОЛЬКО ПОСЛЕ выкатки кода #137
-- =============================================================================

-- Код приглашения обязателен: временная проверка только по адресу убрана.
CREATE OR REPLACE FUNCTION public.check_invite_before_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  submitted_code text := NULLIF(trim(NEW.raw_user_meta_data->>'invite_code'), '');
  invite_id uuid;
BEGIN
  NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'invite_code';
  PERFORM set_config('app.signup_invite_id', '', true);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RETURN NEW;
  END IF;

  IF submitted_code IS NOT NULL THEN
    SELECT i.id INTO invite_id
    FROM public.invites i
    WHERE i.invite_code = submitted_code
      AND lower(trim(i.email)) = lower(trim(NEW.email))
      AND COALESCE(i.used, false) = false
      AND i.expires_at > now()
    FOR UPDATE;
  END IF;

  IF invite_id IS NULL THEN
    RAISE EXCEPTION 'Registration requires a valid invite for this email'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('app.signup_invite_id', invite_id::text, true);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_invite_before_signup() FROM PUBLIC;

-- Политики администраторов ("Admins can view all invites" и др.) остаются,
-- InviteManager продолжает видеть приглашения.
DROP POLICY IF EXISTS "Anonymous can validate invite codes" ON public.invites;

-- Проверка после ШАГА 2:
--   анонимный GET /rest/v1/invites?select=id  -- ожидается 0 строк
