import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { TIER_BG, type TierRank } from "@/lib/minecraft";
import { SkinViewer } from "@/components/skin-viewer";
import { McIcon } from "@/components/mc-icon";
import { getPlayerStatsFn } from "@/lib/match.functions";

export const Route = createFileRoute("/player/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — PvP Tiers` },
      { name: "description", content: `${params.username} Minecraft PvP tier rankings, Elo, and match history.` },
      { property: "og:image", content: `https://mc-heads.net/head/${params.username}/256` },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { username } = Route.useParams();
  const statsFn = useServerFn(getPlayerStatsFn);
  const { data: tiers } = useQuery({
    queryKey: ["player", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_tiers")
        .select("id, tier, region, notes, awarded_at, gamemodes(name, slug, icon)")
        .ilike("minecraft_username", username)
        .order("awarded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: stats } = useQuery({
    queryKey: ["player-stats", username],
    queryFn: () => statsFn({ data: { username } }),
  });

  const elo = stats?.elo ?? [];
  const recent = stats?.recent ?? [];
  const totals = elo.reduce((a: any, r: any) => ({
    wins: a.wins + (r.wins ?? 0), losses: a.losses + (r.losses ?? 0), draws: a.draws + (r.draws ?? 0),
  }), { wins: 0, losses: 0, draws: 0 });
  const played = totals.wins + totals.losses + totals.draws;
  const winRate = played ? Math.round((totals.wins / played) * 100) : 0;
  const peakElo = elo.reduce((m: number, r: any) => Math.max(m, r.peak_elo ?? 0), 0);
  const longestStreak = elo.reduce((m: number, r: any) => Math.max(m, r.longest_streak ?? 0), 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
          <Card className="p-6 flex flex-col items-center pixel-border">
            <SkinViewer username={username} width={220} height={340} />
            <h1 className="mt-4 text-2xl font-extrabold text-center break-all">{username}</h1>
            <p className="text-[10px] text-muted-foreground">Drag to rotate</p>
            <a href={`https://namemc.com/profile/${username}`} target="_blank" rel="noopener" className="mt-1 text-xs text-muted-foreground hover:text-primary">View on NameMC →</a>
          </Card>
          <div className="space-y-8 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Peak Elo" value={peakElo || "—"} />
              <StatCard label="Win rate" value={played ? `${winRate}%` : "—"} />
              <StatCard label="W / L / D" value={`${totals.wins} / ${totals.losses} / ${totals.draws}`} />
              <StatCard label="Longest streak" value={longestStreak || "—"} />
            </div>

            {elo.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Elo by gamemode</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {elo.map((r: any, i: number) => (
                    <Card key={i} className="p-4 flex items-center gap-3">
                      <McIcon slug={r.gamemodes?.slug} fallback={r.gamemodes?.icon ?? "?"} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.gamemodes?.name}</div>
                        <div className="text-xs text-muted-foreground">Peak {r.peak_elo} · {r.wins}W / {r.losses}L / {r.draws}D · streak {r.current_streak}</div>
                      </div>
                      <div className="font-mono font-bold text-lg">{r.elo}</div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold mb-3">Tier rankings</h2>
              {tiers && tiers.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {tiers.map(t => {
                    const gm: any = t.gamemodes;
                    return (
                      <Link key={t.id} to="/tier/$slug" params={{ slug: gm?.slug ?? "" }}>
                        <Card className="p-4 hover:border-primary/60 transition-colors flex items-center gap-4">
                          <McIcon slug={gm?.slug} fallback={gm?.icon ?? "?"} size={40} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{gm?.name}</div>
                            <div className="text-xs text-muted-foreground">{t.region} · {new Date(t.awarded_at).toLocaleDateString()}</div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-md font-extrabold text-sm ${TIER_BG[t.tier as TierRank]}`}>{t.tier}</div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center text-muted-foreground">No tier rankings yet.</Card>
              )}
            </div>

            {recent.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Recent matches</h2>
                <div className="space-y-2">
                  {recent.map((m: any) => {
                    const isWinner = m.winner?.discord_username?.toLowerCase() === username.toLowerCase();
                    const opp = isWinner ? m.loser : m.winner;
                    return (
                      <Card key={m.id} className="p-3 flex items-center gap-3">
                        <McIcon slug={m.gamemodes?.slug} fallback={m.gamemodes?.icon ?? "?"} size={28} />
                        <div className={`text-xs font-bold px-2 py-0.5 rounded ${isWinner ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{isWinner ? "WIN" : "LOSS"}</div>
                        <div className="flex-1 text-sm min-w-0 truncate">
                          vs <Link to="/player/$username" params={{ username: opp?.discord_username ?? "" }} className="font-semibold hover:text-primary">{opp?.discord_username}</Link>
                          <span className="ml-2 text-muted-foreground">{m.winner_score}–{m.loser_score}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(m.played_at).toLocaleDateString()}</div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <Card className="p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-extrabold font-mono mt-1">{value}</div>
    </Card>
  );
}

