require('dotenv').config();
const { RPCDaemon } = require('@arqma/arqma-rpc');
const startTelegram = require('./handlers/telegramHandler');
const startDiscord = require('./handlers/discordHandler');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;

if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !ALERT_USER_ID) {
  console.error("Missing required environment variables! (TELEGRAM_TOKEN, DISCORD_TOKEN, ALERT_USER_ID, DISCORD_ALERT_CHANNEL_ID)");
  process.exit(1);
}

const daemonClient = RPCDaemon.createDaemonClient({ url: 'http://127.0.0.1:19994' });
daemonClient.sslRejectUnauthorized(false);

let telegramBot = startTelegram(TELEGRAM_TOKEN, ALERT_USER_ID, daemonClient);
// Now, telegramBot is ready, pass it to Discord!
let discordBot = startDiscord(DISCORD_TOKEN, daemonClient, telegramBot, ALERT_USER_ID);
