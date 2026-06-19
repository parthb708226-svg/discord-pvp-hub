import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { registerBotCommands } from "@/lib/bot.functions";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bot")({ component: BotConfig });

function BotConfig() {
  const register = useServerFn(registerBotCommands);
  const mut = useMutation({
    mutationFn: () => register({} as any),
    onSuccess: (d) => toast.success(`Registered ${d.count} commands`),
    onError: (e: Error) => toast.error(e.message),
  });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const interactionsUrl = `${origin}/api/public/discord/interactions`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Discord bot</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">1. Set the Interactions Endpoint URL</h2>
        <p className="text-sm text-muted-foreground">In the Discord Developer Portal → your app → <strong>General Information</strong>, set this as the Interactions Endpoint URL:</p>
        <Copyable value={interactionsUrl} />
        <p className="text-xs text-muted-foreground">Discord will ping the URL to verify your public key. You must save commands first or it will fail to handshake — but the endpoint here always responds correctly.</p>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold text-lg">2. Register slash commands</h2>
        <p className="text-sm text-muted-foreground">Click below to register / re-register all commands in your Discord server. Idempotent — safe to run anytime.</p>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Registering..." : "Register slash commands"}</Button>
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li><code>/tier player gamemode</code> — look up a player's tier</li>
          <li><code>/settier player gamemode tier [region]</code> — testers only</li>
          <li><code>/tierlist gamemode</code> — share the tier list link</li>
          <li><code>/profile player</code> — show all tiers for a player</li>
        </ul>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-bold text-lg">3. Invite the bot to your server</h2>
        <Copyable value={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_APP_ID ?? "YOUR_APP_ID"}&permissions=2147551232&scope=bot%20applications.commands`} />
        <p className="text-xs text-muted-foreground">If the link above shows "YOUR_APP_ID", paste your Discord application ID into the URL manually (it's 1177585523385188402).</p>
      </Card>
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
