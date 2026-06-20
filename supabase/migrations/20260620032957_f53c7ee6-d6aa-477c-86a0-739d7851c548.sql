CREATE TABLE public.user_levels (
  discord_id text PRIMARY KEY,
  discord_username text,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_levels TO anon, authenticated;
GRANT ALL ON public.user_levels TO service_role;

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Levels are public" ON public.user_levels FOR SELECT USING (true);

CREATE TRIGGER user_levels_touch
  BEFORE UPDATE ON public.user_levels
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();