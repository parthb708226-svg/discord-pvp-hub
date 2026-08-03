import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_player",
  title: "Get player",
  description: "Get all tiers a Minecraft player holds across gamemodes.",
  inputSchema: {
    username: z.string().trim().describe("Minecraft username."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ username }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("player_tiers")
      .select("tier, region, awarded_at, notes, gamemodes(name, slug)")
      .ilike("minecraft_username", username)
      .order("tier");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      return { content: [{ type: "text", text: `No tiers found for ${username}.` }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ username, tiers: data }) }],
      structuredContent: { username, tiers: data },
    };
  },
});
