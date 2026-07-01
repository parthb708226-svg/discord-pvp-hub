import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, AlertTriangle } from "lucide-react";
import { listPendingMatchesFn, reportMatchFn, verifyMatchFn, setMatchStatusFn } from "@/lib/match.functions";

export const Route = createFileRoute("/_authenticated/admin/matches")({
  component: AdminMatches,
});

function AdminMatches() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingMatchesFn);
  const reportFn = useServerFn(reportMatchFn);
  const verifyFn = useServerFn(verifyMatchFn);
  const statusFn = useServerFn(setMatchStatusFn);

  const { data: gms } = useQuery({
    queryKey: ["gms"], queryFn: async () => (await supabase.from("gamemodes").select("id, name, slug").order("sort_order")).data ?? [],
  });
  const { data: pending } = useQuery({ queryKey: ["pending-matches"], queryFn: () => listFn() });

  const [gm, setGm] = useState("");
  const [winner, setWinner] = useState("");
  const [loser, setLoser] = useState("");
  const [ws, setWs] = useState(1);
  const [ls, setLs] = useState(0);
  const [draw, setDraw] = useState(false);
  const [notes, setNotes] = useState("");

  const report = useMutation({
    mutationFn: () => reportFn({ data: { gamemode_id: gm, winner_username: winner, loser_username: loser, winner_score: ws, loser_score: ls, is_draw: draw, notes } }),
    onSuccess: () => { toast.success("Match reported (pending)"); setWinner(""); setLoser(""); setNotes(""); qc.invalidateQueries({ queryKey: ["pending-matches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const verify = useMutation({
    mutationFn: (id: string) => verifyFn({ data: { id } }),
    onSuccess: () => { toast.success("Verified — Elo applied"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: any) => statusFn({ data: { id, status } }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["pending-matches"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Matches</h1>

      <Card className="p-6 space-y-3 pixel-border">
        <h2 className="font-bold text-lg">Report a match</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Gamemode</Label>
            <Select value={gm} onValueChange={setGm}>
              <SelectTrigger><SelectValue placeholder="Pick a gamemode" /></SelectTrigger>
              <SelectContent>{(gms ?? []).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Checkbox id="draw" checked={draw} onCheckedChange={v => setDraw(!!v)} />
            <Label htmlFor="draw">Draw</Label>
          </div>
          <div><Label>Winner (Discord username)</Label><Input value={winner} onChange={e => setWinner(e.target.value)} /></div>
          <div><Label>Loser (Discord username)</Label><Input value={loser} onChange={e => setLoser(e.target.value)} /></div>
          <div><Label>Winner score</Label><Input type="number" value={ws} onChange={e => setWs(+e.target.value)} /></div>
          <div><Label>Loser score</Label><Input type="number" value={ls} onChange={e => setLs(+e.target.value)} /></div>
        </div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <Button onClick={() => report.mutate()} disabled={report.isPending || !gm || !winner || !loser}>Report match</Button>
      </Card>

      <Card className="p-6 pixel-border">
        <h2 className="font-bold text-lg mb-3">Pending & disputed ({(pending ?? []).length})</h2>
        {(pending ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting for review.</p> : (
          <div className="space-y-2">
            {(pending ?? []).map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{m.winner?.discord_username}</span>
                    <span className="mx-1 text-muted-foreground">beat</span>
                    <span className="font-semibold">{m.loser?.discord_username}</span>
                    <span className="ml-2 text-muted-foreground">{m.winner_score}–{m.loser_score}{m.is_draw ? " (draw)" : ""}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.gamemodes?.name} · reported by {m.reporter?.discord_username ?? "?"} · <span className={m.status === "disputed" ? "text-destructive font-bold" : ""}>{m.status}</span>
                  </div>
                  {m.notes && <div className="text-xs mt-1 italic">{m.notes}</div>}
                </div>
                <Button size="sm" onClick={() => verify.mutate(m.id)} disabled={verify.isPending}><Check className="h-4 w-4 mr-1" />Verify</Button>
                <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: m.id, status: "disputed" })}><AlertTriangle className="h-4 w-4 mr-1" />Dispute</Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus.mutate({ id: m.id, status: "rejected" })}><X className="h-4 w-4 mr-1" />Reject</Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link to="/matches" className="text-sm text-primary underline">View public match feed →</Link>
        </div>
      </Card>
    </div>
  );
}
