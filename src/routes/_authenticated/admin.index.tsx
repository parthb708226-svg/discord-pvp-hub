import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tiers, gms, profiles] = await Promise.all([
        supabase.from("player_tiers").select("id", { count: "exact", head: true }),
        supabase.from("gamemodes").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { tiers: tiers.count ?? 0, gms: gms.count ?? 0, profiles: profiles.count ?? 0 };
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-6">Admin dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6"><div className="text-xs uppercase text-muted-foreground">Tier entries</div><div className="text-4xl font-extrabold text-primary mt-1">{stats?.tiers ?? "—"}</div></Card>
        <Card className="p-6"><div className="text-xs uppercase text-muted-foreground">Gamemodes</div><div className="text-4xl font-extrabold text-accent mt-1">{stats?.gms ?? "—"}</div></Card>
        <Card className="p-6"><div className="text-xs uppercase text-muted-foreground">Registered users</div><div className="text-4xl font-extrabold mt-1">{stats?.profiles ?? "—"}</div></Card>
      </div>
      <Card className="mt-6 p-6 text-sm text-muted-foreground">
        Use the sidebar to manage tiers, gamemodes, users, and your Discord bot.
      </Card>
    </div>
  );
}
