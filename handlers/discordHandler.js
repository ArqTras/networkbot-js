const { Client, GatewayIntentBits, Partials } = require('discord.js');
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const pools = require('../commands/pools');
const daemon_info = require('../commands/daemon_info');
const network = require('../commands/network');
const nodes = require('../commands/nodes');
const nodeAlerter = require('../alerts/nodeAlerter');
const nodeList = require('../config/nodeList');
const zmqdiag = require('../commands/zmqdiag');
const { isBlocked } = require('../utils/blocklist');
const { isRestricted } = require('../utils/restrictlist');

function formatRemaining(ms) { const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h + 'h ' + m + 'm ' + s + 's'; }

module.exports = (DISCORD_TOKEN, telegramBot, ALERT_USER_ID) => {
  const discordBot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel] });

  discordBot.once('ready', () => {
    let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false, offlineCount: 0 }));
    setInterval(() => nodeAlerter(nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot), 60 * 1000);
    console.log('Discord bot is ready!');
  });

  discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const blocked = isBlocked({ id: message.author?.id, username: message.author?.username });
    if (blocked) { try { await message.reply('⛔ You are blocked from using commands.'); } catch {} return; }
    const rest = isRestricted({ id: message.author?.id, username: message.author?.username });
    if (rest.restricted) { try { await message.reply('🚫 You are restricted from using commands for ' + formatRemaining(rest.remainingMs) + '.'); } catch {} return; }

    const content = (message.content || '').trim();
    const lc = content.toLowerCase();
    if (lc === '!helpme')           { message.channel.send(helpme('discord')); }
    else if (lc === '!links')       { message.channel.send(links()); }
    else if (lc === '!pools')       { message.channel.send(await pools()); }
    else if (lc === '!daemon_info') { message.channel.send(await daemon_info()); }
    else if (lc === '!network')     { message.channel.send(await network()); }
    else if (lc === '!nodes')       { message.channel.send(await nodes()); }
    else if (lc.indexOf('!zmqdiag ') === 0) {
      const name = content.slice('!zmqdiag '.length).trim();
      const resp = await zmqdiag({ name, ALERT_USER_ID, fromId: message.author?.id });
      message.channel.send(resp);
    }
  });

  discordBot.login(DISCORD_TOKEN).catch(err => console.error('Discord login failed:', err));
  return discordBot;
};
