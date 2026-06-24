
REVOKE ALL ON FUNCTION public.is_locked_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_owner_roles() FROM PUBLIC, anon, authenticated;
-- ensure_locked_owner_roles must stay callable so the website can self-heal on load
REVOKE ALL ON FUNCTION public.ensure_locked_owner_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_locked_owner_roles() TO anon, authenticated;
