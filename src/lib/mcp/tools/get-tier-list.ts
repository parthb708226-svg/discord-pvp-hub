import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_tier_list",
  title: "Get tier list",
  description: "Get the ranked tier list for one gamemode slug (for example 'crystal' or 'archer').",
  inputSchema: {
    gamemode: z.string().trim().describe("Gamemode slug, e.g. 'crystal'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gamemode }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: mode, error: modeError } = await supabase
      .from("gamemodes")
      .select("id, name, slug")
      .eq("slug", gamemode.toLowerCase())
      .maybeSingle();
    if (modeError) return { content: [{ type: "text", text: modeError.message }], isError: true };
    if (!mode) {
      return { content: [{ type: "text", text: `Unknown gamemode: ${gamemode}` }], isError: true };
    }
    const { data, error } = await supabase
      .from("player_tiers")
      .select("minecraft_username, tier, region, awarded_at, notes")
      .eq("gamemode_id", mode.id)
      .order("tier")
      .limit(500);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ gamemode: mode.name, players: data }) }],
      structuredContent: { gamemode: mode.name, players: data ?? [] },
    };
  },
});
