import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;
        const url = new URL(request.url);
        if (!clientId) {
          return new Response(null, {
            status: 302,
            headers: { Location: new URL("/auth?error=missing_client_id", url.origin).toString() },
          });
        }
        const redirectUri = `${url.origin}/api/auth/discord/callback`;
        const state = crypto.randomUUID();

        // Preserve an intended same-origin destination (e.g. the OAuth consent page).
        const rawNext = url.searchParams.get("next") ?? "";
        const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "";

        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", clientId);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("scope", "identify");
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("prompt", "consent");

        const cookies = [
          `discord_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          `discord_oauth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
        ];

        const headers = new Headers({ Location: authorize.toString() });
        for (const c of cookies) headers.append("Set-Cookie", c);
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
