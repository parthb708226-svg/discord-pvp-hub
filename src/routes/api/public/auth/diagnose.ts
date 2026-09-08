import { createFileRoute } from "@tanstack/react-router";

/**
 * Sign-in self check. Reports only whether each required setting exists
 * (never its value) plus the exact callback URL this host will send to Discord.
 */
export const Route = createFileRoute("/api/public/auth/diagnose")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const clientId = (process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || "").trim();
        const has = (n: string) => Boolean((process.env[n] ?? "").trim());
        return Response.json(
          {
            host: url.origin,
            redirect_uri_to_register: `${url.origin}/api/auth/discord/callback`,
            discord_client_id_looks_valid: /^\d{15,25}$/.test(clientId),
            settings_present: {
              DISCORD_CLIENT_ID: has("DISCORD_CLIENT_ID") || has("DISCORD_APPLICATION_ID"),
              DISCORD_CLIENT_SECRET: has("DISCORD_CLIENT_SECRET"),
              SUPABASE_URL: has("SUPABASE_URL"),
              SUPABASE_PUBLISHABLE_KEY: has("SUPABASE_PUBLISHABLE_KEY"),
              SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
            },
            next_step:
              "Add redirect_uri_to_register to the Discord developer portal under OAuth2 -> Redirects, and set any missing settings in your hosting environment variables.",
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
