
-- Fix the privilege escalation trigger to correctly detect service_role calls
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  -- Detect role through multiple mechanisms (works with both legacy JWT and new signing keys)
  BEGIN
    v_role := COALESCE(
      current_setting('request.jwt.claim.role', true),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
    );
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  -- service_role (edge functions / webhooks) bypass restrictions
  IF v_role = 'service_role' OR current_user = 'service_role' OR session_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins can change anything
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Otherwise, force privilege fields back to OLD values
  NEW.subscription_status      := OLD.subscription_status;
  NEW.plan_type                := OLD.plan_type;
  NEW.subscription_start_date  := OLD.subscription_start_date;
  NEW.subscription_end_date    := OLD.subscription_end_date;
  NEW.is_vip                   := OLD.is_vip;
  NEW.has_adult_access         := OLD.has_adult_access;
  NEW.adult_access_start_date  := OLD.adult_access_start_date;
  NEW.adult_access_end_date    := OLD.adult_access_end_date;
  NEW.email                    := OLD.email;
  NEW.user_id                  := OLD.user_id;

  RETURN NEW;
END;
$function$;

-- Backfill: reactivate all VIP buyers that were blocked
UPDATE public.profiles p
SET
  is_vip = true,
  subscription_status = 'active',
  plan_type = 'annual',
  subscription_start_date = COALESCE(p.subscription_start_date, w.created_at),
  subscription_end_date = COALESCE(p.subscription_end_date, w.created_at + interval '1 year'),
  has_adult_access = true,
  adult_access_start_date = COALESCE(p.adult_access_start_date, w.created_at),
  adult_access_end_date = COALESCE(p.adult_access_end_date, w.created_at + interval '1 year')
FROM (
  SELECT DISTINCT ON (buyer_email) buyer_email, created_at
  FROM public.purchase_webhooks
  WHERE product_name IN ('Plano VIP', 'Plano Anual')
    AND processed = true
  ORDER BY buyer_email, created_at DESC
) w
WHERE p.email = w.buyer_email
  AND (p.subscription_status <> 'active' OR p.is_vip = false OR p.plan_type IS NULL);
