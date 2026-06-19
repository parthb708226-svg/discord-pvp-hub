import { createFileRoute } from "@tanstack/react-router";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";

export const Route = createFileRoute("/api/public/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-signature-ed25519") ?? "";
        const timestamp = request.headers.get("x-signature-timestamp") ?? "";
        const rawBody = await request.text();
        const publicKey = process.env.DISCORD_PUBLIC_KEY!;

        const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
        if (!isValid) return new Response("Bad signature", { status: 401 });

        const body = JSON.parse(rawBody);

        if (body.type === InteractionType.PING) {
          return json({ type: InteractionResponseType.PONG });
        }

        if (body.type === InteractionType.APPLICATION_COMMAND) {
          const cmd = body.data.name as string;
          const opts: Record<string, string> = {};
          (body.data.options ?? []).forEach((o: any) => (opts[o.name] = String(o.value)));
          const origin = new URL(request.url).origin;

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          try {
            if (cmd === "tier") {
              const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
              if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``);
              const { data: t } = await supabaseAdmin.from("player_tiers").select("tier, region").eq("gamemode_id", gm.id).ilike("minecraft_username", opts.player).maybeSingle();
              if (!t) return reply(`No tier found for **${opts.player}** in ${gm.icon} ${gm.name}.`);
              return reply(`${gm.icon} **${opts.player}** — **${t.tier}** in ${gm.name} (${t.region})\n${origin}/player/${encodeURIComponent(opts.player)}`);
            }

            if (cmd === "settier") {
              const discordId = body.member?.user?.id ?? body.user?.id;
              const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("discord_id", discordId).maybeSingle();
              if (!profile) return reply("❌ You need to sign in on the website first.", true);
              const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", profile.id);
              const allowed = (roles ?? []).some((r: any) => ["owner", "admin", "tester"].includes(r.role));
              if (!allowed) return reply("❌ You need the tester role.", true);

              const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
              if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``, true);

              const validTiers = ["HT1","LT1","HT2","LT2","HT3","LT3","HT4","LT4","HT5","LT5","Retired"];
              if (!validTiers.includes(opts.tier)) return reply(`❌ Invalid tier. Use one of: ${validTiers.join(", ")}`, true);

              const region = (opts.region ?? "Unknown").toUpperCase();
              const validRegions = ["NA","EU","AS","SA","OC","AF","UNKNOWN"];
              const finalRegion = validRegions.includes(region) ? (region === "UNKNOWN" ? "Unknown" : region) : "Unknown";

              const { error } = await supabaseAdmin.from("player_tiers").upsert({
                minecraft_username: opts.player, gamemode_id: gm.id, tier: opts.tier as any, region: finalRegion as any, awarded_by: profile.id,
              }, { onConflict: "minecraft_username,gamemode_id" });
              if (error) return reply(`❌ ${error.message}`, true);
              return reply(`✅ Set **${opts.player}** to **${opts.tier}** in ${gm.name}`);
            }

            if (cmd === "tierlist") {
              const { data: gm } = await supabaseAdmin.from("gamemodes").select("name, slug, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
              if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``);
              return reply(`${gm.icon} **${gm.name} Tier List** → ${origin}/tier/${gm.slug}`);
            }

            if (cmd === "profile") {
              const { data: tiers } = await supabaseAdmin.from("player_tiers").select("tier, gamemodes(name, icon)").ilike("minecraft_username", opts.player);
              if (!tiers || tiers.length === 0) return reply(`No tiers for **${opts.player}**.`);
              const lines = tiers.map(t => `${(t.gamemodes as any)?.icon} ${(t.gamemodes as any)?.name}: **${t.tier}**`).join("\n");
              return reply(`**${opts.player}**\n${lines}\n${origin}/player/${encodeURIComponent(opts.player)}`);
            }

            return reply("Unknown command.");
          } catch (e) {
            console.error("[discord-cmd]", e);
            return reply(`❌ Error: ${(e as Error).message}`, true);
          }
        }

        return json({ type: 4, data: { content: "Unhandled interaction." } });
      },
    },
  },
});

function json(data: any) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
function reply(content: string, ephemeral = false) {
  return json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { content, flags: ephemeral ? 64 : 0 } });
}
