REVOKE ALL ON FUNCTION public.ensure_elo_row(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_match(UUID) TO authenticated;