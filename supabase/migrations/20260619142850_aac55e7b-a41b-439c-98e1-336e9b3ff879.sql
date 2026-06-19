
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'tester', 'user');
CREATE TYPE public.tier_rank AS ENUM ('HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5','Retired');
CREATE TYPE public.region AS ENUM ('NA','EU','AS','SA','OC','AF','Unknown');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  minecraft_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- =========================================================
-- USER ROLES + has_role()
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin','tester')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner','admin')
  );
$$;

CREATE POLICY "Users see their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- GAMEMODES
-- =========================================================
CREATE TABLE public.gamemodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gamemodes TO anon, authenticated;
GRANT ALL ON public.gamemodes TO service_role;
ALTER TABLE public.gamemodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gamemodes are public" ON public.gamemodes FOR SELECT USING (true);
CREATE POLICY "Admins manage gamemodes" ON public.gamemodes
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =========================================================
-- PLAYER TIERS
-- =========================================================
CREATE TABLE public.player_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minecraft_username TEXT NOT NULL,
  minecraft_uuid TEXT,
  gamemode_id UUID NOT NULL REFERENCES public.gamemodes(id) ON DELETE CASCADE,
  tier public.tier_rank NOT NULL,
  region public.region NOT NULL DEFAULT 'Unknown',
  notes TEXT,
  awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (minecraft_username, gamemode_id)
);
GRANT SELECT ON public.player_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.player_tiers TO authenticated;
GRANT ALL ON public.player_tiers TO service_role;
ALTER TABLE public.player_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are public" ON public.player_tiers FOR SELECT USING (true);
CREATE POLICY "Testers insert tiers" ON public.player_tiers
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Testers update tiers" ON public.player_tiers
  FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Admins delete tiers" ON public.player_tiers
  FOR DELETE USING (public.is_admin(auth.uid()));

CREATE INDEX idx_player_tiers_username ON public.player_tiers (lower(minecraft_username));
CREATE INDEX idx_player_tiers_gamemode ON public.player_tiers (gamemode_id);

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_label TEXT,
  action TEXT NOT NULL,
  target TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log" ON public.audit_log
  FOR SELECT USING (public.is_admin(auth.uid()));

-- =========================================================
-- TRIGGERS: updated_at + auto-profile + auto-owner
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_player_tiers_updated BEFORE UPDATE ON public.player_tiers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup; if Discord ID matches the configured owner, grant 'owner'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_discord_id TEXT;
  v_discord_username TEXT;
  v_discord_avatar TEXT;
BEGIN
  v_discord_id := NEW.raw_user_meta_data->>'discord_id';
  v_discord_username := NEW.raw_user_meta_data->>'discord_username';
  v_discord_avatar := NEW.raw_user_meta_data->>'discord_avatar';

  INSERT INTO public.profiles (id, discord_id, discord_username, discord_avatar)
  VALUES (NEW.id, v_discord_id, v_discord_username, v_discord_avatar)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  -- Hard-coded owner Discord ID (your account)
  IF v_discord_id = '1173498933453000724' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- SEED GAMEMODES
-- =========================================================
INSERT INTO public.gamemodes (slug, name, icon, sort_order) VALUES
  ('crystal',  'Crystal',  '💎', 10),
  ('sword',    'Sword',    '⚔️', 20),
  ('smp',      'SMP',      '🛡️', 30),
  ('uhc',      'UHC',      '❤️', 40),
  ('pot',      'Pot',      '🧪', 50),
  ('nethpot',  'NethPot',  '🔥', 60),
  ('axe',      'Axe',      '🪓', 70),
  ('mace',     'Mace',     '🔨', 80),
  ('vanilla',  'Vanilla',  '🟩', 90),
  ('bedwars',  'Bedwars',  '🛏️', 100)
ON CONFLICT (slug) DO NOTHING;
