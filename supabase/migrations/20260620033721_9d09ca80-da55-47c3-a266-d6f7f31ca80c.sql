CREATE TABLE public.warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id text NOT NULL,
  discord_username text,
  reason text NOT NULL,
  moderator_discord_id text NOT NULL,
  moderator_username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.warnings TO authenticated;
GRANT ALL ON public.warnings TO service_role;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view warnings" ON public.warnings FOR SELECT USING (public.is_admin(auth.uid()));
CREATE INDEX warnings_discord_id_idx ON public.warnings(discord_id);