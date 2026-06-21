DROP POLICY IF EXISTS "Levels are public" ON public.user_levels;
CREATE POLICY "Levels viewable by authenticated" ON public.user_levels FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.user_levels FROM anon;