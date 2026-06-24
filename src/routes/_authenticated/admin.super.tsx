import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getActiveThemeFn, listThemesFn, setActiveThemeFn } from "@/lib/theme.functions";
import { getBotConfigFn, updateBotConfigFn } from "@/lib/bot.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/super")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isOwner = (data ?? []).some((r: any) => r.role === "owner");
    if (!isOwner) throw redirect({ to: "/admin" });
  },
  component: SuperAdmin,
});

function SuperAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listThemesFn);
  const activeFn = useServerFn(getActiveThemeFn);
  const setFn = useServerFn(setActiveThemeFn);
  const getCfg = useServerFn(getBotConfigFn);
  const updCfg = useServerFn(updateBotConfigFn);

  const { data: themes } = useQuery({ queryKey: ["themes"], queryFn: () => listFn() });
  const { data: active } = useQuery({ queryKey: ["active-theme"], queryFn: () => activeFn() });
  const { data: cfg } = useQuery({ queryKey: ["bot_config"], queryFn: () => getCfg() });

  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { if (cfg && !draft) setDraft(cfg); }, [cfg]);

  const pick = useMutation({
    mutationFn: (id: string) => setFn({ data: { id } }),
    onSuccess: () => { toast.success("Theme applied site-wide"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: (patch: any) => updCfg({ data: patch }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["bot_config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = (themes ?? []).reduce((acc: any, t: any) => { (acc[t.category] ??= []).push(t); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-extrabold">Super Admin</h1>
      </div>

      <Tabs defaultValue="themes">
        <TabsList>
          <TabsTrigger value="themes">Themes ({(themes ?? []).length})</TabsTrigger>
          <TabsTrigger value="automod">Auto-Mod</TabsTrigger>
          <TabsTrigger value="bot">Bot Power</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-6">
          <Card className="p-4 pixel-border">
            <p className="text-sm text-muted-foreground">Pick a theme — it applies live for every visitor.</p>
            <p className="text-xs text-muted-foreground mt-1">Active: <span className="font-bold text-foreground">{active?.name ?? "—"}</span></p>
          </Card>
          {Object.entries(grouped).map(([cat, list]: any) => (
            <div key={cat}>
              <h2 className="text-lg font-bold capitalize mb-3">{cat}</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(list as any[]).map(t => {
                  const isActive = active?.id === t.id;
                  const v = t.vars as Record<string, string>;
                  return (
                    <button key={t.id} onClick={() => pick.mutate(t.id)} disabled={pick.isPending}
                      className={`relative text-left p-4 rounded-md pixel-border transition-transform hover:scale-[1.02] ${isActive ? "ring-2 ring-primary" : ""}`}
                      style={{ background: v["--card"] ?? v["--background"] ?? "#222" }}>
                      <div className="flex gap-1 mb-2">
                        {Object.values(v).slice(0, 4).map((c, i) => (
                          <div key={i} className="h-6 w-6 rounded-sm pixel-border" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="font-bold text-sm" style={{ color: "white", textShadow: "1px 1px 0 #000" }}>{t.name}</div>
                      {isActive && <Check className="absolute top-2 right-2 h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="automod">
          {!draft ? <div className="text-sm text-muted-foreground">Loading…</div> : (
            <Card className="p-6 space-y-4">
              <h2 className="font-bold text-lg">Auto-Moderation</h2>
              <Row label="Enable auto-mod" checked={!!draft.automod_enabled} onChange={v => setDraft({ ...draft, automod_enabled: v })} />
              <Row label="Block Discord invites" checked={!!draft.automod_anti_invite} onChange={v => setDraft({ ...draft, automod_anti_invite: v })} />
              <Row label="Block all external links" checked={!!draft.automod_anti_link} onChange={v => setDraft({ ...draft, automod_anti_link: v })} />
              <Row label="Anti-spam (5 msgs in 5s)" checked={!!draft.automod_anti_spam} onChange={v => setDraft({ ...draft, automod_anti_spam: v })} />
              <div className="space-y-2">
                <Label>Blocked words (comma-separated)</Label>
                <Textarea rows={3} value={(draft.automod_blocked_words ?? []).join(", ")}
                  onChange={e => setDraft({ ...draft, automod_blocked_words: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
              </div>
              <Button onClick={() => save.mutate({
                automod_enabled: draft.automod_enabled,
                automod_anti_invite: draft.automod_anti_invite,
                automod_anti_link: draft.automod_anti_link,
                automod_anti_spam: draft.automod_anti_spam,
                automod_blocked_words: draft.automod_blocked_words,
              })} disabled={save.isPending}>Save auto-mod</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bot">
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">Full bot management</h2>
            <p className="text-sm text-muted-foreground">All bot wiring lives on the Discord Bot tab. The bot also supports these admin slash commands:</p>
            <ul className="text-sm font-mono list-disc pl-5 space-y-1">
              <li><code>/addrole</code> <code>/removerole</code> — manage member roles</li>
              <li><code>/createrole</code> <code>/deleterole</code> — manage server roles</li>
              <li><code>/createchannel</code> <code>/deletechannel</code> <code>/renamechannel</code> — manage channels</li>
              <li><code>/slowmode</code> <code>/lock</code> <code>/unlock</code> — channel control</li>
              <li>Plus everything on the Bot tab (warn/mute/kick/ban/purge/say…)</li>
            </ul>
            <p className="text-xs text-muted-foreground">After updating bot code, click <strong>Register all slash commands</strong> on the Discord Bot tab.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
