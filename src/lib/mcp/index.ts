import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listGamemodes from "./tools/list-gamemodes";
import getTierList from "./tools/get-tier-list";
import getPlayer from "./tools/get-player";
import getEloLeaderboard from "./tools/get-elo-leaderboard";
import setPlayerTier from "./tools/set-player-tier";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "pvp-tier-hub",
  title: "PvP Tier Hub",
  version: "0.1.0",
  instructions:
    "Tools for Archer's Tier List, a Minecraft PvP tier ranking site. Use list_gamemodes to discover gamemode slugs, get_tier_list for a gamemode's rankings, get_player for one player's tiers, get_elo_leaderboard for Elo standings, and set_player_tier to award a tier (tester/admin accounts only).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listGamemodes, getTierList, getPlayer, getEloLeaderboard, setPlayerTier],
});
