import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  registerBotCommands, getBotConfigFn, updateBotConfigFn,
  listChannelsFn, listModActionsFn, testAnnounceFn,
} from "@/lib/bot.functions";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bot")({ component: BotConfig });

function BotConfig() {
  const qc = useQueryClient();
  const register = useServerFn(registerBotCommands);
  const getCfg = useServerFn(getBotConfigFn);
  const updateCfg = useServerFn(updateBotConfigFn);
  const listChans = useServerFn(listChannelsFn);
  const listActs = useServerFn(listModActionsFn);
  const testFn = useServerFn(testAnnounceFn);

  const { data: cfg } = useQuery({ queryKey: ["bot_config"], queryFn: () => getCfg() });
  const { data: channels, error: channelsError, isLoading: channelsLoading, refetch: refetchChannels } =
    useQuery({ queryKey: ["guild_channels"], queryFn: () => listChans(), retry: false });
  const { data: actions } = useQuery({ queryKey: ["mod_actions"], queryFn: () => listActs() });

  const [draft, setDraft] = useState<any>(null);
  useEffect(() => { if (cfg && !draft) setDraft(cfg); }, [cfg]);

  const save = useMutation({
    mutationFn: (patch: any) => updateCfg({ data: patch }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["bot_config"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reg = useMutation({
    mutationFn: () => register({} as any),
    onSuccess: (d) => toast.success(`Registered ${d.count} commands`),
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: (kind: "welcome" | "tier" | "mod") => testFn({ data: { kind } }),
    onSuccess: () => toast.success("Sent — check Discord"),
    onError: (e: Error) => toast.error(e.message),
  });

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const interactionsUrl = `${origin}/api/public/discord/interactions`;

  if (!draft) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const channelOptions = (channels ?? []).map(c => ({ id: c.id, name: `# ${c.name}` }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Discord Bot</h1>

      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">Channels & Toggles</TabsTrigger>
          <TabsTrigger value="welcome">Welcomer</TabsTrigger>
          <TabsTrigger value="commands">Commands</TabsTrigger>
          <TabsTrigger value="modlog">Mod Log</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>

        {/* ===== Channels ===== */}
        <TabsContent value="channels" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Channel routing</h2>
            <p className="text-sm text-muted-foreground">Where the bot sends each kind of message. Pick a channel from your server.</p>

            {channelsLoading && <p className="text-sm text-muted-foreground">Loading channels from Discord…</p>}
            {channelsError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm space-y-2">
                <div className="font-bold">Couldn't load your server's channels</div>
                <div className="text-muted-foreground">{(channelsError as Error).message}</div>
                <Button size="sm" variant="outline" onClick={() => refetchChannels()}>Retry</Button>
              </div>
            )}
            {!channelsLoading && !channelsError && channelOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">No text channels found — invite the bot to the server first (see the Setup tab).</p>
            )}


            <ChannelField label="Welcome channel" value={draft.welcome_channel_id} options={channelOptions}
              onChange={v => setDraft({ ...draft, welcome_channel_id: v })} />
            <ChannelField label="Tier announcements" value={draft.tier_announce_channel_id} options={channelOptions}
              onChange={v => setDraft({ ...draft, tier_announce_channel_id: v })} />
            <ChannelField label="Moderation log" value={draft.mod_log_channel_id} options={channelOptions}
              onChange={v => setDraft({ ...draft, mod_log_channel_id: v })} />
            <ChannelField label="Gamemode change log (optional)" value={draft.gamemode_log_channel_id} options={channelOptions}
              onChange={v => setDraft({ ...draft, gamemode_log_channel_id: v })} />

            <div className="grid sm:grid-cols-3 gap-4 pt-2">
              <ToggleRow label="Tier announcements" checked={!!draft.tier_announcements_enabled} onChange={v => setDraft({ ...draft, tier_announcements_enabled: v })} />
              <ToggleRow label="Welcomer" checked={!!draft.welcomer_enabled} onChange={v => setDraft({ ...draft, welcomer_enabled: v })} />
              <ToggleRow label="Chat link-gate" checked={!!draft.chat_gate_enabled} onChange={v => setDraft({ ...draft, chat_gate_enabled: v })} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
              <Button variant="outline" onClick={() => test.mutate("tier")} disabled={test.isPending}>Send test tier announcement</Button>
              <Button variant="outline" onClick={() => test.mutate("mod")} disabled={test.isPending}>Send test mod log</Button>
            </div>
          </Card>
        </TabsContent>

        {/* ===== Welcomer ===== */}
        <TabsContent value="welcome" className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="font-bold text-lg">Welcome message</h2>
            <p className="text-sm text-muted-foreground">
              Use placeholders: <code>{"{user}"}</code> (mention), <code>{"{guild}"}</code> (server name), <code>{"{website}"}</code>.
              A rich embed is added automatically with a "Link account" link and command hints.
            </p>
            <Textarea rows={6} value={draft.welcome_message ?? ""} onChange={e => setDraft({ ...draft, welcome_message: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={() => save.mutate({ welcome_message: draft.welcome_message })} disabled={save.isPending}>Save welcome message</Button>
              <Button variant="outline" onClick={() => test.mutate("welcome")} disabled={test.isPending}>Send test welcome</Button>
            </div>
          </Card>
        </TabsContent>

        {/* ===== Commands ===== */}
        <TabsContent value="commands" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">Slash commands</h2>
            <p className="text-sm text-muted-foreground">Re-register every time you add or change a command in the bot code.</p>
            <Button onClick={() => reg.mutate()} disabled={reg.isPending}>{reg.isPending ? "Registering..." : "Register all slash commands"}</Button>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground pt-2">
              <div>
                <div className="font-bold text-foreground mb-1">Public</div>
                <code>/tier</code> · <code>/profile</code> · <code>/tierlist</code> · <code>/leaderboard</code> · <code>/compare</code> · <code>/recent</code> · <code>/gamemodes</code> · <code>/stats</code> · <code>/rank</code> · <code>/help</code>
              </div>
              <div>
                <div className="font-bold text-foreground mb-1">Tester+</div>
                <code>/settier</code> · <code>/removetier</code>
                <div className="font-bold text-foreground mt-3 mb-1">Admin</div>
                <code>/warn</code> · <code>/warnings</code> · <code>/clearwarnings</code> · <code>/mute</code> · <code>/unmute</code> · <code>/kick</code> · <code>/ban</code> · <code>/unban</code> · <code>/purge</code> · <code>/say</code>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ===== Mod Log ===== */}
        <TabsContent value="modlog" className="space-y-4">
          <Card className="p-6">
            <h2 className="font-bold text-lg mb-3">Recent moderation actions</h2>
            <div className="divide-y divide-border">
              {(actions ?? []).map((a: any) => (
                <div key={a.id} className="py-2 text-sm flex flex-wrap items-center gap-2">
                  <span className="font-bold uppercase text-xs px-2 py-1 rounded bg-muted">{a.action}</span>
                  <span>{a.target_username ?? a.target_discord_id}</span>
                  <span className="text-muted-foreground">by {a.moderator_username ?? a.moderator_discord_id}</span>
                  {a.duration_minutes ? <span className="text-muted-foreground">· {a.duration_minutes}m</span> : null}
                  {a.reason ? <span className="text-muted-foreground italic">— {a.reason}</span> : null}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
              {(!actions || actions.length === 0) && <div className="py-8 text-center text-sm text-muted-foreground">No moderation actions yet.</div>}
            </div>
          </Card>
        </TabsContent>

        {/* ===== Setup ===== */}
        <TabsContent value="setup" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">1. Interactions Endpoint URL</h2>
            <p className="text-sm text-muted-foreground">Paste this in the Discord Developer Portal → your app → General Information.</p>
            <Copyable value={interactionsUrl} />
          </Card>
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">2. Invite the bot to your server</h2>
            <p className="text-sm text-muted-foreground">
              Connected server ID: <code>1511993832739176528</code> (<a className="underline" href="https://discord.gg/UYJStqEYQT" target="_blank" rel="noreferrer">invite link</a>).
              After inviting, come back and press "Register all slash commands".
            </p>
            <Copyable value={`https://discord.com/oauth2/authorize?client_id=1177585523385188402&permissions=2147551232&scope=bot%20applications.commands&guild_id=1511993832739176528`} />
          </Card>
          <Card className="p-6 space-y-3">
            <h2 className="font-bold text-lg">3. Gateway worker (welcome + chat-gate + XP)</h2>
            <p className="text-sm text-muted-foreground">
              The <code>gateway/</code> folder is a tiny Node app you deploy to Railway / Render / Fly / a VPS. It only needs two env vars:
            </p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li><code>DISCORD_BOT_TOKEN</code> — your bot token</li>
              <li><code>GATEWAY_WEBHOOK_SECRET</code> — must match the value set on this project</li>
            </ul>
            <p className="text-sm text-muted-foreground">Then <code>npm install</code> and <code>npm start</code>. Welcomer text & channel are pulled from this page live.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelField({ label, value, options, onChange }: { label: string; value: string | null | undefined; options: Array<{ id: string; name: string }>; onChange: (v: string | null) => void }) {
  return (
    <div className="grid sm:grid-cols-[200px_1fr_auto] gap-2 items-center">
      <Label>{label}</Label>
      <Select value={value ?? "__none"} onValueChange={v => onChange(v === "__none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="Pick a channel" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— none —</SelectItem>
          {options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="w-44 font-mono text-xs" placeholder="or paste ID"
        value={value ?? ""} onChange={e => onChange(e.target.value || null)} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
      <code className="text-xs flex-1 break-all">{value}</code>
      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
