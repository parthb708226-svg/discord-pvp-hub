import { createFileRoute } from "@tanstack/react-router";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";

const TIER_COLOR: Record<string, number> = {
  HT1: 0xfacc15, LT1: 0xeab308, HT2: 0xd1d5db, LT2: 0x9ca3af,
  HT3: 0xea580c, LT3: 0xc2410c, HT4: 0x16a34a, LT4: 0x15803d,
  HT5: 0x60a5fa, LT5: 0x3b82f6, Retired: 0x6b7280,
};
const mcHead = (n: string) => `https://mc-heads.net/avatar/${encodeURIComponent(n)}/128`;
const mcBody = (n: string) => `https://mc-heads.net/body/${encodeURIComponent(n)}/256`;

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
        if (body.type === InteractionType.PING) return json({ type: InteractionResponseType.PONG });

        if (body.type !== InteractionType.APPLICATION_COMMAND) {
          return json({ type: 4, data: { content: "Unhandled interaction." } });
        }

        const cmd = body.data.name as string;
        const opts: Record<string, string> = {};
        (body.data.options ?? []).forEach((o: any) => (opts[o.name] = String(o.value)));
        const origin = new URL(request.url).origin;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const announce = await import("@/lib/discord-announce.server");

        try {
          // ============== Public lookups ==============
          if (cmd === "tier") {
            const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
            if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``);
            const { data: t } = await supabaseAdmin.from("player_tiers").select("tier, region").eq("gamemode_id", gm.id).ilike("minecraft_username", opts.player).maybeSingle();
            if (!t) return reply(`No tier found for **${opts.player}** in ${gm.icon ?? ""} ${gm.name}.`);
            return embedReply({
              title: `${gm.icon ?? "🏆"} ${opts.player} — ${gm.name}`,
              description: `**Tier:** \`${t.tier}\`\n**Region:** ${t.region}`,
              color: TIER_COLOR[t.tier] ?? 0x6366f1,
              thumbnail: { url: mcHead(opts.player) },
              url: `${origin}/player/${encodeURIComponent(opts.player)}`,
            });
          }

          if (cmd === "profile") {
            const { data: tiers } = await supabaseAdmin.from("player_tiers").select("tier, region, gamemodes(name, icon, sort_order)").ilike("minecraft_username", opts.player);
            if (!tiers || tiers.length === 0) return reply(`No tiers for **${opts.player}**.`);
            const sorted = [...tiers].sort((a: any, b: any) => (a.gamemodes?.sort_order ?? 0) - (b.gamemodes?.sort_order ?? 0));
            const fields = sorted.map((t: any) => ({
              name: `${t.gamemodes?.icon ?? "🏆"} ${t.gamemodes?.name ?? "?"}`,
              value: `\`${t.tier}\` · ${t.region}`,
              inline: true,
            }));
            return embedReply({
              title: `${opts.player}'s Profile`,
              color: 0x6366f1,
              thumbnail: { url: mcBody(opts.player) },
              fields,
              url: `${origin}/player/${encodeURIComponent(opts.player)}`,
              footer: { text: `${tiers.length} tier${tiers.length === 1 ? "" : "s"} ranked` },
            });
          }

          if (cmd === "tierlist") {
            const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name, slug, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
            if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``);
            const { data: rows } = await supabaseAdmin.from("player_tiers").select("minecraft_username, tier").eq("gamemode_id", gm.id).order("tier");
            const counts: Record<string, number> = {};
            (rows ?? []).forEach(r => (counts[r.tier] = (counts[r.tier] ?? 0) + 1));
            const summary = Object.entries(counts).sort().map(([t, n]) => `\`${t}\` × ${n}`).join(" · ") || "_no entries_";
            return embedReply({
              title: `${gm.icon ?? "🏆"} ${gm.name} Tier List`,
              description: summary,
              color: 0x6366f1,
              url: `${origin}/tier/${gm.slug}`,
              footer: { text: `View the full list on the website` },
            });
          }

          if (cmd === "leaderboard") {
            const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
            if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``);
            const { data: rows } = await supabaseAdmin.from("player_tiers").select("minecraft_username, tier, region").eq("gamemode_id", gm.id).order("tier").limit(20);
            if (!rows || rows.length === 0) return reply(`No tiers in ${gm.name} yet.`);
            const lines = rows.map((r, i) => `**${i + 1}.** \`${r.tier}\` ${r.minecraft_username} _(${r.region})_`).join("\n");
            return embedReply({
              title: `${gm.icon ?? "🏆"} ${gm.name} Leaderboard`,
              description: lines,
              color: 0xfacc15,
              footer: { text: `Top ${rows.length}` },
            });
          }

          if (cmd === "compare") {
            const [a, b] = [opts.player1, opts.player2];
            const { data: rowsA } = await supabaseAdmin.from("player_tiers").select("tier, gamemodes(name, icon, sort_order)").ilike("minecraft_username", a);
            const { data: rowsB } = await supabaseAdmin.from("player_tiers").select("tier, gamemodes(name, icon, sort_order)").ilike("minecraft_username", b);
            const map = new Map<string, { icon?: string; a?: string; b?: string; order: number }>();
            (rowsA ?? []).forEach((r: any) => { const k = r.gamemodes?.name ?? "?"; map.set(k, { ...(map.get(k) ?? { order: r.gamemodes?.sort_order ?? 0 }), icon: r.gamemodes?.icon, a: r.tier }); });
            (rowsB ?? []).forEach((r: any) => { const k = r.gamemodes?.name ?? "?"; map.set(k, { ...(map.get(k) ?? { order: r.gamemodes?.sort_order ?? 0, icon: r.gamemodes?.icon }), b: r.tier }); });
            const fields = [...map.entries()].sort((x, y) => x[1].order - y[1].order).map(([name, v]) => ({
              name: `${v.icon ?? "🏆"} ${name}`,
              value: `${a}: \`${v.a ?? "—"}\`\n${b}: \`${v.b ?? "—"}\``,
              inline: true,
            }));
            return embedReply({ title: `${a} vs ${b}`, color: 0x6366f1, fields });
          }

          if (cmd === "recent") {
            const { data: rows } = await supabaseAdmin.from("player_tiers").select("minecraft_username, tier, region, awarded_at, gamemodes(name, icon)").order("awarded_at", { ascending: false }).limit(10);
            if (!rows || rows.length === 0) return reply("No tier changes yet.");
            const lines = rows.map((r: any) => `${r.gamemodes?.icon ?? "🏆"} \`${r.tier}\` **${r.minecraft_username}** in ${r.gamemodes?.name ?? "?"} _(${r.region})_`).join("\n");
            return embedReply({ title: "🕒 Recent Tier Changes", description: lines, color: 0x6366f1 });
          }

          if (cmd === "gamemodes") {
            const { data: gms } = await supabaseAdmin.from("gamemodes").select("name, slug, icon").eq("active", true).order("sort_order");
            const lines = (gms ?? []).map(g => `${g.icon ?? "🏆"} **${g.name}** — \`${g.slug}\``).join("\n");
            return embedReply({ title: "Available Gamemodes", description: lines || "_none_", color: 0x6366f1 });
          }

          if (cmd === "stats") {
            const { count: tierCount } = await supabaseAdmin.from("player_tiers").select("*", { count: "exact", head: true });
            const { count: gmCount } = await supabaseAdmin.from("gamemodes").select("*", { count: "exact", head: true }).eq("active", true);
            const { count: pCount } = await supabaseAdmin.from("profiles").select("*", { count: "exact", head: true });
            return embedReply({
              title: "📊 Server Stats", color: 0x6366f1,
              fields: [
                { name: "Tier Entries", value: String(tierCount ?? 0), inline: true },
                { name: "Gamemodes", value: String(gmCount ?? 0), inline: true },
                { name: "Linked Players", value: String(pCount ?? 0), inline: true },
              ],
            });
          }

          if (cmd === "rank") {
            const targetId = opts.user ?? body.member?.user?.id ?? body.user?.id;
            const { data: lvl } = await supabaseAdmin.from("user_levels").select("xp, level").eq("discord_id", targetId).maybeSingle();
            if (!lvl) return reply(`<@${targetId}> hasn't earned any XP yet.`, true);
            const need = 5 * lvl.level * lvl.level + 50 * lvl.level + 100;
            return embedReply({
              title: "💬 Chat Level", color: 0x22c55e,
              description: `<@${targetId}>\n**Level ${lvl.level}** · ${lvl.xp} / ${need} XP`,
            });
          }

          if (cmd === "help") {
            return embedReply({
              title: "🎮 PvP Tiers Bot", color: 0x6366f1,
              description: "All available commands:",
              fields: [
                { name: "Tier Lookups", value: "`/tier` `/profile` `/tierlist` `/leaderboard` `/compare` `/recent` `/gamemodes` `/stats`" },
                { name: "Tier Management (testers+)", value: "`/settier` `/removetier`" },
                { name: "Chat", value: "`/rank`" },
                { name: "Moderation (admin)", value: "`/warn` `/warnings` `/clearwarnings` `/mute` `/unmute` `/kick` `/ban` `/unban` `/purge` `/say`" },
              ],
              footer: { text: "All tier changes are announced & all mod actions are logged" },
            });
          }

          // ============== Tier writes ==============
          if (cmd === "settier" || cmd === "removetier") {
            const discordId = body.member?.user?.id ?? body.user?.id;
            const actorName = body.member?.user?.username ?? body.user?.username ?? "unknown";
            const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("discord_id", discordId).maybeSingle();
            if (!profile) return reply("❌ Sign in on the website first.", true);
            const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", profile.id);
            const allowed = (roles ?? []).some((r: any) => ["owner", "admin", "tester"].includes(r.role));
            if (!allowed) return reply("❌ Tester role required.", true);

            const { data: gm } = await supabaseAdmin.from("gamemodes").select("id, name, icon").eq("slug", opts.gamemode.toLowerCase()).maybeSingle();
            if (!gm) return reply(`❌ Unknown gamemode \`${opts.gamemode}\``, true);

            if (cmd === "settier") {
              const validTiers = ["HT1","LT1","HT2","LT2","HT3","LT3","HT4","LT4","HT5","LT5","Retired"];
              if (!validTiers.includes(opts.tier)) return reply(`❌ Invalid tier. Use: ${validTiers.join(", ")}`, true);
              const region = (opts.region ?? "Unknown").toUpperCase();
              const validRegions = ["NA","EU","AS","SA","OC","AF","UNKNOWN"];
              const finalRegion = validRegions.includes(region) ? (region === "UNKNOWN" ? "Unknown" : region) : "Unknown";
              const { data: existing } = await supabaseAdmin.from("player_tiers").select("id").eq("gamemode_id", gm.id).ilike("minecraft_username", opts.player).maybeSingle();
              const { error } = await supabaseAdmin.from("player_tiers").upsert({
                minecraft_username: opts.player, gamemode_id: gm.id, tier: opts.tier as any, region: finalRegion as any, awarded_by: profile.id,
              }, { onConflict: "minecraft_username,gamemode_id" });
              if (error) return reply(`❌ ${error.message}`, true);
              announce.announceTierChange({
                player: opts.player, tier: opts.tier, region: finalRegion, gamemodeName: gm.name, gamemodeIcon: gm.icon, awardedBy: actorName, websiteOrigin: origin, isUpdate: !!existing,
              }).catch(e => console.error("[announce]", e));
              return reply(`✅ Set **${opts.player}** to **${opts.tier}** in ${gm.name}`);
            } else {
              const { data: row } = await supabaseAdmin.from("player_tiers").select("id, tier").eq("gamemode_id", gm.id).ilike("minecraft_username", opts.player).maybeSingle();
              if (!row) return reply(`❌ ${opts.player} has no tier in ${gm.name}.`, true);
              await supabaseAdmin.from("player_tiers").delete().eq("id", row.id);
              announce.announceTierRemoval({ player: opts.player, tier: row.tier, gamemodeName: gm.name, removedBy: actorName, websiteOrigin: origin }).catch(e => console.error("[announce]", e));
              return reply(`✅ Removed **${opts.player}**'s tier in ${gm.name}.`);
            }
          }

          // ============== Moderation ==============
          const isModCommand = ["warn","warnings","clearwarnings","mute","unmute","kick","ban","unban","purge","say","slowmode","lock","unlock","addrole","removerole","createrole","deleterole","createchannel","deletechannel","renamechannel"].includes(cmd);
          if (!isModCommand) return reply("Unknown command.");

          const actorId = body.member?.user?.id ?? body.user?.id;
          const actorName = body.member?.user?.username ?? body.user?.username ?? "unknown";
          const { data: actorProfile } = await supabaseAdmin.from("profiles").select("id").eq("discord_id", actorId).maybeSingle();
          if (!actorProfile) return reply("❌ Sign in on the website first.", true);
          const { data: actorRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", actorProfile.id);
          const isAdmin = (actorRoles ?? []).some((r: any) => ["owner", "admin"].includes(r.role));
          if (!isAdmin) return reply("❌ Admins only.", true);

          const guildId = body.guild_id ?? process.env.DISCORD_GUILD_ID!;
          const botToken = process.env.DISCORD_BOT_TOKEN!;
          const discordApi = (path: string, init: RequestInit = {}) =>
            fetch(`https://discord.com/api/v10${path}`, {
              ...init,
              headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
            });

          const targetId = opts.user ?? opts.user_id;
          const reason = opts.reason ?? null;
          const tu = targetId ? await discordApi(`/users/${targetId}`).then(r => r.ok ? r.json() : null).catch(() => null) : null;
          const targetName = (tu as any)?.username ?? null;

          if (cmd === "warn") {
            await supabaseAdmin.from("warnings").insert({
              discord_id: targetId, discord_username: targetName, reason: reason ?? "No reason",
              moderator_discord_id: actorId, moderator_username: actorName,
            });
            announce.announceModAction({ action: "WARN", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason }).catch(e => console.error(e));
            return reply(`⚠️ Warned <@${targetId}>${reason ? ` — ${reason}` : ""}`);
          }

          if (cmd === "warnings") {
            const { data: rows } = await supabaseAdmin.from("warnings").select("reason, moderator_username, created_at").eq("discord_id", targetId).order("created_at", { ascending: false }).limit(10);
            if (!rows || rows.length === 0) return reply(`<@${targetId}> has no warnings.`, true);
            const lines = rows.map((r: any, i: number) => `${i + 1}. ${r.reason} — *by ${r.moderator_username} on ${new Date(r.created_at).toLocaleDateString()}*`).join("\n");
            return embedReply({ title: `Warnings for ${targetName ?? targetId}`, description: lines, color: 0xef4444, footer: { text: `${rows.length} warning(s)` } }, true);
          }

          if (cmd === "clearwarnings") {
            const { error } = await supabaseAdmin.from("warnings").delete().eq("discord_id", targetId);
            if (error) return reply(`❌ ${error.message}`, true);
            announce.announceModAction({ action: "WARN", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason: "(warnings cleared)" }).catch(() => {});
            return reply(`🧹 Cleared all warnings for <@${targetId}>.`);
          }

          if (cmd === "mute") {
            const minutes = Math.max(1, Math.min(40320, parseInt(opts.minutes, 10) || 0));
            const until = new Date(Date.now() + minutes * 60_000).toISOString();
            const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, { method: "PATCH", body: JSON.stringify({ communication_disabled_until: until }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            announce.announceModAction({ action: "MUTE", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason, durationMinutes: minutes }).catch(e => console.error(e));
            return reply(`🔇 Muted <@${targetId}> for ${minutes}m.`);
          }

          if (cmd === "unmute") {
            const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, { method: "PATCH", body: JSON.stringify({ communication_disabled_until: null }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            announce.announceModAction({ action: "UNMUTE", targetId, targetName, moderatorId: actorId, moderatorName: actorName }).catch(e => console.error(e));
            return reply(`🔊 Unmuted <@${targetId}>.`);
          }

          if (cmd === "kick") {
            const res = await discordApi(`/guilds/${guildId}/members/${targetId}`, { method: "DELETE" });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            announce.announceModAction({ action: "KICK", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason }).catch(e => console.error(e));
            return reply(`👢 Kicked <@${targetId}>.`);
          }

          if (cmd === "ban") {
            const days = Math.max(0, Math.min(7, parseInt(opts.delete_days ?? "0", 10) || 0));
            const res = await discordApi(`/guilds/${guildId}/bans/${targetId}`, { method: "PUT", body: JSON.stringify({ delete_message_seconds: days * 86400 }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            announce.announceModAction({ action: "BAN", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason }).catch(e => console.error(e));
            return reply(`🔨 Banned <@${targetId}>.`);
          }

          if (cmd === "unban") {
            const res = await discordApi(`/guilds/${guildId}/bans/${targetId}`, { method: "DELETE" });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            announce.announceModAction({ action: "UNBAN", targetId, targetName, moderatorId: actorId, moderatorName: actorName, reason }).catch(e => console.error(e));
            return reply(`♻️ Unbanned <@${targetId}>.`);
          }

          if (cmd === "purge") {
            const count = Math.max(1, Math.min(100, parseInt(opts.count, 10) || 0));
            const channelId = body.channel_id;
            const msgs = await discordApi(`/channels/${channelId}/messages?limit=${count}`).then(r => r.json()).catch(() => []);
            const ids = (msgs as any[]).map(m => m.id);
            if (ids.length === 0) return reply("Nothing to delete.", true);
            await discordApi(`/channels/${channelId}/messages/bulk-delete`, { method: "POST", body: JSON.stringify({ messages: ids }) });
            return reply(`🧹 Deleted ${ids.length} message(s).`, true);
          }

          if (cmd === "say") {
            const channelId = opts.channel;
            const res = await discordApi(`/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ content: opts.message, allowed_mentions: { parse: [] } }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(`✅ Sent.`, true);
          }

          if (cmd === "slowmode") {
            const sec = Math.max(0, Math.min(21600, parseInt(opts.seconds, 10) || 0));
            const res = await discordApi(`/channels/${body.channel_id}`, { method: "PATCH", body: JSON.stringify({ rate_limit_per_user: sec }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(sec === 0 ? `🟢 Slowmode disabled.` : `🐢 Slowmode set to ${sec}s.`);
          }

          if (cmd === "lock" || cmd === "unlock") {
            const everyoneId = guildId;
            const deny = cmd === "lock" ? "2048" : "0";
            const allow = cmd === "unlock" ? "2048" : "0";
            const res = await discordApi(`/channels/${body.channel_id}/permissions/${everyoneId}`, {
              method: "PUT", body: JSON.stringify({ id: everyoneId, type: 0, allow, deny }),
            });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(cmd === "lock" ? `🔒 Channel locked.` : `🔓 Channel unlocked.`);
          }

          if (cmd === "addrole" || cmd === "removerole") {
            const roleId = opts.role;
            const res = await discordApi(`/guilds/${guildId}/members/${targetId}/roles/${roleId}`,
              { method: cmd === "addrole" ? "PUT" : "DELETE" });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(cmd === "addrole" ? `✅ Added <@&${roleId}> to <@${targetId}>.` : `✅ Removed <@&${roleId}> from <@${targetId}>.`);
          }

          if (cmd === "createrole") {
            const color = opts.color ? parseInt(opts.color.replace("#",""), 16) : 0;
            const res = await discordApi(`/guilds/${guildId}/roles`, {
              method: "POST", body: JSON.stringify({ name: opts.name, color: isNaN(color) ? 0 : color, mentionable: true }),
            });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            const r = await res.json();
            return reply(`✅ Created role <@&${r.id}>.`);
          }

          if (cmd === "deleterole") {
            const res = await discordApi(`/guilds/${guildId}/roles/${opts.role}`, { method: "DELETE" });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(`🗑️ Role deleted.`);
          }

          if (cmd === "createchannel") {
            const res = await discordApi(`/guilds/${guildId}/channels`, {
              method: "POST", body: JSON.stringify({ name: opts.name, type: 0 }),
            });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            const c = await res.json();
            return reply(`✅ Created <#${c.id}>.`);
          }

          if (cmd === "deletechannel") {
            const res = await discordApi(`/channels/${opts.channel}`, { method: "DELETE" });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(`🗑️ Channel deleted.`);
          }

          if (cmd === "renamechannel") {
            const res = await discordApi(`/channels/${opts.channel}`, { method: "PATCH", body: JSON.stringify({ name: opts.name }) });
            if (!res.ok) return reply(`❌ Discord ${res.status}: ${await res.text()}`, true);
            return reply(`✏️ Renamed <#${opts.channel}> to **${opts.name}**.`);
          }

          return reply("Unknown command.");
        } catch (e) {
          console.error("[discord-cmd]", e);
          return reply(`❌ Error: ${(e as Error).message}`, true);
        }
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
function embedReply(embed: any, ephemeral = false) {
  return json({ type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data: { embeds: [{ timestamp: new Date().toISOString(), ...embed }], flags: ephemeral ? 64 : 0 } });
}
