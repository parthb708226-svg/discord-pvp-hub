import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed webhook called by the Railway gateway bot. The bot does NOT have the
// service-role key — it sends events here and we perform the privileged DB work.
export const Route = createFileRoute("/api/public/gateway/event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.GATEWAY_WEBHOOK_SECRET;
        if (!secret) return new Response("not configured", { status: 500 });

        const sigHeader = request.headers.get("x-gateway-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sigHeader);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("bad signature", { status: 401 });
        }

        let body: any;
        try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
        const { action, payload } = body ?? {};
        if (typeof action !== "string" || !payload) return new Response("bad payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (action === "get_config") {
            const { data } = await supabaseAdmin.from("bot_config").select("*").eq("id", "main").maybeSingle();
            return Response.json({ config: data ?? null });
          }

          if (action === "welcome") {
            const userId = String(payload.user_id ?? "");
            const guildName = String(payload.guild_name ?? "the server");
            if (!/^\d{5,32}$/.test(userId)) return new Response("bad id", { status: 400 });
            const { sendWelcome } = await import("@/lib/discord-announce.server");
            const origin = process.env.SITE_ORIGIN ?? "https://discord-pvp-hub.lovable.app";
            await sendWelcome({ userId, guildName, websiteUrl: origin });
            return Response.json({ ok: true });
          }

          if (action === "check_linked") {
            const discordId = String(payload.discord_id ?? "");
            if (!/^\d{5,32}$/.test(discordId)) return Response.json({ linked: false });
            const { data } = await supabaseAdmin
              .from("profiles").select("id").eq("discord_id", discordId).maybeSingle();
            return Response.json({ linked: !!data });
          }

          if (action === "award_xp") {
            const discordId = String(payload.discord_id ?? "");
            const username = String(payload.discord_username ?? "").slice(0, 64);
            const gain = Math.max(1, Math.min(100, Number(payload.gain) || 0));
            if (!/^\d{5,32}$/.test(discordId)) return new Response("bad id", { status: 400 });

            const { data: row } = await supabaseAdmin
              .from("user_levels").select("xp, level").eq("discord_id", discordId).maybeSingle();
            let xp = (row?.xp ?? 0) + gain;
            let level = row?.level ?? 0;
            let leveled = false;
            const need = (lvl: number) => 5 * lvl * lvl + 50 * lvl + 100;
            while (xp >= need(level)) { xp -= need(level); level += 1; leveled = true; }

            await supabaseAdmin.from("user_levels").upsert({
              discord_id: discordId,
              discord_username: username || null,
              xp, level,
              last_message_at: new Date().toISOString(),
            }, { onConflict: "discord_id" });

            return Response.json({ ok: true, level, xp, leveled_up: leveled });
          }

          return new Response("unknown action", { status: 400 });
        } catch (e) {
          console.error("[gateway-webhook]", e);
          return new Response("server error", { status: 500 });
        }
      },
    },
  },
});
