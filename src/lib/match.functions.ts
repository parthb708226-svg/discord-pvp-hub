import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function profileByUsername(sb: any, username: string) {
  const { data } = await sb.from("profiles").select("id, discord_username").ilike("discord_username", username).maybeSingle();
  return data;
}

export const reportMatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    gamemode_id: string; winner_username: string; loser_username: string;
    winner_score?: number; loser_score?: number; is_draw?: boolean; notes?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [w, l] = await Promise.all([
      profileByUsername(sb, data.winner_username),
      profileByUsername(sb, data.loser_username),
    ]);
    if (!w || !l) throw new Error("Both players must have signed in at least once");
    if (w.id === l.id) throw new Error("Winner and loser must differ");
    const { data: row, error } = await sb.from("matches").insert({
      gamemode_id: data.gamemode_id,
      winner_id: w.id, loser_id: l.id,
      winner_score: data.winner_score ?? 0,
      loser_score: data.loser_score ?? 0,
      is_draw: !!data.is_draw,
      notes: data.notes ?? null,
      reported_by: context.userId,
      status: "pending",
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const verifyMatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: m, error } = await (context.supabase as any).rpc("verify_match", { _match_id: data.id });
    if (error) throw new Error(error.message);
    return m;
  });

export const setMatchStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "disputed" | "rejected" | "pending" }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("matches").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMatchesFn = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: string; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = pub();
    let q = sb.from("matches").select(`
      id, status, played_at, winner_score, loser_score, is_draw,
      winner_elo_before, winner_elo_after, loser_elo_before, loser_elo_after,
      winner:profiles!matches_winner_id_fkey(id, discord_username, discord_avatar),
      loser:profiles!matches_loser_id_fkey(id, discord_username, discord_avatar),
      gamemodes(name, slug, icon)
    `).order("played_at", { ascending: false }).limit(data.limit ?? 50);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listPendingMatchesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("matches").select(`
      id, status, played_at, winner_score, loser_score, is_draw, notes,
      winner:profiles!matches_winner_id_fkey(id, discord_username),
      loser:profiles!matches_loser_id_fkey(id, discord_username),
      reporter:profiles!matches_reported_by_fkey(id, discord_username),
      gamemodes(name, slug, icon)
    `).in("status", ["pending", "disputed"]).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPlayerStatsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { username: string }) => d)
  .handler(async ({ data }) => {
    const sb = pub();
    const { data: p } = await sb.from("profiles").select("id, discord_username, discord_avatar").ilike("discord_username", data.username).maybeSingle();
    if (!p) return { profile: null, elo: [], recent: [] };
    const [{ data: elo }, { data: recent }] = await Promise.all([
      sb.from("player_elo").select("elo, peak_elo, wins, losses, draws, current_streak, longest_streak, last_match_at, gamemodes(name, slug, icon)").eq("profile_id", p.id),
      sb.from("matches").select(`
        id, played_at, status, winner_score, loser_score, is_draw,
        winner_elo_after, loser_elo_after,
        winner:profiles!matches_winner_id_fkey(id, discord_username),
        loser:profiles!matches_loser_id_fkey(id, discord_username),
        gamemodes(name, slug, icon)
      `).eq("status", "verified").or(`winner_id.eq.${p.id},loser_id.eq.${p.id}`).order("played_at", { ascending: false }).limit(20),
    ]);
    return { profile: p, elo: elo ?? [], recent: recent ?? [] };
  });

export const getEloLeaderboardFn = createServerFn({ method: "GET" })
  .inputValidator((d: { gamemode_slug?: string; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const sb = pub();
    let gmId: string | null = null;
    if (data.gamemode_slug) {
      const { data: g } = await sb.from("gamemodes").select("id").eq("slug", data.gamemode_slug).maybeSingle();
      gmId = g?.id ?? null;
    }
    let q = sb.from("player_elo").select(`
      elo, peak_elo, wins, losses, draws, current_streak,
      profiles(id, discord_username, discord_avatar),
      gamemodes(name, slug, icon)
    `).order("elo", { ascending: false }).limit(data.limit ?? 100);
    if (gmId) q = q.eq("gamemode_id", gmId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
