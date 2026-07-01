-- Seasons
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seasons TO anon, authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons readable by all" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "seasons admin write" ON public.seasons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gamemode_id UUID NOT NULL REFERENCES public.gamemodes(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  loser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  winner_score INT NOT NULL DEFAULT 0,
  loser_score INT NOT NULL DEFAULT 0,
  is_draw BOOLEAN NOT NULL DEFAULT false,
  winner_elo_before INT,
  winner_elo_after INT,
  loser_elo_before INT,
  loser_elo_after INT,
  notes TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','disputed','rejected')),
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (winner_id <> loser_id)
);
CREATE INDEX matches_gamemode_played_idx ON public.matches(gamemode_id, played_at DESC);
CREATE INDEX matches_winner_idx ON public.matches(winner_id, played_at DESC);
CREATE INDEX matches_loser_idx ON public.matches(loser_id, played_at DESC);
CREATE INDEX matches_status_idx ON public.matches(status);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches verified visible to all" ON public.matches FOR SELECT USING (status = 'verified' OR public.is_staff(auth.uid()) OR reported_by = auth.uid() OR winner_id = auth.uid() OR loser_id = auth.uid());
CREATE POLICY "authenticated can report" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by AND status = 'pending');
CREATE POLICY "staff can update matches" ON public.matches FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff can delete matches" ON public.matches FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER matches_touch BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Player Elo (per profile per gamemode)
CREATE TABLE public.player_elo (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gamemode_id UUID NOT NULL REFERENCES public.gamemodes(id) ON DELETE CASCADE,
  elo INT NOT NULL DEFAULT 1000,
  peak_elo INT NOT NULL DEFAULT 1000,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_match_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, gamemode_id)
);
CREATE INDEX player_elo_gm_elo_idx ON public.player_elo(gamemode_id, elo DESC);
GRANT SELECT ON public.player_elo TO anon, authenticated;
GRANT ALL ON public.player_elo TO service_role;
ALTER TABLE public.player_elo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_elo readable by all" ON public.player_elo FOR SELECT USING (true);
CREATE TRIGGER player_elo_touch BEFORE UPDATE ON public.player_elo FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Season snapshots
CREATE TABLE public.player_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gamemode_id UUID NOT NULL REFERENCES public.gamemodes(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  final_elo INT NOT NULL,
  peak_elo INT NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  final_rank INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, gamemode_id, season_id)
);
GRANT SELECT ON public.player_seasons TO anon, authenticated;
GRANT ALL ON public.player_seasons TO service_role;
ALTER TABLE public.player_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_seasons readable by all" ON public.player_seasons FOR SELECT USING (true);

-- Ensure elo row helper
CREATE OR REPLACE FUNCTION public.ensure_elo_row(_profile_id UUID, _gamemode_id UUID)
RETURNS public.player_elo LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.player_elo;
BEGIN
  INSERT INTO public.player_elo(profile_id, gamemode_id) VALUES (_profile_id, _gamemode_id)
    ON CONFLICT (profile_id, gamemode_id) DO NOTHING;
  SELECT * INTO r FROM public.player_elo WHERE profile_id=_profile_id AND gamemode_id=_gamemode_id;
  RETURN r;
END $$;

-- Verify match RPC: applies Elo and stat updates atomically
CREATE OR REPLACE FUNCTION public.verify_match(_match_id UUID)
RETURNS public.matches LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches;
  w public.player_elo;
  l public.player_elo;
  k CONSTANT NUMERIC := 32;
  ew NUMERIC; el NUMERIC;
  sw NUMERIC; sl NUMERIC;
  w_new INT; l_new INT;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff only'; END IF;
  SELECT * INTO m FROM public.matches WHERE id = _match_id FOR UPDATE;
  IF m IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF m.status = 'verified' THEN RAISE EXCEPTION 'Already verified'; END IF;

  w := public.ensure_elo_row(m.winner_id, m.gamemode_id);
  l := public.ensure_elo_row(m.loser_id,  m.gamemode_id);

  ew := 1.0 / (1.0 + power(10.0, (l.elo - w.elo)::numeric / 400.0));
  el := 1.0 - ew;
  IF m.is_draw THEN sw := 0.5; sl := 0.5; ELSE sw := 1.0; sl := 0.0; END IF;
  w_new := round(w.elo + k * (sw - ew));
  l_new := round(l.elo + k * (sl - el));

  UPDATE public.player_elo SET
    elo = w_new,
    peak_elo = GREATEST(peak_elo, w_new),
    wins = wins + CASE WHEN m.is_draw THEN 0 ELSE 1 END,
    draws = draws + CASE WHEN m.is_draw THEN 1 ELSE 0 END,
    current_streak = CASE WHEN m.is_draw THEN 0 ELSE GREATEST(current_streak,0) + 1 END,
    longest_streak = GREATEST(longest_streak, CASE WHEN m.is_draw THEN longest_streak ELSE GREATEST(current_streak,0)+1 END),
    last_match_at = now()
    WHERE profile_id = m.winner_id AND gamemode_id = m.gamemode_id;

  UPDATE public.player_elo SET
    elo = l_new,
    peak_elo = GREATEST(peak_elo, l_new),
    losses = losses + CASE WHEN m.is_draw THEN 0 ELSE 1 END,
    draws = draws + CASE WHEN m.is_draw THEN 1 ELSE 0 END,
    current_streak = CASE WHEN m.is_draw THEN 0 ELSE LEAST(current_streak,0) - 1 END,
    last_match_at = now()
    WHERE profile_id = m.loser_id AND gamemode_id = m.gamemode_id;

  UPDATE public.matches SET
    status = 'verified',
    verified_by = auth.uid(),
    winner_elo_before = w.elo, winner_elo_after = w_new,
    loser_elo_before  = l.elo, loser_elo_after  = l_new,
    updated_at = now()
    WHERE id = _match_id
    RETURNING * INTO m;
  RETURN m;
END $$;

GRANT EXECUTE ON FUNCTION public.verify_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_elo_row(UUID, UUID) TO authenticated;