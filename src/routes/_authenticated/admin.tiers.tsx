import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIER_ORDER, REGIONS, TIER_BG, mcHead, type TierRank } from "@/lib/minecraft";
import { upsertTierFn, deleteTierFn } from "@/lib/bot.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tiers")({
  component: ManageTiers,
});

function ManageTiers() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [gamemodeId, setGamemodeId] = useState<string>("");
  const [tier, setTier] = useState<TierRank>("HT3");
  const [region, setRegion] = useState<string>("NA");
  const [filter, setFilter] = useState("");

  const { data: gms } = useQuery({
    queryKey: ["gms"], queryFn: async () => (await supabase.from("gamemodes").select("*").order("sort_order")).data ?? [],
  });
  const { data: rows } = useQuery({
    queryKey: ["all-tiers", filter],
    queryFn: async () => {
      let q = supabase.from("player_tiers").select("id, minecraft_username, tier, region, gamemodes(name, slug)").order("awarded_at", { ascending: false }).limit(200);
      if (filter) q = q.ilike("minecraft_username", `%${filter}%`);
      return (await q).data ?? [];
    },
  });

  const upsertFn = useServerFn(upsertTierFn);
  const deleteFn = useServerFn(deleteTierFn);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!username.trim() || !gamemodeId) throw new Error("Username and gamemode required");
      await upsertFn({ data: { username: username.trim(), gamemode_id: gamemodeId, tier, region } });
    },
    onSuccess: () => { toast.success("Tier saved & announced"); setUsername(""); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await deleteFn({ data: { id } }); },
    onSuccess: () => { toast.success("Removed & announced"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Manage tiers</h1>

      <Card className="p-6">
        <h2 className="font-bold mb-4">Add / update tier</h2>
        <div className="grid sm:grid-cols-[1fr_1fr_120px_120px_auto] gap-3">
          <Input placeholder="Minecraft username" value={username} onChange={e => setUsername(e.target.value)} />
          <Select value={gamemodeId} onValueChange={setGamemodeId}>
            <SelectTrigger><SelectValue placeholder="Gamemode" /></SelectTrigger>
            <SelectContent>{gms?.map(g => <SelectItem key={g.id} value={g.id}>{g.icon} {g.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={tier} onValueChange={v => setTier(v as TierRank)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIER_ORDER.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>Save</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-bold">All entries</h2>
          <Input className="max-w-xs" placeholder="Filter by username..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <div className="divide-y divide-border">
          {rows?.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2">
              <img src={mcHead(r.minecraft_username, 32)} className="h-8 w-8 rounded" alt="" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.minecraft_username}</div>
                <div className="text-xs text-muted-foreground">{(r.gamemodes as any)?.name} · {r.region}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${TIER_BG[r.tier as TierRank]}`}>{r.tier}</span>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(!rows || rows.length === 0) && <div className="py-8 text-center text-sm text-muted-foreground">No tier entries.</div>}
        </div>
      </Card>
    </div>
  );
}
