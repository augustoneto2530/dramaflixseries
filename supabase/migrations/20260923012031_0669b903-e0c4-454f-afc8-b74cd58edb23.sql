CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_access_content(_content_id uuid, _is_adult boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::public.app_role)
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
            p.subscription_status = 'active'::public.subscription_status
            AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
            AND p.plan_type = 'annual'::public.plan_type
          )
          OR (
            _is_adult = true
            AND p.has_adult_access = true
            AND (p.adult_access_end_date IS NULL OR p.adult_access_end_date > now())
          )
          OR (_is_adult = false AND c.is_new = false)
          OR (
            _is_adult = false
            AND p.subscription_status = 'active'::public.subscription_status
            AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
            AND p.plan_type = 'monthly'::public.plan_type
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_access_episodes(_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id = _content_id
      AND private.can_access_content(c.id, c.is_adult)
  );
$$;

REVOKE ALL ON FUNCTION private.can_access_content(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_episodes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_access_content(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_access_episodes(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view episodes based on access" ON public.episodes;
CREATE POLICY "Users can view episodes based on access"
ON public.episodes FOR SELECT
USING (private.can_access_episodes(content_id));

DROP POLICY IF EXISTS "Users can view content based on access" ON public.contents;
CREATE POLICY "Users can view content based on access"
ON public.contents FOR SELECT
USING (private.can_access_content(id, is_adult));

REVOKE ALL ON FUNCTION public.current_profile_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_content(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_episodes(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.current_profile_access();
DROP FUNCTION public.can_access_episodes(uuid);
DROP FUNCTION public.can_access_content(uuid, boolean);