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
const sn = require('../commands/sn');
const trade = require('../commands/trade');
const { isBlocked } = require('../utils/blocklist');
const { isRestricted } = require('../utils/restrictlist');

function formatRemaining(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return h + 'h ' + m + 'm ' + s + 's';
}

module.exports = (DISCORD_TOKEN, telegramBot, ALERT_USER_ID) => {
  const discordBot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel]
  });

  let readyFired = false;
  function onReadyGeneric() {
    if (readyFired) return;
    readyFired = true;
    let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false, offlineCount: 0 }));
    setInterval(() => nodeAlerter(nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot), 60 * 1000);
    console.log('Discord bot is ready!');
    
    // Service node monitor will be started from start.js after both bots are ready
    // to avoid duplicate monitoring
  }

  // Use clientReady (v15+) - also works in v14 as it's the new standard
  // Remove 'ready' to avoid deprecation warning
  discordBot.once('clientReady', onReadyGeneric);

  discordBot.on('messageCreate', async (message) => {
    if (!message || !message.author || message.author.bot) return;
    
    // Walidacja danych użytkownika
    const userId = message.author && message.author.id;
    const username = message.author && message.author.username;
    
    const blocked = isBlocked({ id: userId, username });
    if (blocked) { 
      try { await message.reply('⛔ You are blocked from using commands.'); } 
      catch (e) { 
        if (process.env.NODE_ENV === 'development') {
          console.error('Discord reply error:', e.message || e);
        }
      } 
      return; 
    }
    
    const rest = isRestricted({ id: userId, username });
    if (rest.restricted) { 
      try { 
        await message.reply('🚫 You are restricted from using commands for ' + formatRemaining(rest.remainingMs) + '.'); 
      } 
      catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Discord reply error:', e.message || e);
        }
      } 
      return; 
    }

    const content = (message.content || '').trim();
    if (!content) return;
    
    const lc = content.toLowerCase();
    
    // Bezpieczne wywołania komend z obsługą błędów
    try {
      if (lc === '!helpme')           { await message.channel.send(await helpme('discord')); }
      else if (lc === '!links')       { await message.channel.send(links()); }
      else if (lc === '!pools')       { await message.channel.send(await pools()); }
      else if (lc === '!daemon_info') { await message.channel.send(await daemon_info()); }
      else if (lc === '!network')     { await message.channel.send(await network()); }
      else if (lc === '!nodes')       { await message.channel.send(await nodes()); }
      else if (lc === '!sn')          { await message.channel.send(await sn()); }
      else if (lc === '!trade')       { await message.channel.send(await trade()); }
      else if (lc.indexOf('!zmqdiag ') === 0) {
        const name = content.slice('!zmqdiag '.length).trim();
        if (!name) {
          await message.channel.send('❌ Please provide a node name: !zmqdiag <NodeName>');
          return;
        }
        const resp = await zmqdiag({ name, ALERT_USER_ID, fromId: userId });
        await message.channel.send(resp);
      }
    } catch (e) {
      console.error('Discord command error:', e.message || e);
      try {
        await message.channel.send('❌ An error occurred while processing your command. Please try again later.');
      } catch {}
    }
  });

  discordBot.login(DISCORD_TOKEN).catch(err => console.error('Discord login failed:', err));
  return discordBot;
};
