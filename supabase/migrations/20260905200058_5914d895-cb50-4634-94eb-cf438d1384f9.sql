
-- Fast helper functions (evaluated once per query, not per row)
CREATE OR REPLACE FUNCTION public.current_profile_access()
RETURNS TABLE(is_vip boolean, is_active boolean, plan_type plan_type, has_adult_access boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.is_vip,
         p.subscription_status = 'active'::subscription_status,
         p.plan_type,
         p.has_adult_access
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
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          p.is_vip = true
          OR (p.subscription_status = 'active'::subscription_status AND p.plan_type = 'annual'::plan_type)
          OR (_is_adult = false AND p.subscription_status = 'active'::subscription_status AND p.plan_type = 'monthly'::plan_type)
          OR (_is_adult = true AND p.subscription_status = 'active'::subscription_status AND p.has_adult_access = true)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.user_content_purchases u
      WHERE u.user_id = auth.uid()
        AND u.content_id = _content_id
        AND (u.expires_at IS NULL OR u.expires_at > now())
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_episodes(_content_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_vip = true OR p.subscription_status = 'active'::subscription_status)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_content_purchases u
      WHERE u.user_id = auth.uid()
        AND u.content_id = _content_id
        AND (u.expires_at IS NULL OR u.expires_at > now())
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_access() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_content(uuid, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_episodes(uuid) TO authenticated, anon, service_role;

-- Episodes: replace per-row heavy policy
DROP POLICY IF EXISTS "Users can view episodes based on access" ON public.episodes;
CREATE POLICY "Users can view episodes based on access"
ON public.episodes FOR SELECT
USING (public.can_access_episodes(content_id));

DROP POLICY IF EXISTS "Admins can manage episodes" ON public.episodes;
CREATE POLICY "Admins can manage episodes"
ON public.episodes FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Contents
DROP POLICY IF EXISTS "Users can view content based on access" ON public.contents;
CREATE POLICY "Users can view content based on access"
ON public.contents FOR SELECT
USING (public.can_access_content(id, is_adult));

DROP POLICY IF EXISTS "Admins can manage content" ON public.contents;
CREATE POLICY "Admins can manage content"
ON public.contents FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Purchase webhooks (admin only) - evaluate role once
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.purchase_webhooks;
CREATE POLICY "Admins can manage webhooks"
ON public.purchase_webhooks FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Admins can view webhooks" ON public.purchase_webhooks;
CREATE POLICY "Admins can view webhooks"
ON public.purchase_webhooks FOR SELECT
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Watch progress
DROP POLICY IF EXISTS "Users can manage own progress" ON public.watch_progress;
CREATE POLICY "Users can manage own progress"
ON public.watch_progress FOR ALL
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Content clicks
DROP POLICY IF EXISTS "Admins can manage clicks" ON public.content_clicks;
CREATE POLICY "Admins can manage clicks"
ON public.content_clicks FOR ALL
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Admins can view all clicks" ON public.content_clicks;
CREATE POLICY "Admins can view all clicks"
ON public.content_clicks FOR SELECT
USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contents_created_at ON public.contents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_webhooks_buyer_email_lower ON public.purchase_webhooks (lower(buyer_email));

-- Drop duplicate constraints/indexes (write overhead)
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_user_episode_unique;
DROP INDEX IF EXISTS public.watch_progress_user_episode_unique;
ALTER TABLE public.user_content_purchases DROP CONSTRAINT IF EXISTS idx_user_content_purchases_unique;
DROP INDEX IF EXISTS public.idx_user_content_purchases_unique;

ANALYZE public.episodes;
ANALYZE public.contents;
ANALYZE public.purchase_webhooks;
