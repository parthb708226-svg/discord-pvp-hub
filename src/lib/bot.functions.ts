import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const ok = (roles ?? []).some((r: any) => r.role === "owner" || r.role === "admin");
  if (!ok) throw new Error("Forbidden");
}
async function assertStaff(ctx: any) {
  const { data: roles } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const ok = (roles ?? []).some((r: any) => ["owner", "admin", "tester"].includes(r.role));
  if (!ok) throw new Error("Forbidden");
}

// Register slash commands with Discord (admin only). Idempotent.
export const registerBotCommands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const appId = process.env.DISCORD_APPLICATION_ID!;
    const token = process.env.DISCORD_BOT_TOKEN!;
    const guildId = process.env.DISCORD_GUILD_ID!;

    const commands = [
      { name: "tier", description: "Look up a player's tier in a gamemode", options: [
        { name: "player", description: "Minecraft username", type: 3, required: true },
        { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
      ]},
      { name: "settier", description: "Set a player's tier (testers+)", options: [
        { name: "player", description: "Minecraft username", type: 3, required: true },
        { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
        { name: "tier", description: "HT1, LT1, ... Retired", type: 3, required: true },
        { name: "region", description: "NA / EU / AS / SA / OC / AF", type: 3, required: false },
      ]},
      { name: "removetier", description: "Remove a player's tier (testers+)", options: [
        { name: "player", description: "Minecraft username", type: 3, required: true },
        { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
      ]},
      { name: "tierlist", description: "Show the tier list for a gamemode", options: [
        { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
      ]},
      { name: "profile", description: "Show all tiers for a player", options: [
        { name: "player", description: "Minecraft username", type: 3, required: true },
      ]},
      { name: "leaderboard", description: "Top players in a gamemode", options: [
        { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
      ]},
      { name: "compare", description: "Compare two players across all gamemodes", options: [
        { name: "player1", description: "First Minecraft username", type: 3, required: true },
        { name: "player2", description: "Second Minecraft username", type: 3, required: true },
      ]},
      { name: "recent", description: "Show the most recent tier changes" },
      { name: "gamemodes", description: "List all available gamemodes" },
      { name: "stats", description: "Show server tier statistics" },
      { name: "rank", description: "Show your (or another user's) chat level", options: [
        { name: "user", description: "Member", type: 6, required: false },
      ]},
      { name: "help", description: "List all bot commands" },
      // ---------------- Moderation ----------------
      { name: "warn", description: "Warn a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "reason", description: "Reason", type: 3, required: true },
      ]},
      { name: "warnings", description: "List a member's warnings", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
      ]},
      { name: "clearwarnings", description: "Clear a member's warnings (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
      ]},
      { name: "mute", description: "Timeout a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "minutes", description: "Duration in minutes (max 40320)", type: 4, required: true },
        { name: "reason", description: "Reason", type: 3, required: false },
      ]},
      { name: "unmute", description: "Remove timeout (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
      ]},
      { name: "kick", description: "Kick a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "reason", description: "Reason", type: 3, required: false },
      ]},
      { name: "ban", description: "Ban a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "reason", description: "Reason", type: 3, required: false },
        { name: "delete_days", description: "Delete N days of messages (0-7)", type: 4, required: false },
      ]},
      { name: "unban", description: "Unban a user by ID (admin only)", default_member_permissions: "0", options: [
        { name: "user_id", description: "Discord user ID", type: 3, required: true },
        { name: "reason", description: "Reason", type: 3, required: false },
      ]},
      { name: "purge", description: "Bulk delete N messages from this channel (admin only)", default_member_permissions: "0", options: [
        { name: "count", description: "1-100", type: 4, required: true },
      ]},
      { name: "say", description: "Send a message as the bot (admin only)", default_member_permissions: "0", options: [
        { name: "channel", description: "Channel", type: 7, required: true },
        { name: "message", description: "Message body", type: 3, required: true },
      ]},
      { name: "slowmode", description: "Set channel slowmode in seconds (0=off)", default_member_permissions: "0", options: [
        { name: "seconds", description: "0-21600", type: 4, required: true },
      ]},
      { name: "lock", description: "Lock current channel (admin only)", default_member_permissions: "0" },
      { name: "unlock", description: "Unlock current channel (admin only)", default_member_permissions: "0" },
      // Role mgmt
      { name: "addrole", description: "Add a role to a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "role", description: "Role", type: 8, required: true },
      ]},
      { name: "removerole", description: "Remove a role from a member (admin only)", default_member_permissions: "0", options: [
        { name: "user", description: "Member", type: 6, required: true },
        { name: "role", description: "Role", type: 8, required: true },
      ]},
      { name: "createrole", description: "Create a new role (admin only)", default_member_permissions: "0", options: [
        { name: "name", description: "Role name", type: 3, required: true },
        { name: "color", description: "Hex color e.g. ff5500", type: 3, required: false },
      ]},
      { name: "deleterole", description: "Delete a role (admin only)", default_member_permissions: "0", options: [
        { name: "role", description: "Role", type: 8, required: true },
      ]},
      // Channel mgmt
      { name: "createchannel", description: "Create a text channel (admin only)", default_member_permissions: "0", options: [
        { name: "name", description: "Channel name", type: 3, required: true },
      ]},
      { name: "deletechannel", description: "Delete a channel (admin only)", default_member_permissions: "0", options: [
        { name: "channel", description: "Channel", type: 7, required: true },
      ]},
      { name: "renamechannel", description: "Rename a channel (admin only)", default_member_permissions: "0", options: [
        { name: "channel", description: "Channel", type: 7, required: true },
        { name: "name", description: "New name", type: 3, required: true },
      ]},
    ];

    const url = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Discord API ${res.status}: ${await res.text()}`);
    return { ok: true, count: commands.length };
  });

// ---------------- Bot config CRUD ----------------

export const getBotConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("bot_config").select("*").eq("id", "main").maybeSingle();
    return data;
  });

export const updateBotConfigFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    welcome_channel_id?: string | null;
    welcome_message?: string;
    tier_announce_channel_id?: string | null;
    mod_log_channel_id?: string | null;
    gamemode_log_channel_id?: string | null;
    tier_announcements_enabled?: boolean;
    welcomer_enabled?: boolean;
    chat_gate_enabled?: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: any = { ...data, updated_at: new Date().toISOString() };
    const { error } = await context.supabase.from("bot_config").update(patch).eq("id", "main");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listChannelsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const token = process.env.DISCORD_BOT_TOKEN!;
    const guildId = process.env.DISCORD_GUILD_ID!;
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) throw new Error(`Discord ${res.status}`);
    const chans = (await res.json()) as Array<{ id: string; name: string; type: number; parent_id: string | null; position: number }>;
    // Only text-like channels: 0=GUILD_TEXT, 5=ANNOUNCEMENT
    return chans.filter(c => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position);
  });

// ---------------- Tier write w/ announce ----------------

export const upsertTierFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; gamemode_id: string; tier: string; region: string }) => d)
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: gm } = await context.supabase.from("gamemodes").select("id, name, icon").eq("id", data.gamemode_id).maybeSingle();
    if (!gm) throw new Error("Gamemode not found");
    const { data: existing } = await context.supabase.from("player_tiers").select("id").eq("gamemode_id", data.gamemode_id).ilike("minecraft_username", data.username).maybeSingle();
    const { error } = await context.supabase.from("player_tiers").upsert({
      minecraft_username: data.username, gamemode_id: data.gamemode_id, tier: data.tier as any, region: data.region as any, awarded_by: context.userId,
    }, { onConflict: "minecraft_username,gamemode_id" });
    if (error) throw new Error(error.message);

    const { data: actor } = await context.supabase.from("profiles").select("discord_username, minecraft_username").eq("id", context.userId).maybeSingle();
    const origin = process.env.SITE_ORIGIN ?? "https://discord-pvp-hub.lovable.app";
    const { announceTierChange } = await import("@/lib/discord-announce.server");
    await announceTierChange({
      player: data.username, tier: data.tier, region: data.region, gamemodeName: gm.name, gamemodeIcon: gm.icon,
      awardedBy: actor?.discord_username ?? actor?.minecraft_username ?? null,
      websiteOrigin: origin, isUpdate: !!existing,
    });
    return { ok: true };
  });

export const deleteTierFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase.from("player_tiers").select("minecraft_username, tier, gamemodes(name)").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("player_tiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row) {
      const { data: actor } = await context.supabase.from("profiles").select("discord_username, minecraft_username").eq("id", context.userId).maybeSingle();
      const origin = process.env.SITE_ORIGIN ?? "https://discord-pvp-hub.lovable.app";
      const { announceTierRemoval } = await import("@/lib/discord-announce.server");
      await announceTierRemoval({
        player: row.minecraft_username, tier: row.tier,
        gamemodeName: (row.gamemodes as any)?.name ?? "Unknown",
        removedBy: actor?.discord_username ?? actor?.minecraft_username ?? null,
        websiteOrigin: origin,
      });
    }
    return { ok: true };
  });

// ---------------- Logs viewers (admin) ----------------

export const listModActionsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("mod_actions").select("*").order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const testAnnounceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "welcome" | "tier" | "mod" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const origin = process.env.SITE_ORIGIN ?? "https://archer-tier-list.lovable.app";
    const a = await import("@/lib/discord-announce.server");
    if (data.kind === "welcome") {
      const { data: prof } = await context.supabase.from("profiles").select("discord_id").eq("id", context.userId).maybeSingle();
      await a.sendWelcome({ userId: prof?.discord_id ?? "0", guildName: "Your Server", websiteUrl: origin });
    } else if (data.kind === "tier") {
      await a.announceTierChange({ player: "Notch", tier: "HT1", region: "NA", gamemodeName: "Crystal PvP", gamemodeIcon: "💎", awardedBy: "Test", websiteOrigin: origin });
    } else {
      const { data: prof } = await context.supabase.from("profiles").select("discord_id, discord_username").eq("id", context.userId).maybeSingle();
      await a.announceModAction({ action: "WARN", targetId: prof?.discord_id ?? "0", targetName: prof?.discord_username, moderatorId: prof?.discord_id ?? "0", moderatorName: "system", reason: "Test announcement from admin panel" });
    }
    return { ok: true };
  });
