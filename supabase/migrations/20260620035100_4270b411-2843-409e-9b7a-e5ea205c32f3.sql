
-- 1) Drop overly permissive public-read policies
DROP POLICY IF EXISTS "Allow anonymous email existence check" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can check if email has purchase" ON public.purchase_webhooks;

-- 2) Narrow RPC: check if email has any purchase and return display info for login flow
CREATE OR REPLACE FUNCTION public.check_email_purchase_info(p_email text)
RETURNS TABLE(has_purchase boolean, buyer_name text, product_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    TRUE AS has_purchase,
    w.buyer_name,
    w.product_name
  FROM public.purchase_webhooks w
  WHERE w.buyer_email = lower(trim(p_email))
  ORDER BY w.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.check_email_purchase_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_purchase_info(text) TO anon, authenticated;

-- 3) Narrow RPC: check if a profile already exists for an email
CREATE OR REPLACE FUNCTION public.email_has_profile(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = lower(trim(p_email))
      AND user_id IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.email_has_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_has_profile(text) TO anon, authenticated;

-- 4) Prevent self-escalation: trigger that blocks regular users from changing privilege columns
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- service_role (edge functions / webhooks) and admins can change anything
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

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
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
