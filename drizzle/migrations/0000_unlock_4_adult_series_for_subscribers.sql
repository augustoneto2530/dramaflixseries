CREATE OR REPLACE FUNCTION private.can_access_content(_content_id uuid, _is_adult boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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
          OR (
            _content_id IN (
              '9aa670dd-725f-4c79-8eb2-2046bc7456c4',
              'f81aa496-708e-4154-99b7-1148f4f91f77',
              '1a2b1e56-ed07-4c79-b6b9-be0f6ba70943',
              'a46d57ec-b91e-4a63-8b9a-7a7228c74289'
            )
            AND p.subscription_status = 'active'::public.subscription_status
            AND (p.subscription_end_date IS NULL OR p.subscription_end_date > now())
            AND p.plan_type IN ('monthly'::public.plan_type, 'annual'::public.plan_type)
          )
        )
    );
$function$;