
-- 1) content_clicks: replace always-true insert with authenticated/self-scoped check
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.content_clicks;
CREATE POLICY "Authenticated users can insert own clicks"
ON public.content_clicks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- 2) episodes: remove the bare auth.uid() IS NOT NULL branch
DROP POLICY IF EXISTS "Users can view episodes based on access" ON public.episodes;
CREATE POLICY "Users can view episodes based on access"
ON public.episodes
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_vip = true
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.subscription_status = 'active'::subscription_status
  )
  OR EXISTS (
    SELECT 1 FROM public.user_content_purchases
    WHERE user_content_purchases.user_id = auth.uid()
      AND user_content_purchases.content_id = episodes.content_id
      AND (user_content_purchases.expires_at IS NULL OR user_content_purchases.expires_at > now())
  )
);

-- 3) online_users: drop the USING(true) viewer policy. Admin-only view policy + self-update policy already exist.
DROP POLICY IF EXISTS "Authenticated can view online users" ON public.online_users;

-- Allow users to view their own presence row (so they can read back their own state)
CREATE POLICY "Users can view own presence"
ON public.online_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
