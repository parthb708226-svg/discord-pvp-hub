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

              // Announce in tier-announcements channel (fire-and-forget)
              const ANNOUNCE_CHANNEL = "1517732611865444372";
              const botToken = process.env.DISCORD_BOT_TOKEN;
              if (botToken) {
                const content = `🏆 **${opts.player}** has been awarded **${opts.tier}** in ${gm.name} (${finalRegion})\n${origin}/player/${encodeURIComponent(opts.player)}`;
                fetch(`https://discord.com/api/v10/channels/${ANNOUNCE_CHANNEL}/messages`, {
                  method: "POST",
                  headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ content }),
                }).catch(e => console.error("[announce]", e));
              }
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

            // ---------- Moderation ----------
            const MOD_LOG_CHANNEL = "1517734779699724458";
            const guildId = body.guild_id ?? process.env.DISCORD_GUILD_ID!;
            const botToken = process.env.DISCORD_BOT_TOKEN!;
            const discordApi = (path: string, init: RequestInit = {}) =>
              fetch(`https://discord.com/api/v10${path}`, {
                ...init,
                headers: {
                  Authorization: `Bot ${botToken}`,
                  "Content-Type": "application/json",
                  ...(init.headers ?? {}),
                  ...(opts.reason ? { "X-Audit-Log-Reason": encodeURIComponent(opts.reason).slice(0, 500) } : {}),
                },
              });
            const modLog = (content: string) =>
              fetch(`https://discord.com/api/v10/channels/${MOD_LOG_CHANNEL}/messages`, {
                method: "POST",
                headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
              }).catch(e => console.error("[modlog]", e));

            const isModCommand = ["warn", "warnings", "mute", "unmute", "kick", "ban", "unban"].includes(cmd);
            if (isModCommand) {
              const actorId = body.member?.user?.id ?? body.user?.id;
              const actorName = body.member?.user?.username ?? body.user?.username ?? "unknown";
              const { data: actorProfile } = await supabaseAdmin.from("profiles").select("id").eq("discord_id", actorId).maybeSingle();
              if (!actorProfile) return reply("❌ Sign in on the website first.", true);
              const { data: actorRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", actorProfile.id);
              const isAdmin = (actorRoles ?? []).some((r: any) => ["owner", "admin"].includes(r.role));
              if (!isAdmin) return reply("❌ Admins only.", true);

              const targetId = opts.user ?? opts.user_id;
              const reason = opts.reason ?? "No reason provided";

              if (cmd === "warn") {
                const tu = await discordApi(`/users/${targetId}`).then(r => r.ok ? r.json() : null).catch(() => null);
                const targetName = (tu as any)?.username ?? targetId;
                await supabaseAdmin.from("warnings").insert({
                  discord_id: targetId, discord_username: targetName, reason,
                  moderator_discord_id: actorId, moderator_username: actorName,
                });
                modLog(`⚠️ **WARN** <@${targetId}> by <@${actorId}>\n**Reason:** ${reason}`);
                return reply(`⚠️ Warned <@${targetId}> — ${reason}`);
              }

              if (cmd === "warnings") {
                const { data: rows } = await supabaseAdmin.from("warnings").select("reason, moderator_username, created_at").eq("discord_id", targetId).order("created_at", { ascending: false }).limit(10);
                if (!rows || rows.length === 0) return reply(`<@${targetId}> has no warnings.`, true);
                const lines2 = rows.map((r: any, i: number) => `${i + 1}. ${r.reason} — *by ${r.moderator_username} on ${new Date(r.created_at).toLocaleDateString()}*`).join("\n");
                return reply(`**Warnings for <@${targetId}>** (${rows.length})\n${lines2}`, true);
              }

              if (cmd === "mute") {
                const minutes = Math.max(1, Math.min(40320, parseInt(opts.minutes, 10) || 0));
                const until = new Date(Date.now() + minutes * 60_000).toISOString();
                const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ communication_disabled_until: until }),
                });
                if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
                modLog(`🔇 **MUTE** <@${targetId}> for **${minutes}m** by <@${actorId}>\n**Reason:** ${reason}`);
                return reply(`🔇 Muted <@${targetId}> for ${minutes}m.`);
              }

              if (cmd === "unmute") {
                const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ communication_disabled_until: null }),
                });
                if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
                modLog(`🔊 **UNMUTE** <@${targetId}> by <@${actorId}>`);
                return reply(`🔊 Unmuted <@${targetId}>.`);
              }

              if (cmd === "kick") {
                const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, { method: "DELETE" });
                if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
                modLog(`👢 **KICK** <@${targetId}> by <@${actorId}>\n**Reason:** ${reason}`);
                return reply(`👢 Kicked <@${targetId}>.`);
              }

              if (cmd === "ban") {
                const days = Math.max(0, Math.min(7, parseInt(opts.delete_days ?? "0", 10) || 0));
                const res = await discordApi(`/guilds/${guildId}/bans/${targetId}`, {
                  method: "PUT",
                  body: JSON.stringify({ delete_message_seconds: days * 86400 }),
                });
                if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
                modLog(`🔨 **BAN** <@${targetId}> by <@${actorId}>\n**Reason:** ${reason}`);
                return reply(`🔨 Banned <@${targetId}>.`);
              }

              if (cmd === "unban") {
                const res = await discordApi(`/guilds/${guildId}/bans/${targetId}`, { method: "DELETE" });
                if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
                modLog(`♻️ **UNBAN** <@${targetId}> by <@${actorId}>\n**Reason:** ${reason}`);
                return reply(`♻️ Unbanned <@${targetId}>.`);
              }
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
