// Server-only: send rich embeds to Discord channels with MC skin thumbnails.
// Loads channel IDs from public.bot_config so admins can change them from the UI.

const COLORS: Record<string, number> = {
  HT1: 0xfacc15, LT1: 0xeab308,
  HT2: 0xd1d5db, LT2: 0x9ca3af,
  HT3: 0xea580c, LT3: 0xc2410c,
  HT4: 0x16a34a, LT4: 0x15803d,
  HT5: 0x60a5fa, LT5: 0x3b82f6,
  Retired: 0x6b7280,
  mod: 0xef4444,
  unmod: 0x22c55e,
  info: 0x6366f1,
  welcome: 0xa855f7,
  removal: 0x991b1b,
};

export async function getBotConfig() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("bot_config").select("*").eq("id", "main").maybeSingle();
  return data ?? null;
}

export type PostResult = { ok: boolean; reason?: string };

function friendly(status: number, code: number | undefined, channelId: string) {
  if (code === 50013) return `Missing Permissions in channel ${channelId}. Give the bot "View Channel", "Send Messages" and "Embed Links" there (channel permissions override server roles).`;
  if (code === 50001) return `Missing Access to channel ${channelId}. The bot's role cannot see this channel — add it to the channel's permission overrides.`;
  if (status === 404) return `Channel ${channelId} no longer exists — pick a new one in the Channels tab.`;
  if (status === 401) return "The bot token is invalid. Re-check the bot token secret.";
  return `Discord rejected the message (HTTP ${status}) for channel ${channelId}.`;
}

async function postChannel(channelId: string | null | undefined, body: any): Promise<PostResult> {
  if (!channelId) return { ok: false, reason: "No channel selected yet — pick one in Admin → Discord Bot → Channels." };
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, reason: "Bot token is not configured." };
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let code: number | undefined;
      try { code = JSON.parse(txt)?.code; } catch { /* ignore */ }
      console.error("[discord-announce]", res.status, txt);
      return { ok: false, reason: friendly(res.status, code, channelId) };
    }
    return { ok: true };
  } catch (e) {
    console.error("[discord-announce]", e);
    return { ok: false, reason: `Network error contacting Discord: ${String(e)}` };
  }
}


export const mcHead = (name: string) => `https://mc-heads.net/avatar/${encodeURIComponent(name)}/128`;
export const mcBody = (name: string) => `https://mc-heads.net/body/${encodeURIComponent(name)}/256`;

export async function announceTierChange(opts: {
  player: string;
  tier: string;
  region: string;
  gamemodeName: string;
  gamemodeIcon?: string | null;
  awardedBy?: string | null;
  websiteOrigin: string;
  isUpdate?: boolean;
}) {
  const cfg = await getBotConfig();
  if (!cfg?.tier_announcements_enabled || !cfg.tier_announce_channel_id) return;
  const color = COLORS[opts.tier] ?? COLORS.info;
  await postChannel(cfg.tier_announce_channel_id, {
    embeds: [{
      title: `${opts.gamemodeIcon ?? "🏆"} ${opts.isUpdate ? "Tier Updated" : "New Tier Awarded"}`,
      description: `**${opts.player}** has been awarded **${opts.tier}** in **${opts.gamemodeName}**`,
      color,
      thumbnail: { url: mcHead(opts.player) },
      fields: [
        { name: "Tier", value: `\`${opts.tier}\``, inline: true },
        { name: "Region", value: opts.region, inline: true },
        { name: "Gamemode", value: opts.gamemodeName, inline: true },
        ...(opts.awardedBy ? [{ name: "Tested by", value: opts.awardedBy, inline: false }] : []),
      ],
      url: `${opts.websiteOrigin}/player/${encodeURIComponent(opts.player)}`,
      timestamp: new Date().toISOString(),
      footer: { text: "PvP Tiers" },
    }],
  });
}

export async function announceTierRemoval(opts: {
  player: string;
  tier: string;
  gamemodeName: string;
  removedBy?: string | null;
  websiteOrigin: string;
}) {
  const cfg = await getBotConfig();
  if (!cfg?.tier_announcements_enabled || !cfg.tier_announce_channel_id) return;
  await postChannel(cfg.tier_announce_channel_id, {
    embeds: [{
      title: "❌ Tier Removed",
      description: `**${opts.player}**'s **${opts.tier}** in **${opts.gamemodeName}** has been removed.`,
      color: COLORS.removal,
      thumbnail: { url: mcHead(opts.player) },
      ...(opts.removedBy ? { fields: [{ name: "Removed by", value: opts.removedBy }] } : {}),
      url: `${opts.websiteOrigin}/player/${encodeURIComponent(opts.player)}`,
      timestamp: new Date().toISOString(),
      footer: { text: "PvP Tiers" },
    }],
  });
}

export async function announceModAction(opts: {
  action: "WARN" | "MUTE" | "UNMUTE" | "KICK" | "BAN" | "UNBAN";
  targetId: string;
  targetName?: string | null;
  moderatorId: string;
  moderatorName?: string | null;
  reason?: string | null;
  durationMinutes?: number | null;
}) {
  const cfg = await getBotConfig();
  if (!cfg?.mod_log_channel_id) return;
  const emoji = { WARN: "⚠️", MUTE: "🔇", UNMUTE: "🔊", KICK: "👢", BAN: "🔨", UNBAN: "♻️" }[opts.action];
  const isGood = opts.action === "UNMUTE" || opts.action === "UNBAN";
  await postChannel(cfg.mod_log_channel_id, {
    embeds: [{
      title: `${emoji} ${opts.action}`,
      color: isGood ? COLORS.unmod : COLORS.mod,
      fields: [
        { name: "Target", value: `<@${opts.targetId}>${opts.targetName ? ` (${opts.targetName})` : ""}\n\`${opts.targetId}\``, inline: true },
        { name: "Moderator", value: `<@${opts.moderatorId}>${opts.moderatorName ? ` (${opts.moderatorName})` : ""}`, inline: true },
        ...(opts.durationMinutes ? [{ name: "Duration", value: `${opts.durationMinutes} minutes`, inline: true }] : []),
        ...(opts.reason ? [{ name: "Reason", value: opts.reason, inline: false }] : []),
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Moderation Log" },
    }],
    allowed_mentions: { parse: [] },
  });

  // Persist in mod_actions log
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mod_actions").insert({
      action: opts.action,
      target_discord_id: opts.targetId,
      target_username: opts.targetName ?? null,
      moderator_discord_id: opts.moderatorId,
      moderator_username: opts.moderatorName ?? null,
      reason: opts.reason ?? null,
      duration_minutes: opts.durationMinutes ?? null,
    });
  } catch (e) { console.error("[mod-actions log]", e); }
}

export async function sendWelcome(opts: {
  userId: string;
  guildName: string;
  websiteUrl: string;
}) {
  const cfg = await getBotConfig();
  if (!cfg?.welcomer_enabled || !cfg.welcome_channel_id) return;
  const msg = (cfg.welcome_message ?? "")
    .replaceAll("{user}", `<@${opts.userId}>`)
    .replaceAll("{guild}", opts.guildName)
    .replaceAll("{website}", opts.websiteUrl);
  await postChannel(cfg.welcome_channel_id, {
    content: msg,
    embeds: [{
      color: COLORS.welcome,
      title: `Welcome to ${opts.guildName}!`,
      description: "Link your Minecraft account on the website to start chatting and ranking up.",
      thumbnail: { url: `https://cdn.discordapp.com/embed/avatars/0.png` },
      fields: [
        { name: "🔗 Link account", value: `${opts.websiteUrl}/auth`, inline: false },
        { name: "🎮 Try", value: "`/tier` · `/profile` · `/tierlist` · `/leaderboard`", inline: false },
      ],
      timestamp: new Date().toISOString(),
    }],
    allowed_mentions: { users: [opts.userId] },
  });
}
