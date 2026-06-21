import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { TIER_ORDER, TIER_LABEL, TIER_BG, mcHead, type TierRank } from "@/lib/minecraft";
import { McIcon } from "@/components/mc-icon";

export const Route = createFileRoute("/tier/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.toUpperCase()} Tier List — PvP Tiers` },
      { name: "description", content: `Minecraft PvP tier list for ${params.slug}. HT1 through LT5 rankings.` },
    ],
  }),
  component: TierPage,
  errorComponent: ({ error }) => <div className="p-8">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-8">Gamemode not found.</div>,
});

function TierPage() {
  const { slug } = Route.useParams();

  const { data: gm } = useQuery({
    queryKey: ["gm", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("gamemodes").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ["tiers", gm?.id],
    enabled: !!gm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_tiers")
        .select("id, minecraft_username, tier, region")
        .eq("gamemode_id", gm!.id)
        .order("minecraft_username");
      if (error) throw error;
      return data;
    },
  });

  const grouped = TIER_ORDER.reduce((acc, t) => {
    acc[t] = (tiers ?? []).filter(p => p.tier === t);
    return acc;
  }, {} as Record<TierRank, NonNullable<typeof tiers>>);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-center gap-4 mb-10">
          <McIcon slug={gm?.slug} fallback={gm?.icon ?? "?"} size={72} />
          <div>
            <h1 className="text-4xl font-extrabold">{gm?.name} <span className="text-muted-foreground font-normal">tier list</span></h1>
            <p className="text-sm text-muted-foreground mt-1">{tiers?.length ?? 0} ranked players</p>
          </div>
        </div>

        <div className="space-y-3">
          {TIER_ORDER.map(rank => {
            const players = grouped[rank];
            if (!players?.length) return null;
            return (
              <Card key={rank} className="overflow-hidden pixel-border">
                <div className="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr]">
                  <div className={`flex flex-col items-center justify-center p-4 ${TIER_BG[rank]}`}>
                    <div className="text-2xl font-extrabold">{rank}</div>
                    <div className="text-[10px] font-semibold opacity-80 mt-1 hidden md:block">{TIER_LABEL[rank].toUpperCase()}</div>
                  </div>
                  <div className="p-4 flex flex-wrap gap-2">
                    {players.map(p => (
                      <Link key={p.id} to="/player/$username" params={{ username: p.minecraft_username }}
                        className="group flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 hover:border-primary/60 hover:bg-muted transition-colors">
                        <img src={mcHead(p.minecraft_username, 32)} alt="" className="h-7 w-7 rounded" />
                        <span className="text-sm font-medium">{p.minecraft_username}</span>
                        <span className="text-[10px] text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded">{p.region}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {(!tiers || tiers.length === 0) && (
          <Card className="p-12 text-center text-muted-foreground">
            No players ranked in {gm?.name} yet.
          </Card>
        )}
      </div>
    </div>
  );
}
