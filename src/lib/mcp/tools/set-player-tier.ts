import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const TIERS = [
  "HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5", "Retired",
] as const;

export default defineTool({
  name: "set_player_tier",
  title: "Set player tier",
  description:
    "Award or update a player's tier in a gamemode. Requires a signed-in tester/admin account; the database rejects other callers.",
  inputSchema: {
    username: z.string().trim().describe("Minecraft username."),
    gamemode: z.string().trim().describe("Gamemode slug, e.g. 'crystal'."),
    tier: z.enum(TIERS).describe("Tier rank to assign."),
    region: z.string().trim().optional().describe("Region code: NA, EU, AS, SA, OC, AF, Unknown."),
    notes: z.string().trim().optional().describe("Optional tester notes."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ username, gamemode, tier, region, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: mode } = await supabase
      .from("gamemodes")
      .select("id, name")
      .eq("slug", gamemode.toLowerCase())
      .maybeSingle();
    if (!mode) {
      return { content: [{ type: "text", text: `Unknown gamemode: ${gamemode}` }], isError: true };
    }

    const { data: existing } = await supabase
      .from("player_tiers")
      .select("id")
      .eq("gamemode_id", mode.id)
      .ilike("minecraft_username", username)
      .maybeSingle();

    const row = {
      minecraft_username: username,
      gamemode_id: mode.id,
      tier,
      awarded_by: ctx.getUserId() ?? null,
      ...(region ? { region: region as never } : {}),
      ...(notes ? { notes } : {}),
    };

    const { data, error } = existing
      ? await supabase.from("player_tiers").update(row).eq("id", existing.id).select().maybeSingle()
      : await supabase.from("player_tiers").insert(row).select().maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${username} is now ${tier} in ${mode.name}.` }],
      structuredContent: { row: data },
    };
  },
});
