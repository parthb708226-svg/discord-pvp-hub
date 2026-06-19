import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/discord/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.DISCORD_CLIENT_ID!;
        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/auth/discord/callback`;
        const state = crypto.randomUUID();

        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.searchParams.set("client_id", clientId);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("scope", "identify");
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("prompt", "consent");

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorize.toString(),
            "Set-Cookie": `discord_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      },
    },
  },
});
