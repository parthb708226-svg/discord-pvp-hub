import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { McIcon } from "@/components/mc-icon";
import { listMatchesFn } from "@/lib/match.functions";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [
    { title: "Recent Matches — Archer's Tier List" },
    { name: "description", content: "Latest verified 1v1 PvP matches with Elo changes." },
  ]}),
  component: MatchesPage,
});

function MatchesPage() {
  const fn = useServerFn(listMatchesFn);
  const { data } = useQuery({ queryKey: ["matches", "verified"], queryFn: () => fn({ data: { status: "verified", limit: 50 } }) });
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-6">Recent matches</h1>
        <div className="space-y-2">
          {(data ?? []).map((m: any) => {
            const wd = (m.winner_elo_after ?? 0) - (m.winner_elo_before ?? 0);
            const ld = (m.loser_elo_after ?? 0) - (m.loser_elo_before ?? 0);
            return (
              <Card key={m.id} className="p-4 flex items-center gap-3">
                <McIcon slug={m.gamemodes?.slug} fallback={m.gamemodes?.icon ?? "?"} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <Link to="/player/$username" params={{ username: m.winner?.discord_username }} className="font-bold hover:text-primary">{m.winner?.discord_username}</Link>
                    <span className="mx-2 text-muted-foreground">{m.winner_score}–{m.loser_score}</span>
                    <Link to="/player/$username" params={{ username: m.loser?.discord_username }} className="font-bold hover:text-primary">{m.loser?.discord_username}</Link>
                  </div>
                  <div className="text-xs text-muted-foreground">{m.gamemodes?.name} · {new Date(m.played_at).toLocaleString()}</div>
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="text-emerald-400">+{wd}</div>
                  <div className="text-rose-400">{ld}</div>
                </div>
              </Card>
            );
          })}
          {(data ?? []).length === 0 && <Card className="p-8 text-center text-muted-foreground">No verified matches yet.</Card>}
        </div>
      </div>
    </div>
  );
}
