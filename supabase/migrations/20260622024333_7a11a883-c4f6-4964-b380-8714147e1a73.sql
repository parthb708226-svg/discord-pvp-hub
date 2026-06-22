DROP POLICY IF EXISTS "Levels viewable by authenticated" ON public.user_levels;
CREATE POLICY "Admins view levels" ON public.user_levels FOR SELECT USING (public.is_admin(auth.uid()));
REVOKE SELECT ON public.user_levels FROM authenticated;
GRANT SELECT ON public.user_levels TO authenticated;