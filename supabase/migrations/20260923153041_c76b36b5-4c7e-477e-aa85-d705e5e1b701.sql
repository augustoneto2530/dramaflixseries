GRANT EXECUTE ON FUNCTION public.check_email_purchase_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.email_has_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;