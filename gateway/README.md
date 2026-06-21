# PvP Tiers — Discord Gateway Bot

Tiny Node service that keeps the bot **Online**, handles welcomes, the
"must log in before chat" rule, and chat-level XP.

Slash commands (`/tier`, `/settier`, `/warn`, `/ban`, …) are handled by the
website's interactions endpoint — they work even when this process is offline.

## Why this exists

Discord's interactions endpoint only fires on slash commands. Persistent
events (member joins, every message in chat) require a real WebSocket
connection, which is what this gateway provides.

## Architecture (no service-role key needed)

```
Discord ─ws─► gateway ─signed HTTPS─► website /api/public/gateway/event ─► Supabase (admin)
```

The bot only knows its Discord token and a shared HMAC secret. The website
holds the service-role key and performs the privileged DB writes after
verifying the HMAC signature.

## Deploy to Railway

1. **Push** the `gateway/` folder to a GitHub repo (or use Railway's "deploy
   from local").
2. **New project → Deploy from repo**, set root directory = `gateway/`.
3. **Variables** tab — add exactly these three:
   - `DISCORD_BOT_TOKEN` — from Discord Developer Portal → Bot → Reset Token
   - `GATEWAY_WEBHOOK_SECRET` — must equal the same secret set on the website
     (already added: `GATEWAY_WEBHOOK_SECRET`)
   - *(optional)* `GATEWAY_WEBHOOK_URL` — defaults to
     `https://discord-pvp-hub.lovable.app/api/public/gateway/event`
4. **Discord Developer Portal → your app → Bot → Privileged Gateway Intents**:
   - ☑ Server Members Intent
   - ☑ Message Content Intent
5. **Bot permissions** in the server: Manage Messages (to delete unlinked
   chat), View Channels, Send Messages, Read Message History.
6. Railway auto-runs `npm start`. Tail logs to confirm `✅ Logged in as …`.

That's it — no Supabase keys in Railway.
