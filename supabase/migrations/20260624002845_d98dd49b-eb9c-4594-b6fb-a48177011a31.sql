
-- =========================================================
-- 1) HARD-LOCK OWNER (Discord ID 1173498933453000724)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_locked_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND discord_id = '1173498933453000724'
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_owner_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public.is_locked_owner(OLD.user_id) AND OLD.role IN ('owner','admin') THEN
      RAISE EXCEPTION 'Cannot remove % role from locked super-admin', OLD.role;
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF public.is_locked_owner(OLD.user_id) AND OLD.role IN ('owner','admin') AND NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Cannot change % role on locked super-admin', OLD.role;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_owner_roles ON public.user_roles;
CREATE TRIGGER trg_protect_owner_roles
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_roles();

-- Self-heal: callable RPC that re-grants owner+admin if missing for the locked id
CREATE OR REPLACE FUNCTION public.ensure_locked_owner_roles()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM public.profiles WHERE discord_id = '1173498933453000724' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'owner') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.ensure_locked_owner_roles() TO anon, authenticated;

-- Run once to ensure it's set
SELECT public.ensure_locked_owner_roles();

-- =========================================================
-- 2) SITE THEMES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.site_themes (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'biome',
  vars jsonb NOT NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_themes TO anon, authenticated;
GRANT ALL ON public.site_themes TO service_role;
ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes readable by all" ON public.site_themes FOR SELECT USING (true);
CREATE POLICY "themes managed by owners" ON public.site_themes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'main',
  active_theme_id text REFERENCES public.site_themes(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by all" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings managed by owners" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

-- Seed 30 themes (CSS variable overrides — only the few that matter visually)
INSERT INTO public.site_themes (id, name, category, sort_order, vars) VALUES
('deepslate','Deepslate Cave','biome',1,'{"--background":"oklch(0.14 0.015 250)","--primary":"oklch(0.62 0.21 27)","--accent":"oklch(0.72 0.18 145)","--card":"oklch(0.20 0.02 250)"}'),
('nether','Nether Wastes','biome',2,'{"--background":"oklch(0.18 0.08 30)","--primary":"oklch(0.70 0.24 30)","--accent":"oklch(0.78 0.20 70)","--card":"oklch(0.22 0.10 30)"}'),
('end','The End','biome',3,'{"--background":"oklch(0.10 0.02 300)","--primary":"oklch(0.78 0.20 310)","--accent":"oklch(0.85 0.15 90)","--card":"oklch(0.18 0.04 300)"}'),
('ocean','Deep Ocean','biome',4,'{"--background":"oklch(0.16 0.08 230)","--primary":"oklch(0.65 0.18 220)","--accent":"oklch(0.80 0.15 195)","--card":"oklch(0.22 0.08 230)"}'),
('cherry','Cherry Grove','biome',5,'{"--background":"oklch(0.20 0.06 350)","--primary":"oklch(0.78 0.18 350)","--accent":"oklch(0.85 0.12 145)","--card":"oklch(0.26 0.06 350)"}'),
('mushroom','Mushroom Fields','biome',6,'{"--background":"oklch(0.20 0.04 30)","--primary":"oklch(0.70 0.22 20)","--accent":"oklch(0.92 0.05 60)","--card":"oklch(0.26 0.04 30)"}'),
('halloween','Halloween','seasonal',10,'{"--background":"oklch(0.10 0.04 30)","--primary":"oklch(0.72 0.24 50)","--accent":"oklch(0.65 0.22 320)","--card":"oklch(0.16 0.05 30)"}'),
('christmas','Christmas','seasonal',11,'{"--background":"oklch(0.18 0.05 150)","--primary":"oklch(0.65 0.24 25)","--accent":"oklch(0.85 0.18 145)","--card":"oklch(0.24 0.06 150)"}'),
('valentine','Valentine','seasonal',12,'{"--background":"oklch(0.18 0.08 0)","--primary":"oklch(0.72 0.22 0)","--accent":"oklch(0.85 0.15 350)","--card":"oklch(0.24 0.08 0)"}'),
('easter','Easter','seasonal',13,'{"--background":"oklch(0.22 0.05 90)","--primary":"oklch(0.78 0.18 145)","--accent":"oklch(0.85 0.15 60)","--card":"oklch(0.28 0.05 90)"}'),
('summer','Summer','seasonal',14,'{"--background":"oklch(0.20 0.10 220)","--primary":"oklch(0.78 0.20 60)","--accent":"oklch(0.85 0.18 195)","--card":"oklch(0.26 0.10 220)"}'),
('autumn','Autumn','seasonal',15,'{"--background":"oklch(0.16 0.06 50)","--primary":"oklch(0.68 0.22 45)","--accent":"oklch(0.72 0.18 25)","--card":"oklch(0.22 0.06 50)"}'),
('winter','Frozen','seasonal',16,'{"--background":"oklch(0.20 0.04 220)","--primary":"oklch(0.78 0.12 220)","--accent":"oklch(0.92 0.06 220)","--card":"oklch(0.26 0.04 220)"}'),
('dragon','Ender Dragon','event',20,'{"--background":"oklch(0.08 0.02 290)","--primary":"oklch(0.72 0.24 290)","--accent":"oklch(0.65 0.22 145)","--card":"oklch(0.14 0.04 290)"}'),
('redstone','Redstone Lab','block',21,'{"--background":"oklch(0.10 0.02 0)","--primary":"oklch(0.65 0.26 25)","--accent":"oklch(0.85 0.18 60)","--card":"oklch(0.16 0.04 0)"}'),
('lava','Lava Lake','block',22,'{"--background":"oklch(0.14 0.06 40)","--primary":"oklch(0.72 0.24 50)","--accent":"oklch(0.85 0.20 70)","--card":"oklch(0.20 0.08 40)"}'),
('ice','Ice Spikes','block',23,'{"--background":"oklch(0.22 0.04 220)","--primary":"oklch(0.78 0.12 220)","--accent":"oklch(0.88 0.10 195)","--card":"oklch(0.28 0.04 220)"}'),
('jungle','Jungle','biome',24,'{"--background":"oklch(0.16 0.06 145)","--primary":"oklch(0.65 0.20 145)","--accent":"oklch(0.78 0.18 90)","--card":"oklch(0.22 0.06 145)"}'),
('desert','Desert','biome',25,'{"--background":"oklch(0.22 0.06 80)","--primary":"oklch(0.72 0.16 80)","--accent":"oklch(0.85 0.12 60)","--card":"oklch(0.28 0.06 80)"}'),
('mesa','Mesa','biome',26,'{"--background":"oklch(0.18 0.06 40)","--primary":"oklch(0.65 0.20 35)","--accent":"oklch(0.78 0.15 60)","--card":"oklch(0.24 0.06 40)"}'),
('void','The Void','event',27,'{"--background":"oklch(0.05 0.01 0)","--primary":"oklch(0.55 0.20 280)","--accent":"oklch(0.72 0.18 200)","--card":"oklch(0.10 0.02 0)"}'),
('aether','Aether','event',28,'{"--background":"oklch(0.22 0.06 240)","--primary":"oklch(0.85 0.12 90)","--accent":"oklch(0.78 0.10 240)","--card":"oklch(0.28 0.06 240)"}'),
('soulsand','Soul Sand Valley','biome',29,'{"--background":"oklch(0.12 0.04 230)","--primary":"oklch(0.78 0.18 195)","--accent":"oklch(0.65 0.18 230)","--card":"oklch(0.18 0.04 230)"}'),
('copper','Copper Mine','block',30,'{"--background":"oklch(0.16 0.04 30)","--primary":"oklch(0.72 0.16 50)","--accent":"oklch(0.85 0.12 195)","--card":"oklch(0.22 0.04 30)"}'),
('amethyst','Amethyst Geode','block',31,'{"--background":"oklch(0.16 0.06 290)","--primary":"oklch(0.72 0.20 290)","--accent":"oklch(0.85 0.15 310)","--card":"oklch(0.22 0.06 290)"}'),
('sculk','Sculk Catalyst','event',32,'{"--background":"oklch(0.08 0.03 220)","--primary":"oklch(0.62 0.20 195)","--accent":"oklch(0.72 0.18 220)","--card":"oklch(0.14 0.04 220)"}'),
('prismarine','Ocean Monument','block',33,'{"--background":"oklch(0.16 0.06 195)","--primary":"oklch(0.72 0.16 195)","--accent":"oklch(0.85 0.12 145)","--card":"oklch(0.22 0.06 195)"}'),
('glowsquid','Glow Squid','event',34,'{"--background":"oklch(0.10 0.04 220)","--primary":"oklch(0.78 0.18 195)","--accent":"oklch(0.72 0.20 145)","--card":"oklch(0.16 0.04 220)"}'),
('warden','Warden''s Den','event',35,'{"--background":"oklch(0.08 0.02 195)","--primary":"oklch(0.55 0.18 195)","--accent":"oklch(0.72 0.20 145)","--card":"oklch(0.14 0.03 195)"}'),
('birthday','Birthday Cake','seasonal',36,'{"--background":"oklch(0.22 0.06 320)","--primary":"oklch(0.78 0.20 0)","--accent":"oklch(0.85 0.18 195)","--card":"oklch(0.28 0.06 320)"}')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, vars=EXCLUDED.vars, sort_order=EXCLUDED.sort_order, updated_at=now();

INSERT INTO public.site_settings (id, active_theme_id) VALUES ('main','deepslate') ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 3) AUTOMOD config on bot_config
-- =========================================================
ALTER TABLE public.bot_config
  ADD COLUMN IF NOT EXISTS automod_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automod_anti_invite boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automod_anti_link boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS automod_anti_spam boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS automod_blocked_words text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS automod_log_channel_id text;

-- Allow anon to read just the bits the gateway needs (it calls via signed webhook anyway,
-- but keeping the existing policies untouched).
