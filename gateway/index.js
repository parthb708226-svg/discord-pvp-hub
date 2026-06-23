// Discord gateway bot — keeps the bot Online, handles welcomes, chat gate, and chat-level XP.
// Slash commands route through the website's interactions endpoint.
// DB writes (XP, level lookups, profile checks) go through a signed webhook on the website,
// so this process does NOT need the Supabase service-role key.

import { Client, GatewayIntentBits, Events, Partials, ActivityType } from "discord.js";
import { createHmac } from "node:crypto";

const {
  DISCORD_BOT_TOKEN,
  GATEWAY_WEBHOOK_URL = "https://archer-tier-list.lovable.app/api/public/gateway/event",
  GATEWAY_WEBHOOK_SECRET,
  WEBSITE_URL = "https://archer-tier-list.lovable.app",
} = process.env;

if (!DISCORD_BOT_TOKEN) throw new Error("Missing DISCORD_BOT_TOKEN");
if (!GATEWAY_WEBHOOK_SECRET) throw new Error("Missing GATEWAY_WEBHOOK_SECRET (must match the website's value)");

const CHAT_GATE_EXEMPT_CHANNELS = new Set([
  "1513961894132846642", // tier announcements
]);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  c.user.setPresence({ activities: [{ name: "PvP Tiers", type: ActivityType.Watching }], status: "online" });
});

// ---------- Signed webhook helper ----------
async function callWebhook(action, payload) {
  const body = JSON.stringify({ action, payload, ts: Date.now() });
  const sig = createHmac("sha256", GATEWAY_WEBHOOK_SECRET).update(body).digest("hex");
  const res = await fetch(GATEWAY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gateway-signature": sig },
    body,
  });
  if (!res.ok) throw new Error(`webhook ${action} ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

// ---------- Welcome (delegated to website so it can use rich embeds + live config) ----------
client.on(Events.GuildMemberAdd, async member => {
  try {
    await callWebhook("welcome", { user_id: member.id, guild_name: member.guild.name });
  } catch (e) { console.error("[welcome]", e); }
});

// ---------- Chat gate + XP ----------
const xpCooldown = new Map(); // discord_id -> ms

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;
  if (CHAT_GATE_EXEMPT_CHANNELS.has(message.channelId)) return;

  // 1) Gate: is this user linked on the website?
  let linked = false;
  try {
    const r = await callWebhook("check_linked", { discord_id: message.author.id });
    linked = r.linked;
  } catch (e) { console.error("[gate]", e); return; }

  if (!linked) {
    try { await message.delete(); } catch { /* missing perms */ }
    try {
      const dm = await message.author.createDM();
      await dm.send(
        `🔒 You need to link your Discord account before chatting in **${message.guild.name}**.\n` +
        `👉 Sign in here: ${WEBSITE_URL}/auth\n` +
        `Once you log in once, you'll be able to chat normally.`
      );
    } catch { /* DMs closed */ }
    return;
  }

  // 2) XP: 1 message per 60s gives 15-25 xp
  const now = Date.now();
  const last = xpCooldown.get(message.author.id) ?? 0;
  if (now - last < 60_000) return;
  xpCooldown.set(message.author.id, now);
  const gain = Math.floor(15 + Math.random() * 11);

  try {
    const r = await callWebhook("award_xp", {
      discord_id: message.author.id,
      discord_username: message.author.username,
      gain,
    });
    if (r.leveled_up) {
      try {
        const dm = await message.author.createDM();
        await dm.send(`🎉 You leveled up to **Level ${r.level}** on **${message.guild?.name ?? "the server"}**! Keep chatting to earn more XP.`);
      } catch { /* DMs closed */ }
    }
  } catch (e) { console.error("[xp]", e); }
});

client.on(Events.Error, e => console.error("[gateway error]", e));
client.on(Events.Warn, w => console.warn("[gateway warn]", w));

client.login(DISCORD_BOT_TOKEN);
