# Build plan

You picked three huge tracks. To keep this shippable I'll do them in order, one turn per phase. Approve this and I'll start Phase 1 immediately.

## Phase 1 — Match + Elo + Profile stats (this turn)

**DB migration (one migration, all grants + RLS):**
- `matches` — gamemode_id, mode (1v1), winner_id, loser_id, winner_score, loser_score, winner_elo_before/after, loser_elo_before/after, notes, reported_by, verified_by, status (pending/verified/disputed), played_at
- `player_elo` — profile_id, gamemode_id, elo (default 1000), peak_elo, wins, losses, draws, current_streak, longest_streak, last_match_at (PK: profile_id + gamemode_id)
- `player_seasons` — snapshot per season for history
- `seasons` — id, name, starts_at, ends_at, active
- RPC `record_match(...)` — atomic Elo update (K=32, standard formula), stat bump, streak update, writes match row. Owner/admin/tester verify; players self-report pending.

**Server functions (`src/lib/match.functions.ts`):**
- `reportMatchFn` (auth) — insert pending match
- `verifyMatchFn` (staff) — calls RPC, applies Elo
- `getMatchHistoryFn`, `getPlayerStatsFn`, `getLeaderboardFn` (public, publishable client)

**UI:**
- `/player/$username` — extend with Elo per mode, peak, W/L, KDR, streaks, recent matches
- `/matches` — global recent verified matches
- `/match/$id` — single match page
- `/leaderboard` — extend with Elo sort per gamemode
- Admin → new "Matches" tab: verify/dispute pending

**Elo tier auto-assignment:** optional trigger maps Elo → HT1/LT1/… so tier list stays in sync with match results. Off by default; toggle in Super Admin.

## Phase 2 — 30 full-template themes (5 turns, 6 themes each)

Each theme is a **layout template**, not a recolor:
- own font pair, own component shapes (border-radius, borders, shadows)
- own hero/nav/card composition
- own background texture + accent motifs
- own animation register

Themes ship as JSON blobs in `site_themes.vars` + `site_themes.template` (new column: `deepslate | nether | end | sculk | ocean | cherry | mesa | mushroom | ice | jungle | savanna | swamp | dripstone | lush | ancient_city | stronghold | mansion | ocean_monument | pillager | pale_garden | trial_chamber | halloween | christmas | valentine | new_year | easter | summer | autumn | winter | spring`). Layout component reads `template` and swaps hero/nav/cards accordingly. 30 real templates = 5 batches — I'll ping you between batches so you can preview and course-correct.

## Phase 3 — Security scan + fix (final turn)

- Run `security--run_security_scan` + `supabase--linter`
- Fix every critical/high: missing RLS, over-broad `TO anon`, exposed PII, service-role misuse, unverified webhook routes
- Update security memory

## Explicitly OUT of scope (say the word to add later)

Clans, tournaments, forums, public API/webhooks, per-user OAuth apps, replay support, damage graphs, AI recaps, capes, badges marketplace, PWA, animated avatars, reaction-role/ticket/giveaway Discord features. Each is its own multi-turn build.

## Technical notes

- Elo formula: `expected = 1 / (1 + 10^((opp - self)/400))`; `new = self + K * (score - expected)` with K=32, draws=0.5.
- Match verification required before Elo counts — stops self-report abuse.
- All new tables get `GRANT` + RLS in the same migration; policies scoped to `auth.uid()` for writes, narrow anon SELECT for public reads.
- Themes stored as `{ vars: {...css}, layout: {hero, nav, card, bg, motif} }`; templates picked at render time by `<ThemeLayout>` wrapper — no hardcoded colors in components.

Approve to start Phase 1.
