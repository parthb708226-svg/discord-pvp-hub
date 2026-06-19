
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.is_staff(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_admin(uuid) SECURITY INVOKER;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
