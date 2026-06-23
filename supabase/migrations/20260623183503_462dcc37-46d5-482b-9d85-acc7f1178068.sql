CREATE OR REPLACE FUNCTION public.ensure_current_user_profile(p_full_name text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(COALESCE(auth.email(), auth.jwt() ->> 'email')));
  v_profile public.profiles;
BEGIN
  IF v_user_id IS NULL OR v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Usuário autenticado é obrigatório';
  END IF;

  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    subscription_status,
    plan_type,
    is_vip,
    has_adult_access
  )
  VALUES (
    v_user_id,
    v_email,
    COALESCE(NULLIF(trim(p_full_name), ''), v_email),
    'inactive'::subscription_status,
    NULL,
    false,
    false
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(trim(p_full_name), ''), public.profiles.full_name),
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_user_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(text) TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;