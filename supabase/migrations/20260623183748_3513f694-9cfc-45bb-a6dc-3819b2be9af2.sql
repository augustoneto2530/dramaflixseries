REVOKE EXECUTE ON FUNCTION public.ensure_current_user_profile(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_current_user_profile(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(text) TO authenticated;