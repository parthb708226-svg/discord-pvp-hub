import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { TIER_BG, type TierRank } from "@/lib/minecraft";
import { SkinViewer } from "@/components/skin-viewer";

export const Route = createFileRoute("/player/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} — PvP Tiers` },
      { name: "description", content: `${params.username} Minecraft PvP tier rankings across every gamemode.` },
      { property: "og:image", content: `https://mc-heads.net/head/${params.username}/256` },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { username } = Route.useParams();
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

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-start">
          <Card className="p-6 flex flex-col items-center pixel-border">
            <SkinViewer username={username} width={220} height={340} />
            <h1 className="mt-4 text-2xl font-extrabold text-center break-all">{username}</h1>
            <p className="text-[10px] text-muted-foreground">Drag to rotate</p>
            <a href={`https://namemc.com/profile/${username}`} target="_blank" rel="noopener" className="mt-1 text-xs text-muted-foreground hover:text-primary">View on NameMC →</a>
          </Card>
          <div>
            <h2 className="text-xl font-bold mb-4">Tier rankings</h2>
            {tiers && tiers.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {tiers.map(t => {
                  const gm: any = t.gamemodes;
                  return (
                    <Link key={t.id} to="/tier/$slug" params={{ slug: gm?.slug ?? "" }}>
                      <Card className="p-4 hover:border-primary/60 transition-colors flex items-center gap-4">
                        <div className="text-3xl">{gm?.icon}</div>
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
        </div>
      </div>
    </div>
  );
}
