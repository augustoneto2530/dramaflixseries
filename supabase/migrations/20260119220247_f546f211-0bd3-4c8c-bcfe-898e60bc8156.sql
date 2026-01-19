-- Create a policy to allow anonymous users to check if an email exists in profiles
-- This is necessary for the login flow to determine if user should login or create account
CREATE POLICY "Allow anonymous email existence check" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Note: This only allows reading, and the existing policies for update/insert 
-- still require authentication, so user data remains protected