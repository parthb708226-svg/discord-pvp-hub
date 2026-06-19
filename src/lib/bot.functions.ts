import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Register slash commands with Discord (admin only). Idempotent.
export const registerBotCommands = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRows } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const isAdmin = (roleRows ?? []).some(r => r.role === "owner" || r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden");

    const appId = process.env.DISCORD_APPLICATION_ID!;
    const token = process.env.DISCORD_BOT_TOKEN!;
    const guildId = process.env.DISCORD_GUILD_ID!;

    const commands = [
      {
        name: "tier",
        description: "Look up a player's tier in a gamemode",
        options: [
          { name: "player", description: "Minecraft username", type: 3, required: true },
          { name: "gamemode", description: "Gamemode slug (e.g. crystal)", type: 3, required: true },
        ],
      },
      {
        name: "settier",
        description: "Set a player's tier (testers+)",
        options: [
          { name: "player", description: "Minecraft username", type: 3, required: true },
          { name: "gamemode", description: "Gamemode slug", type: 3, required: true },
          { name: "tier", description: "HT1, LT1, HT2, ... Retired", type: 3, required: true },
          { name: "region", description: "NA / EU / AS / SA / OC / AF", type: 3, required: false },
        ],
      },
      {
        name: "tierlist",
        description: "Show the tier list link for a gamemode",
        options: [{ name: "gamemode", description: "Gamemode slug", type: 3, required: true }],
      },
      {
        name: "profile",
        description: "Show all tiers for a player",
        options: [{ name: "player", description: "Minecraft username", type: 3, required: true }],
      },
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
