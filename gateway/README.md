# Discord Gateway Bot — Railway Deploy Guide

This is a minimal gateway bot that keeps your Discord bot showing **Online**.  
All slash commands still route through your main Lovable app (already configured).

---

## 1. Add this folder to Railway

### Option A: GitHub deploy (recommended)
1. Push this repo to GitHub
2. In Railway, click **New Project → Deploy from GitHub repo**
3. Select this repo
4. Railway auto-detects the `Procfile` and deploys

### Option B: Manual upload
1. Zip the `gateway/` folder (only `package.json`, `index.js`, `Procfile`)
2. In Railway, click **New Project → Upload**
3. Upload the zip

---

## 2. Add environment variables

In Railway, go to **Variables** and add:

| Variable | Value | Where to find it |
|----------|-------|-----------------|
| `DISCORD_BOT_TOKEN` | Your bot token | Discord Developer Portal → Bot → Reset Token |

**Important:** Use the same bot token that your Lovable app uses.

---

## 3. Deploy

Railway will auto-deploy. Once the deploy is live, your bot will show **Online** in Discord.

Check the **Deploy Logs** in Railway to confirm: `Bot online as [YourBot#1234]`

---

## How it works

- This bot only opens a **WebSocket gateway connection** to Discord (required for "Online" status)
- Slash commands are still handled by your Lovable app at `/api/public/discord/interactions`
- This gateway does **not** process commands, so there are no duplicates

---

## Troubleshooting

**Bot still offline?**
- Check Railway logs for errors
- Verify `DISCORD_BOT_TOKEN` is correct (not the OAuth secret, but the Bot token)
- Make sure the bot is in your Discord server

**Want to stop it?**
- Just delete the Railway project — your Lovable slash commands will still work, but the bot won't show "Online"
