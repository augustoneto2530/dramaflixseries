DROP FUNCTION IF EXISTS public.current_profile_access();

REVOKE ALL ON FUNCTION public.can_access_content(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_episodes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_content(uuid, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_episodes(uuid) TO authenticated, anon, service_role;