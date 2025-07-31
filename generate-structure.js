const fs = require('fs');
const path = require('path');

// --- FOLDERS ---
const folders = [
  'handlers',
  'commands',
  'fetch',
  'alerts',
  'config',
  'utils',
  '__tests__'
];
folders.forEach(folder => { if (!fs.existsSync(folder)) fs.mkdirSync(folder); });

// ---- COMMANDS ----
const commandFiles = [
  ['helpme.js', `
module.exports = (platform) => {
  return platform === "discord" ? \`
📜 **Available Commands**

📊 !network - Get Arqma network statistics
🔗 !links - Display important Arqma-related links
⛏️ !pools - Display Arqma mining pools with hashrates
🛠️ !daemon_info - Get detailed Arqma daemon information
❓ !helpme - Show this help message
🖥️ !nodes - Get information from the Arqma nodes
\` : \`
📜 *Available Commands*

📊 /network \\\\- Get Arqma network statistics
🔗 /links \\\\- Display important Arqma\\\\-related links
⛏️ /pools \\\\- Display Arqma mining pools with hashrates
🛠️ /daemon\\\\_info \\\\- Get detailed Arqma daemon information
❓ /helpme \\\\- Show this help message
🖥️ /nodes \\\\- Get information from the Arqma nodes
\`;
};
`.trim()],
  ['links.js', `
module.exports = () => \`
🔗 **Important Links**

🌐 [ArQmA website](https://arqma.com/)
📂 [Github](https://github.com/arqma)
📖 [Documentation](https://github.com/arqma/arqma/wiki/)
🖥️ [GUI Wallet](https://github.com/arqma/arqma-electron-wallet/releases/)
📝 [Paper Wallet](https://generate.arqma.com/)
⛏️ [Pool stats](https://miningpoolstats.stream/arqma)
💬 [Telegram](https://telegram.arqma.com/)
🎮 [Discord](https://chat.arqma.com/)
\`;
`.trim()],
  ['pools.js', `
const fetchPoolsData = require('../fetch/fetchPoolsData');
module.exports = async () => {
  return await fetchPoolsData();
};
`.trim()],
  ['daemon_info.js', `
const fetchDaemonInfo = require('../fetch/fetchDaemonInfo');
module.exports = async (daemonClient) => {
  return await fetchDaemonInfo(daemonClient);
};
`.trim()],
  ['network.js', `
const fetchNetworkInfo = require('../fetch/fetchNetworkInfo');
const fetchEmissionData = require('../fetch/fetchEmissionData');
const fetchArqPrice = require('../fetch/fetchArqPrice');
const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const fetchServiceNodeData = require('../fetch/fetchServiceNodeData');
const formatNetworkStats = require('../utils/formatNetworkStats');

module.exports = async () => {
  const networkData = await fetchNetworkInfo();
  const emissionData = await fetchEmissionData();
  const arqPrice = await fetchArqPrice();
  const btcToUsd = await fetchBtcToUsd();
  const { activeNodes, awaitingNodes } = await fetchServiceNodeData();

  return formatNetworkStats({
      networkData,
      emissionData,
      arqPrice,
      btcToUsd,
      activeNodes,
      awaitingNodes
  }) || "Failed to fetch network data.";
};
`.trim()],
  ['nodes.js', `
const axios = require('axios');
const nodeList = require('../config/nodeList');
module.exports = async () => {
  const pingResults = await Promise.all(nodeList.map(async (node) => {
      try {
          const res = await axios.get(node.url, { timeout: 5000 });
          const data = res.data;
          let status, desc;
          if (data.target_height && data.target_height > 0) {
              const diff = Math.abs(data.target_height - data.height);
              if (diff > 2) {
                  status = "SYNCING ⏳";
                  desc = \`Target Height: \${data.target_height}, Height: \${data.height}\`;
              } else {
                  status = "FULLY SYNCED ✅";
                  desc = \`Height: \${data.height}\`;
              }
          } else if (data.height) {
              status = "FULLY SYNCED ✅";
              desc = \`Height: \${data.height}\`;
          } else {
              status = "UNKNOWN";
              desc = "No data";
          }
          return \`\${node.name} : ✅ ONLINE | \${desc} (\${status})\`;
      } catch (e) {
          return \`\${node.name} : ❌ OFFLINE\`;
      }
  }));
  return pingResults.join('\\n');
};
`.trim()]
];
commandFiles.forEach(([name, content]) =>
  fs.writeFileSync(path.join('commands', name), content.trim(), {flag: 'w'})
);

// ---- FETCH ----
const fetchFiles = [
  ['fetchArqPrice.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
        if (!response.data || !response.data.price || !response.data.volume) return null;
        const priceBtc = parseFloat(response.data.price).toFixed(8);
        const priceSat = Math.round(priceBtc * 100_000_000);
        const volumeBtc = parseFloat(response.data.volume);
        return { priceBtc, priceSat, volumeBtc };
    } catch (error) {
        console.error("Error fetching ARQ price:", error);
        return null;
    }
};
`.trim()],
  ['fetchBtcToUsd.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        return parseFloat(response.data.price);
    } catch (error) {
        console.error("Error fetching BTC-to-USD rate from Binance:", error);
        return null;
    }
};
`.trim()],
  ['fetchEmissionData.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/emission');
        const emission = response.data && response.data.data && response.data.data.coinbase
            ? Math.floor(response.data.data.coinbase / 100_000)
            : null;
        return { emission: emission ? emission.toString().slice(0, 8) : null };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return { emission: null };
    }
};
`.trim()],
  ['fetchNetworkInfo.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/networkinfo');
        const data = response.data && response.data.data;
        if (!data) return null;
        return {
            height: data.height ?? null,
            hashrate: data.hash_rate ? (data.hash_rate / 1_000_000).toFixed(2) : null,
            difficulty: data.difficulty ?? null
        };
    } catch (error) {
        console.error("Error fetching network info:", error);
        return null;
    }
};
`.trim()],
  ['fetchPoolsData.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://miningpoolstats.stream/arqma');
        const tMatch = response.data.match(/var last_time = "([^"]+)"/);

        if (!tMatch) return "Failed to fetch pool data.";

        const t = tMatch[1];
        const poolsQueryUrl = \`https://data.miningpoolstats.stream/data/arqma.js?t=\${t}\`;
        const poolsQuery = await axios.get(poolsQueryUrl);
        const poolsInfo = poolsQuery.data.data || [];

        const sortedPools = poolsInfo.sort((a, b) => b.hashrate - a.hashrate);
        let totalHashrate = 0;
        const poolLines = sortedPools.map(pool => {
            const name = pool.pool_id || "Unknown Pool";
            const hashrate = pool.hashrate || 0;
            totalHashrate += hashrate;
            return hashrate >= 1_000_000
                ? \`⛏️ \${name}: \${(hashrate / 1_000_000).toFixed(2)} MH/s\`
                : hashrate >= 1_000
                ? \`⛏️ \${name}: \${(hashrate / 1_000).toFixed(2)} KH/s\`
                : \`⛏️ \${name}: \${hashrate} H/s\`;
        }).join('\\n');

        return \`🌐 Total Pool Hashrate: \${(totalHashrate / 1_000_000).toFixed(2)} MH/s\\n\\n\${poolLines}\`;
    } catch (error) {
        console.error("Error fetching pool data:", error);
        return "Failed to fetch pool data.";
    }
};
`.trim()],
  ['fetchServiceNodeData.js', `
const axios = require('axios');
const cheerio = require('cheerio');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/service_nodes');
        const $ = cheerio.load(response.data);
        const activeNodesText = $('body > div:nth-child(3) > h2:nth-child(4)').text().trim();
        const activeNodes = parseInt(activeNodesText.replace(/\\D/g, '')) || null;
        const awaitingNodesText = $('#service-nodes-awaiting > span:nth-child(1)').text().trim();
        const awaitingNodes = parseInt(awaitingNodesText.replace(/\\D/g, '')) || null;
        return { activeNodes, awaitingNodes };
    } catch (error) {
        console.error("Error fetching service node data:", error);
        return { activeNodes: null, awaitingNodes: null };
    }
};
`.trim()]
];

// --- fetchDaemonInfo.js ---
fs.writeFileSync('fetch/fetchDaemonInfo.js', `
module.exports = async (daemonClient) => {
  try {
    const response = await daemonClient.getInfo();
    const { height, top_block_hash, difficulty, target, version, database_size, incoming_connections_count, outgoing_connections_count } = response;
    const hashrate = (difficulty / target / 1_000_000).toFixed(2);
    const dbSizeGB = (database_size / (1024 ** 3)).toFixed(2);
    const peers = (incoming_connections_count || 0) + (outgoing_connections_count || 0);
    return \`
🛠️ **Daemon Info**

💻 **Network Hashrate**: \${hashrate} MH/s
📊 **Height**: \${height}
🔗 **Top Block Hash**: [\${top_block_hash}](https://explorer.arqma.com/search?value=\${top_block_hash})
🔄 **Version**: \${version}
💾 **Database Size**: \${dbSizeGB} GB
📡 **Peers Connected**: \${peers}
    \`;
  } catch (error) {
    console.error("Error fetching daemon info:", error);
    return "Failed to fetch daemon information.";
  }
};
`.trim(), {flag: 'w'});

fetchFiles.forEach(([name, content]) => {
  if(name !== 'fetchDaemonInfo.js') fs.writeFileSync(path.join('fetch', name), content.trim(), {flag: 'w'})
});

// ---- CONFIG ----
fs.writeFileSync('config/nodeList.js', `
module.exports = [
    { name: 'Node1', url: 'http://node1.arqma.com:19994/get_info' },
    { name: 'Node2', url: 'http://node2.arqma.com:19994/get_info' },
    { name: 'Node3', url: 'http://node3.arqma.com:19994/get_info' },
    { name: 'Node4', url: 'http://node4.arqma.com:19994/get_info' },
    { name: 'SNNAT', url: 'http://192.168.10.200:49994/get_info' },
    { name: 'Pool', url: 'http://127.0.0.1:19998/get_info' }
];
`.trim(), {flag: 'w'});

// ---- UTILS ----
fs.writeFileSync('utils/formatNetworkStats.js', `
module.exports = ({
  networkData,
  emissionData,
  arqPrice,
  btcToUsd,
  activeNodes,
  awaitingNodes
}) => {
  // Fallbacks
  const n = networkData || {};
  const e = emissionData || {};
  const price = arqPrice || {};
  const btc = btcToUsd;

  // Format fallback helper
  const missing = "Data unavailable";

  let message = \`
🔗 Arqma Network Stats

📊 Network Height: \${n.height ?? missing}
💻 Network Hashrate: \${n.hashrate ?? missing}\${n.hashrate ? " MH/s" : ""}
⚙️ Network Difficulty: \${n.difficulty ?? missing}
🪙 Total Emission (Coinbase): \${e.emission ?? missing} ARQ
\`;

  // Price and volume
  if (arqPrice && price.priceBtc && price.priceSat && price.volumeBtc && btc) {
    const volumeUsd = (price.volumeBtc * btc).toFixed(2);
    const volumeArq = (price.volumeBtc / price.priceBtc).toFixed(2);
    message += \`
💰 TO Price: \${price.priceBtc} BTC (\${price.priceSat} sat)
💰 TO 24h Volume: \${volumeArq} ARQ ($\${volumeUsd} USD)
\`;
  } else {
    message += \`
💰 TO Price: \${missing}
💰 TO 24h Volume: \${missing}
\`;
  }

  // BTC price
  message += \`
💰 BTC Price: $\${btc ? btc.toFixed(2) : missing} USD
🌐 Active Service Nodes: \${activeNodes ?? missing} nodes
🌐 Service Nodes Awaiting Contributions: \${awaitingNodes ?? missing} nodes
\`;

  return message.trim();
};
`.trim(), {flag: 'w'});

// ---- ALERTS ----
fs.writeFileSync('alerts/nodeAlerter.js', `
const axios = require('axios');
require('dotenv').config();
const DISCORD_ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;

// Each item: { offline: false, behind: false, offlineCount: 0 }
module.exports = async (nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot) => {
  const pingResults = await Promise.all(nodeList.map(async (node) => {
    try {
      const res = await axios.get(node.url, { timeout: 5000 });
      const data = res.data;
      return { online: true, height: data.height || 0, target_height: data.target_height || 0, node };
    } catch (e) {
      return { online: false, height: null, target_height: null, node };
    }
  }));
  const onlineNodes = pingResults.filter(r => r.online);
  const maxHeight = onlineNodes.length ? Math.max(...onlineNodes.map(r => r.height || 0)) : 0;

  for (let i = 0; i < pingResults.length; i++) {
    const r = pingResults[i];
    let prevState = nodeAlertState[i];
    if (typeof prevState.offlineCount !== "number") prevState.offlineCount = 0;

    async function sendAlert(alertText) {
      if (telegramBot) await telegramBot.sendMessage(ALERT_USER_ID, alertText);
      if (discordBot && discordBot.channels && discordBot.channels.cache && DISCORD_ALERT_CHANNEL_ID) {
        const channel = discordBot.channels.cache.get(DISCORD_ALERT_CHANNEL_ID);
        if (channel) channel.send(alertText);
      }
    }

    // OFFLINE ALERT: 4 minutes (4 cycles, if 1 min interval)
    if (!r.online) {
      prevState.offlineCount++;
      if (!prevState.offline && prevState.offlineCount >= 4) {
        await sendAlert(\`🚨 [NODE ALERT]\\n\${r.node.name} is OFFLINE for \${prevState.offlineCount} minutes!\`);
        prevState.offline = true;
      }
      prevState.behind = false;
      continue;
    } else {
      if (prevState.offline) {
        await sendAlert(\`✅ [NODE ALERT]\\n\${r.node.name} is back ONLINE!\`);
        prevState.offline = false;
      }
      prevState.offlineCount = 0;
    }

    // OUT OF SYNC ALERT: only if > 4 blocks behind
    if (r.height && maxHeight && (maxHeight - r.height > 4)) {
      if (!prevState.behind) {
        await sendAlert(\`🚨 [NODE ALERT]\\n\${r.node.name} is OUT OF SYNC by \${maxHeight - r.height} blocks (Current: \${r.height}, Highest: \${maxHeight})!\`);
        prevState.behind = true;
      }
    } else {
      if (prevState.behind) {
        await sendAlert(\`✅ [NODE ALERT]\\n\${r.node.name} is now back IN SYNC. (Height: \${r.height})\`);
        prevState.behind = false;
      }
    }
  }
};
`.trim(), {flag: 'w'});

// ---- HANDLERS ----
fs.writeFileSync('handlers/telegramHandler.js', `
const TelegramBot = require('node-telegram-bot-api');
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const pools = require('../commands/pools');
const daemon_info = require('../commands/daemon_info');
const network = require('../commands/network');
const nodes = require('../commands/nodes');

module.exports = (TELEGRAM_TOKEN, ALERT_USER_ID, daemonClient) => {
  const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  telegramBot.onText(/\\/helpme/, msg => telegramBot.sendMessage(msg.chat.id, helpme("telegram"), { parse_mode: 'MarkdownV2' }));
  telegramBot.onText(/\\/links/, msg => telegramBot.sendMessage(msg.chat.id, links(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\\/pools/, async msg => telegramBot.sendMessage(msg.chat.id, await pools(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\\/daemon_info/, async msg => telegramBot.sendMessage(msg.chat.id, await daemon_info(daemonClient), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\\/network/, async msg => telegramBot.sendMessage(msg.chat.id, await network(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\\/nodes/, async msg => telegramBot.sendMessage(msg.chat.id, await nodes(), { parse_mode: 'Markdown' }));

  console.log("Telegram bot is ready!");
  return telegramBot;
};
`.trim(), {flag: 'w'});

fs.writeFileSync('handlers/discordHandler.js', `
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
`.trim(), {flag: 'w'});

// ---- BOT.JS ----
fs.writeFileSync('bot.js', `
require('dotenv').config();
const { RPCDaemon } = require('@arqma/arqma-rpc');
const startTelegram = require('./handlers/telegramHandler');
const startDiscord = require('./handlers/discordHandler');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;

if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !ALERT_USER_ID || !process.env.DISCORD_ALERT_CHANNEL_ID) {
  console.error("Missing required environment variables! (TELEGRAM_TOKEN, DISCORD_TOKEN, ALERT_USER_ID, DISCORD_ALERT_CHANNEL_ID)");
  process.exit(1);
}

const daemonClient = RPCDaemon.createDaemonClient({ url: 'http://127.0.0.1:19994' });
daemonClient.sslRejectUnauthorized(false);

let telegramBot = startTelegram(TELEGRAM_TOKEN, ALERT_USER_ID, daemonClient);
let discordBot = startDiscord(DISCORD_TOKEN, daemonClient, telegramBot, ALERT_USER_ID);
`.trim(), {flag: 'w'});

// ---- .env ----
fs.writeFileSync('.env', `
TELEGRAM_TOKEN=YOUR_TELEGRAM_TOKEN
DISCORD_TOKEN=YOUR_DISCORD_TOKEN
ALERT_USER_ID=YOUR_TELEGRAM_USER_ID
DISCORD_ALERT_CHANNEL_ID=YOUR_DISCORD_CHANNEL_ID
`.trim(), {flag: 'w'});

// ---- package.json ----
fs.writeFileSync('package.json', `
{
  "name": "arqma-bot",
  "version": "1.0.0",
  "description": "Discord & Telegram bot for Arqma network.",
  "main": "bot.js",
  "type": "commonjs",
  "scripts": {
    "start": "node bot.js",
    "test": "jest"
  },
  "dependencies": {
    "@arqma/arqma-rpc": "^0.2.3",
    "axios": "^1.7.7",
    "cheerio": "^1.1.0",
    "discord.js": "^14.16.3",
    "dotenv": "^16.4.5",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
`.trim(), {flag: 'w'});

// ---- README.md ----
fs.writeFileSync('README.md', `
# ArQmA Network Bot

A multi-platform bot for **ArQmA network monitoring** and notifications.  
Supports both **Telegram** and **Discord** for commands and node alerts.

---

## Features

- ⚡ Real-time **node status monitoring** (offline, out-of-sync, etc.)
- 📊 Get **network, pool, and daemon** stats via chat commands
- 🔔 Sends alerts to **Telegram user** (admin) and **Discord channel** (configurable)
- Same codebase runs both bots and shares logic

---

## Quickstart

### 1. Generate files

Save the generator script as \`generate-structure.js\` and run:

\`\`\`bash
node generate-structure.js
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure .env

Edit your \`.env\` file with **your real tokens/IDs**:

\`\`\`
TELEGRAM_TOKEN=...        # Get from BotFather
DISCORD_TOKEN=...         # Get from Discord Developer Portal
ALERT_USER_ID=...         # Your Telegram numeric user ID
DISCORD_ALERT_CHANNEL_ID=... # Discord channel ID for alerts
\`\`\`

### 4. Run the bot

\`\`\`bash
npm start
\`\`\`

### 5. Run the tests

\`\`\`bash
npm test
\`\`\`

---

## Bot Commands

### Telegram

- \`/helpme\` — show all commands
- \`/links\` — important links
- \`/pools\` — mining pool stats
- \`/daemon_info\` — daemon info
- \`/network\` — network stats
- \`/nodes\` — node status

### Discord

- \`!helpme\` — show all commands
- \`!links\` — important links
- \`!pools\` — mining pool stats
- \`!daemon_info\` — daemon info
- \`!network\` — network stats
- \`!nodes\` — node status

---

## Alerts

- Alerts are sent to **Telegram** user (\`ALERT_USER_ID\`) and **Discord** channel (\`DISCORD_ALERT_CHANNEL_ID\`) if a node is offline (after 4 minutes), out-of-sync (>4 blocks), or back online.

---

## Structure

- \`handlers/\` — bot integrations (telegram/discord)
- \`commands/\` — logic for each command
- \`fetch/\` — data fetching from APIs
- \`alerts/\` — alert logic
- \`config/\` — node list config
- \`utils/\` — helper functions
- \`__tests__/\` — unit tests

---

## License

MIT
`.trim(), {flag: 'w'});

// ---- jest.config.js ----
if (!fs.existsSync('jest.config.js')) {
  fs.writeFileSync('jest.config.js', `
module.exports = {
  testEnvironment: "node"
};
  `.trim(), {flag: 'w'});
}

console.log('✅ All files generated!\n- Run npm install\n- Fill in .env\n- npm start\n- npm test');
