# PvP Tiers Gateway Bot

Keeps the bot **Online** and handles realtime events (welcome, chat levels, chat gate).
Slash commands still go through the Lovable website — this gateway only handles things
that need a persistent WebSocket connection.

## Features

- ✅ Shows the bot as **Online** with "Watching PvP Tiers" status
- 👋 Welcomes new members in channel `1517732915201577070`
- 🔒 **Chat gate** — deletes messages from users who haven't logged into the website,
  DMs them a link to sign in
- 🎉 **Chat levels** — earn 15-25 XP per message (60s cooldown), DM on level up.
  Stored in the `user_levels` table.
- 🏆 Tier announcements in `1517732611865444372` are posted by the website itself
  when `/settier` runs — no action needed here.

## Deploy on Railway

1. Push this `gateway/` folder to a GitHub repo (or zip + upload).
2. Railway → **New Project** → **Deploy from GitHub repo**.
3. Add these environment variables (Service → Variables):

   | Name | Value |
   |---|---|
   | `DISCORD_BOT_TOKEN` | From Discord Dev Portal → Bot → Reset Token |
   | `SUPABASE_URL` | Your Lovable Cloud project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | From Lovable Cloud → backend secrets |
   | `WEBSITE_URL` | `https://discord-pvp-hub.lovable.app` (optional, defaults to this) |

4. Deploy. Within a few seconds the bot will show **Online** in your server.

## Required Discord intents

In Discord Dev Portal → **Bot** → enable:
- **Server Members Intent** (for welcomes)
- **Message Content Intent** (for chat gate + XP)

Without these, the bot will boot but won't react to messages or joins.

## Required bot permissions

Re-invite the bot with these permissions if it can't delete messages:
`Send Messages`, `Manage Messages`, `Read Message History`, `View Channels`.
