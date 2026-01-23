-- Drop the existing policy that doesn't include single content purchasers
DROP POLICY IF EXISTS "Subscribers can view episodes" ON public.episodes;

-- Create a new policy that includes users who purchased the specific content
CREATE POLICY "Users can view episodes based on access"
ON public.episodes
FOR SELECT
USING (
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- VIP users can view all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_vip = true
  )
  OR
  -- Active subscribers can view all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.subscription_status = 'active'::subscription_status
  )
  OR
  -- Users who purchased the specific content can view its episodes
  EXISTS (
    SELECT 1 FROM user_content_purchases
    WHERE user_content_purchases.user_id = auth.uid()
    AND user_content_purchases.content_id = episodes.content_id
    AND (user_content_purchases.expires_at IS NULL OR user_content_purchases.expires_at > now())
  )
);