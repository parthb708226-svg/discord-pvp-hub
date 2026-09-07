import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const code = url.searchParams.get("code");
          const state = url.searchParams.get("state");
          const cookieHeader = request.headers.get("cookie") ?? "";
          const cookieState = cookieHeader.split(/;\s*/).find(c => c.startsWith("discord_oauth_state="))?.split("=")[1];
          const rawNext = decodeURIComponent(cookieHeader.split(/;\s*/).find(c => c.startsWith("discord_oauth_next="))?.split("=")[1] ?? "");
          const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

          if (!code) return redirectTo("/auth?error=missing_code", url.origin);
          if (!state || !cookieState || state !== cookieState) return redirectTo("/auth?error=bad_state", url.origin);

          const clientId = process.env.DISCORD_CLIENT_ID!;
          const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
          const redirectUri = `${url.origin}/api/auth/discord/callback`;

          // 1) Exchange code for token
          const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
            }),
          });
          if (!tokenRes.ok) {
            const detail = await tokenRes.text().catch(() => "");
            console.error("[discord-callback] token exchange failed", tokenRes.status, detail);
            const reason = /redirect_uri/i.test(detail)
              ? "redirect_mismatch"
              : /client/i.test(detail)
                ? "bad_credentials"
                : "token_exchange";
            return redirectTo(`/auth?error=${reason}`, url.origin);
          }
          const token = await tokenRes.json() as { access_token: string };

          // 2) Fetch Discord user
          const userRes = await fetch("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${token.access_token}` },
          });
          if (!userRes.ok) return redirectTo("/auth?error=user_fetch", url.origin);
          const dUser = await userRes.json() as {
            id: string; username: string; global_name?: string; avatar?: string;
          };

          // 3) Create or fetch Supabase user via admin
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const email = `discord_${dUser.id}@discord.pvptiers.local`;
          const userMeta = {
            discord_id: dUser.id,
            discord_username: dUser.global_name ?? dUser.username,
            discord_avatar: dUser.avatar
              ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
              : null,
          };

          // Try to create; if exists, update metadata
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: userMeta,
          });
          let userId = created?.user?.id;
          if (createErr && !userId) {
            // already exists — look up
            const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
            const found = list.users.find(u => u.email === email);
            if (!found) return redirectTo("/auth?error=user_lookup", url.origin);
            userId = found.id;
            await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: userMeta });
          }

          // Also ensure profile row reflects latest discord info
          await supabaseAdmin.from("profiles").upsert({
            id: userId!,
            discord_id: dUser.id,
            discord_username: userMeta.discord_username,
            discord_avatar: userMeta.discord_avatar,
          });

          // 4) Generate magic link, extract token_hash, redirect client to /auth to verify
          const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
          if (linkErr || !link) return redirectTo("/auth?error=link_gen", url.origin);
          const hashed = (link.properties as any)?.hashed_token ?? new URL(link.properties.action_link).searchParams.get("token");
          if (!hashed) return redirectTo("/auth?error=no_token", url.origin);

          const headers = new Headers({
            Location: `/auth?token_hash=${encodeURIComponent(hashed)}&type=email${next ? `&next=${encodeURIComponent(next)}` : ""}`,
          });
          headers.append("Set-Cookie", `discord_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
          headers.append("Set-Cookie", `discord_oauth_next=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
          return new Response(null, { status: 302, headers });
        } catch (e) {
          console.error("[discord-callback]", e);
          return new Response("Auth error: " + (e as Error).message, { status: 500 });
        }
      },
    },
  },
});

function redirectTo(path: string, origin: string) {
  return new Response(null, { status: 302, headers: { Location: new URL(path, origin).toString() } });
}
