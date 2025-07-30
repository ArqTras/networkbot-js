const { Client, GatewayIntentBits, Partials } = require('discord.js');
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const pools = require('../commands/pools');
const daemon_info = require('../commands/daemon_info');
const network = require('../commands/network');
const nodes = require('../commands/nodes');
const nodeAlerter = require('../alerts/nodeAlerter');
const nodeList = require('../config/nodeList');

module.exports = (DISCORD_TOKEN, daemonClient, telegramBot, ALERT_USER_ID) => {
  const discordBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
  });

  discordBot.once('ready', () => {
    let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false, offlineCount: 0 }));
    setInterval(() => nodeAlerter(nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot), 60 * 1000);
    console.log("Discord bot is ready!");
  });

  discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    if (content === '!helpme') {
      message.channel.send(helpme("discord"));
    } else if (content === '!links') {
      message.channel.send(links());
    } else if (content === '!pools') {
      message.channel.send(await pools());
    } else if (content === '!daemon_info') {
      message.channel.send(await daemon_info(daemonClient));
    } else if (content === '!network') {
      message.channel.send(await network());
    } else if (content === '!nodes') {
      message.channel.send(await nodes());
    }
  });

  discordBot.login(DISCORD_TOKEN).catch(err => console.error("Discord login failed:", err));
  return discordBot;
};