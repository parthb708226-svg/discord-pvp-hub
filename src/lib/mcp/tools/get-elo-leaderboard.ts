import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_elo_leaderboard",
  title: "Get Elo leaderboard",
  description: "Top players by Elo rating, optionally filtered to one gamemode slug.",
  inputSchema: {
    gamemode: z.string().trim().optional().describe("Optional gamemode slug to filter by."),
    limit: z.number().int().optional().describe("How many rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ gamemode, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("player_elo")
      .select("elo, peak_elo, wins, losses, draws, current_streak, profiles(minecraft_username), gamemodes(name, slug)")
      .order("elo", { ascending: false })
      .limit(take);

    if (gamemode) {
      const { data: mode } = await supabase
        .from("gamemodes")
        .select("id")
        .eq("slug", gamemode.toLowerCase())
        .maybeSingle();
      if (!mode) {
        return { content: [{ type: "text", text: `Unknown gamemode: ${gamemode}` }], isError: true };
      }
      query = query.eq("gamemode_id", mode.id);
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});
