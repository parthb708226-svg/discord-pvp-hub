import { Client, GatewayIntentBits, ActivityType } from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.on('ready', () => {
  console.log(`Bot online as ${client.user.tag}`);
  client.user.setActivity('PvP Hub', { type: ActivityType.Watching });
});

client.on('error', (err) => {
  console.error('Discord client error:', err.message);
});

client.on('warn', (warn) => {
  console.warn('Discord client warn:', warn);
});

client.login(token);
