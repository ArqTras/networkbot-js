require('dotenv').config();
const startTelegram = require('./handlers/telegramHandler');
const startDiscord = require('./handlers/discordHandler');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;

if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !ALERT_USER_ID || !process.env.DISCORD_ALERT_CHANNEL_ID) {
  console.error('Missing required environment variables! (TELEGRAM_TOKEN, DISCORD_TOKEN, ALERT_USER_ID, DISCORD_ALERT_CHANNEL_ID)');
  process.exit(1);
}

(async () => {
  const telegramBot = startTelegram(TELEGRAM_TOKEN, ALERT_USER_ID);
  startDiscord(DISCORD_TOKEN, telegramBot, ALERT_USER_ID);
})();
