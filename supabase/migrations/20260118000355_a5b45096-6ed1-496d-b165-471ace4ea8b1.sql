-- Add new plan types
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'adult';
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'single_content';

-- Add adult_access to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_adult_access BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adult_access_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS adult_access_end_date TIMESTAMP WITH TIME ZONE;

-- Create table for individual content purchases
CREATE TABLE IF NOT EXISTS public.user_content_purchases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_lifetime BOOLEAN NOT NULL DEFAULT true,
    transaction_id TEXT,
    webhook_id UUID REFERENCES public.purchase_webhooks(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, content_id)
);

-- Enable RLS on user_content_purchases
ALTER TABLE public.user_content_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own content purchases"
ON public.user_content_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all purchases
CREATE POLICY "Admins can manage content purchases"
ON public.user_content_purchases
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_content_purchases_user_id ON public.user_content_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_purchases_content_id ON public.user_content_purchases(content_id);

-- Update contents RLS to handle single content purchases
DROP POLICY IF EXISTS "Subscribers can view content" ON public.contents;

CREATE POLICY "Users can view content based on access"
ON public.contents
FOR SELECT
USING (
    -- Admins can see everything
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- VIP users can see everything
    (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.is_vip = true
    ))
    OR
    -- Annual subscribers can see everything
    (EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.subscription_status = 'active'::subscription_status
        AND profiles.plan_type = 'annual'::plan_type
    ))
    OR
    -- Monthly subscribers can see non-adult content
    (
        is_adult = false 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.subscription_status = 'active'::subscription_status
            AND profiles.plan_type = 'monthly'::plan_type
        )
    )
    OR
    -- Monthly subscribers with adult access can see adult content
    (
        is_adult = true 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.subscription_status = 'active'::subscription_status
            AND profiles.has_adult_access = true
        )
    )
    OR
    -- Users who purchased this specific content
    (EXISTS (
        SELECT 1 FROM user_content_purchases 
        WHERE user_content_purchases.user_id = auth.uid() 
        AND user_content_purchases.content_id = contents.id
        AND (user_content_purchases.expires_at IS NULL OR user_content_purchases.expires_at > now())
    ))
);