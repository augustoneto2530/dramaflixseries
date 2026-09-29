GRANT USAGE ON SCHEMA private TO anon;
GRANT EXECUTE ON FUNCTION private.can_access_content(uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION private.can_access_episodes(uuid) TO anon;