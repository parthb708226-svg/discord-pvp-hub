import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Swords } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PvP Tiers — Minecraft PvP Tier List" },
      { name: "description", content: "Official Minecraft PvP tier rankings across Crystal, Sword, SMP, UHC, Pot, NethPot, Axe, Mace, Vanilla, and Bedwars." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: gamemodes } = useQuery({
    queryKey: ["gamemodes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gamemodes").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_tiers")
        .select("id, minecraft_username, tier, region, awarded_at, gamemodes(name, slug)")
        .order("awarded_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> Live tier rankings
          </div>
          <h1 className="mt-5 text-5xl md:text-7xl font-extrabold leading-[1.05]">
            The official <span className="text-primary">Minecraft PvP</span> tier list.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Tested by the community. Crystal, Sword, SMP, UHC, Pot, NethPot, Axe, Mace, Vanilla, Bedwars — every player, every gamemode, one ranking.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-bold flex items-center gap-2"><Swords className="h-6 w-6 text-primary" /> Gamemodes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {gamemodes?.map(g => (
            <Link key={g.id} to="/tier/$slug" params={{ slug: g.slug }} className="group">
              <Card className="p-6 dirt-panel pixel-border-deep enchant-hover hover:translate-y-[-2px] transition-transform">
                <McIcon slug={g.slug} fallback={g.icon ?? "?"} size={56} />
                <div className="mt-3 font-bold text-lg pixel-text text-sm">{g.name}</div>
                <div className="mt-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">View tier list →</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <h2 className="mb-6 text-2xl font-bold">Recent rankings</h2>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recent.map(r => (
              <Link key={r.id} to="/player/$username" params={{ username: r.minecraft_username }}>
                <Card className="p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
                  <img src={`https://mc-heads.net/avatar/${r.minecraft_username}/48`} alt="" className="h-12 w-12 rounded" />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.minecraft_username}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.tier} · {(r.gamemodes as any)?.name}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No rankings yet. Sign in and head to the admin panel to add the first players.</p>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Not affiliated with Mojang or Microsoft. Skins via mc-heads.net.
      </footer>
    </div>
  );
}
