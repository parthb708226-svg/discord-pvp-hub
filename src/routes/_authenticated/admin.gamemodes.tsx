import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/gamemodes")({ component: ManageGamemodes });

function ManageGamemodes() {
  const qc = useQueryClient();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const { data: gms } = useQuery({
    queryKey: ["gms-admin"],
    queryFn: async () => (await supabase.from("gamemodes").select("*").order("sort_order")).data ?? [],
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!slug.trim() || !name.trim()) throw new Error("Slug + name required");
      const max = Math.max(0, ...(gms ?? []).map(g => g.sort_order));
      const { error } = await supabase.from("gamemodes").insert({ slug: slug.trim().toLowerCase(), name: name.trim(), icon: icon || "🎮", sort_order: max + 10 });
      if (error) throw error;
    },
    onSuccess: () => { setSlug(""); setName(""); setIcon(""); toast.success("Added"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("gamemodes").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gamemodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Gamemodes</h1>
      <Card className="p-6">
        <div className="grid sm:grid-cols-[120px_1fr_80px_auto] gap-3">
          <Input placeholder="slug" value={slug} onChange={e => setSlug(e.target.value)} />
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="🎮" value={icon} onChange={e => setIcon(e.target.value)} />
          <Button onClick={() => add.mutate()}>Add</Button>
        </div>
      </Card>
      <Card className="divide-y divide-border">
        {gms?.map(g => (
          <div key={g.id} className="flex items-center gap-3 p-4">
            <div className="text-2xl">{g.icon}</div>
            <div className="flex-1"><div className="font-semibold">{g.name}</div><div className="text-xs text-muted-foreground">/{g.slug}</div></div>
            <Switch checked={g.active} onCheckedChange={(active) => toggle.mutate({ id: g.id, active })} />
            <Button size="icon" variant="ghost" onClick={() => del.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
