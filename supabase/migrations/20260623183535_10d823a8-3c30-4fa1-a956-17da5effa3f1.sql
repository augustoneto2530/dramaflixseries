DROP POLICY IF EXISTS "Users can view episodes based on access" ON public.episodes;

CREATE POLICY "Users can view episodes based on access"
ON public.episodes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = episodes.content_id
      AND c.is_adult = false
      AND c.is_new = false
      AND auth.uid() IS NOT NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_vip = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.subscription_status = 'active'::subscription_status
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_content_purchases
    WHERE user_content_purchases.user_id = auth.uid()
      AND user_content_purchases.content_id = episodes.content_id
      AND (user_content_purchases.expires_at IS NULL OR user_content_purchases.expires_at > now())
  )
);