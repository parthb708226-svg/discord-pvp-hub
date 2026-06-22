
CREATE TABLE public.bot_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  welcome_channel_id TEXT,
  welcome_message TEXT NOT NULL DEFAULT '👋 Welcome {user} to **{guild}**! Link your account at {website}/auth to chat. Use /tier /profile /tierlist to explore rankings.',
  tier_announce_channel_id TEXT,
  mod_log_channel_id TEXT,
  gamemode_log_channel_id TEXT,
  tier_announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  welcomer_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_gate_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bot_config TO authenticated;
GRANT ALL ON public.bot_config TO service_role;

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bot_config" ON public.bot_config FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update bot_config" ON public.bot_config FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert bot_config" ON public.bot_config FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.bot_config (id, welcome_channel_id, tier_announce_channel_id, mod_log_channel_id)
VALUES ('main', '1517732915201577070', '1517732611865444372', '1517734779699724458')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.mod_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_discord_id TEXT NOT NULL,
  target_username TEXT,
  moderator_discord_id TEXT NOT NULL,
  moderator_username TEXT,
  reason TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mod_actions TO authenticated;
GRANT ALL ON public.mod_actions TO service_role;

ALTER TABLE public.mod_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read mod_actions" ON public.mod_actions FOR SELECT USING (public.is_admin(auth.uid()));

CREATE INDEX mod_actions_target_idx ON public.mod_actions (target_discord_id, created_at DESC);
CREATE INDEX mod_actions_created_idx ON public.mod_actions (created_at DESC);
