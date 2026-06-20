import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { mcHead, TIER_BG, type TierRank, TIER_ORDER } from "@/lib/minecraft";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { SkinViewer } from "@/components/skin-viewer";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — PvP Tiers" }] }),
  component: Leaderboard,
});

const TIER_SCORE: Record<string, number> = Object.fromEntries(
  TIER_ORDER.filter(t => t !== "Retired").map((t, i) => [t, 11 - i])
);

function Leaderboard() {
  const { data } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("player_tiers").select("minecraft_username, tier");
      if (error) throw error;
      const map = new Map<string, { score: number; tiers: string[] }>();
      for (const r of data) {
        const cur = map.get(r.minecraft_username) ?? { score: 0, tiers: [] };
        cur.score += TIER_SCORE[r.tier] ?? 0;
        cur.tiers.push(r.tier);
        map.set(r.minecraft_username, cur);
      }
      return Array.from(map.entries())
        .map(([username, v]) => ({ username, ...v }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-4xl font-extrabold mb-2">Global leaderboard</h1>
        <p className="text-muted-foreground mb-8">Ranked by total tier score across all gamemodes.</p>
        <Card className="divide-y divide-border pixel-border">
          {data?.map((p, i) => (
            <HoverCard key={p.username} openDelay={150} closeDelay={80}>
              <HoverCardTrigger asChild>
                <Link to="/player/$username" params={{ username: p.username }}
                  className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                  <div className="w-8 text-center text-lg font-bold text-muted-foreground">{i + 1}</div>
                  <img src={mcHead(p.username, 40)} alt="" className="h-10 w-10 rounded" />
                  <div className="flex-1 font-semibold">{p.username}</div>
                  <div className="flex flex-wrap gap-1 max-w-[60%] justify-end">
                    {p.tiers.map((t, idx) => (
                      <span key={idx} className={`px-2 py-0.5 text-[10px] font-bold rounded ${TIER_BG[t as TierRank]}`}>{t}</span>
                    ))}
                  </div>
                  <div className="w-12 text-right font-mono text-sm text-primary font-bold">{p.score}</div>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent side="left" className="w-auto p-2 bg-card pixel-border">
                <SkinViewer username={p.username} width={160} height={240} staticView />
                <p className="mt-1 text-center text-xs font-bold">{p.username}</p>
              </HoverCardContent>
            </HoverCard>
          ))}
          {data?.length === 0 && <div className="p-12 text-center text-muted-foreground">No players ranked yet.</div>}
        </Card>
      </div>
    </div>
  );
}
