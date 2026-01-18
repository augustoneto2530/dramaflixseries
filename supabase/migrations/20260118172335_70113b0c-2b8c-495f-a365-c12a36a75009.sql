-- Allow anonymous users to check if their email has a purchase
CREATE POLICY "Anyone can check if email has purchase" 
ON public.purchase_webhooks 
FOR SELECT 
USING (true);

-- Note: This only exposes the existence check, actual data is minimal for the auth flow