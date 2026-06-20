// Discord gateway bot — keeps the bot Online, handles welcomes, chat levels,
// and the "must be logged into the website before chatting" rule.
// All slash commands still route through the Lovable app /api/public/discord/interactions endpoint.

import { Client, GatewayIntentBits, Events, Partials, ActivityType } from "discord.js";
import { createClient } from "@supabase/supabase-js";

const {
  DISCORD_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  WEBSITE_URL = "https://discord-pvp-hub.lovable.app",
} = process.env;

if (!DISCORD_BOT_TOKEN) throw new Error("Missing DISCORD_BOT_TOKEN");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const WELCOME_CHANNEL_ID = "1517732915201577070";
// Channels exempt from the "must log in" rule (announcements, rules, etc.). Add IDs as needed.
const CHAT_GATE_EXEMPT_CHANNELS = new Set([
  "1517732611865444372", // tier announcements
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

// ---------- Welcome ----------
client.on(Events.GuildMemberAdd, async member => {
  try {
    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;
    await channel.send({
      content: `👋 Welcome <@${member.id}> to **${member.guild.name}**!\n` +
        `🔗 Link your account at ${WEBSITE_URL}/auth before you can chat.\n` +
        `Use \`/tier\`, \`/profile\`, \`/tierlist\` to explore rankings.`,
    });
  } catch (e) { console.error("[welcome]", e); }
});

// ---------- Helpers ----------
async function isLinked(discordId) {
  const { data } = await supabase.from("profiles").select("id").eq("discord_id", discordId).maybeSingle();
  return !!data;
}

// XP required to reach a given level (classic curve)
const xpForLevel = lvl => 5 * lvl * lvl + 50 * lvl + 100;

// 1 message per 60s gives XP
const xpCooldown = new Map(); // discord_id -> timestamp

async function awardXp(message) {
  const uid = message.author.id;
  const now = Date.now();
  const last = xpCooldown.get(uid) ?? 0;
  if (now - last < 60_000) return;
  xpCooldown.set(uid, now);

  const gain = Math.floor(15 + Math.random() * 11); // 15-25 xp

  const { data: row } = await supabase.from("user_levels").select("xp, level").eq("discord_id", uid).maybeSingle();
  let xp = (row?.xp ?? 0) + gain;
  let level = row?.level ?? 0;
  let leveledUp = false;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }

  await supabase.from("user_levels").upsert({
    discord_id: uid,
    discord_username: message.author.username,
    xp, level,
    last_message_at: new Date().toISOString(),
  }, { onConflict: "discord_id" });

  if (leveledUp) {
    try {
      const dm = await message.author.createDM();
      await dm.send(`🎉 You leveled up to **Level ${level}** on **${message.guild?.name ?? "the server"}**! Keep chatting to earn more XP.`);
    } catch { /* DMs closed */ }
  }
}

// ---------- Chat gate + XP ----------
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;
  if (CHAT_GATE_EXEMPT_CHANNELS.has(message.channelId)) return;

  const linked = await isLinked(message.author.id);
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

  awardXp(message).catch(e => console.error("[xp]", e));
});

client.on(Events.Error, e => console.error("[gateway error]", e));
client.on(Events.Warn, w => console.warn("[gateway warn]", w));

client.login(DISCORD_BOT_TOKEN);
