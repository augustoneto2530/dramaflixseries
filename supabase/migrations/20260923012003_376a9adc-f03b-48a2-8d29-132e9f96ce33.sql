CREATE OR REPLACE FUNCTION public.current_profile_access()
RETURNS TABLE(is_vip boolean, is_active boolean, plan_type plan_type, has_adult_access boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.is_vip AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now()),
    p.subscription_status = 'active'::subscription_status
      AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now()),
    p.plan_type,
    p.has_adult_access AND (p.adult_access_end_date IS NULL OR p.adult_access_end_date > now())
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_content(_content_id uuid, _is_adult boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_content_purchases u
      WHERE u.user_id = auth.uid()
        AND u.content_id = _content_id
        AND (u.expires_at IS NULL OR u.expires_at > now())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.contents c ON c.id = _content_id
      WHERE p.user_id = auth.uid()
        AND (
          (p.is_vip = true AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now()))
          OR (
            p.subscription_status = 'active'::subscription_status
            AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
            AND p.plan_type = 'annual'::plan_type
          )
          OR (
            _is_adult = true
            AND p.has_adult_access = true
            AND (p.adult_access_end_date IS NULL OR p.adult_access_end_date > now())
          )
          OR (
            _is_adult = false
            AND c.is_new = false
          )
          OR (
            _is_adult = false
            AND p.subscription_status = 'active'::subscription_status
            AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
            AND p.plan_type = 'monthly'::plan_type
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_episodes(_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = _content_id
      AND public.can_access_content(c.id, c.is_adult)
  );
$$;

REVOKE ALL ON FUNCTION public.current_profile_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_content(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_episodes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_access() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_content(uuid, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_episodes(uuid) TO authenticated, anon, service_role;