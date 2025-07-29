const fs = require('fs');
const path = require('path');

const folders = [
  'handlers',
  'commands',
  'fetch',
  'alerts',
  'config',
  'utils',
  '__tests__'
];
folders.forEach(folder => {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);
});

// COMMANDS
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

// FETCHERS
const fetchFiles = [
  ['fetchArqPrice.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
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
  ['fetchDaemonInfo.js', `
module.exports = async (daemonClient) => {
    try {
        const response = await daemonClient.getInfo();
        const { height, top_block_hash, difficulty, target, version, database_size, tx_count } = response;
        const hashrate = (difficulty / target / 1_000_000).toFixed(2);
        const dbSizeGB = (database_size / (1024 ** 3)).toFixed(2);
        return \`
🛠️ **Daemon Info**

💻 **Network Hashrate**: \${hashrate} MH/s
📊 **Height**: \${height}
🔗 **Top Block Hash**: [\${top_block_hash}](https://explorer.arqma.com/search?value=\${top_block_hash})
🔄 **Version**: \${version}
💾 **Database Size**: \${dbSizeGB} GB
📡 **Peers Connected**: \${tx_count || 'N/A'}
        \`;
    } catch (error) {
        console.error("Error fetching daemon info:", error);
        return "Failed to fetch daemon information.";
    }
};
`.trim()],
  ['fetchEmissionData.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/emission');
        const emission = Math.floor(response.data.data.coinbase / 100_000);
        return { emission: emission.toString().slice(0, 8) };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return null;
    }
};
`.trim()],
  ['fetchNetworkInfo.js', `
const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/networkinfo');
        const data = response.data.data;
        return {
            height: data.height,
            hashrate: (data.hash_rate / 1_000_000).toFixed(2),
            difficulty: data.difficulty
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
        const activeNodes = parseInt(activeNodesText.replace(/\\D/g, ''));
        const awaitingNodesText = $('#service-nodes-awaiting > span:nth-child(1)').text().trim();
        const awaitingNodes = parseInt(awaitingNodesText.replace(/\\D/g, ''));
        return { activeNodes, awaitingNodes };
    } catch (error) {
        console.error("Error fetching service node data:", error);
        return { activeNodes: 0, awaitingNodes: 0 };
    }
};
`.trim()]
];
fetchFiles.forEach(([name, content]) =>
  fs.writeFileSync(path.join('fetch', name), content.trim(), {flag: 'w'})
);

// CONFIG
fs.writeFileSync('config/nodeList.js', `
module.exports = [
    { name: 'Node1', url: 'http://node1.arqma.com:19994/get_info' },
    { name: 'Node2', url: 'http://node2.arqma.com:19994/get_info' },
    { name: 'Node3', url: 'http://node3.arqma.com:19994/get_info' },
    { name: 'Node4', url: 'http://node4.arqma.com:19994/get_info' }
];
`.trim(), {flag: 'w'});

// UTILS
fs.writeFileSync('utils/formatNetworkStats.js', `
module.exports = ({
  networkData,
  emissionData,
  arqPrice,
  btcToUsd,
  activeNodes,
  awaitingNodes
}) => {
  if (!(networkData && emissionData && btcToUsd)) {
    return null; // Can't display the stats without these
  }

  let message = \`
🔗 **Arqma Network Stats**

📊 **Network Height**: \${networkData.height}
💻 **Network Hashrate**: \${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: \${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: \${emissionData.emission} ARQ
\`;

  if (arqPrice) {
    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
    message += \`
💰 **TO Price**: \${arqPrice.priceBtc} BTC (\${arqPrice.priceSat} sat)
💰 **TO 24h Volume**: \${volumeArq} ARQ ($\${volumeUsd} USD)
\`;
  } else {
    message += \`
💰 **TO Price**: _Data unavailable_
💰 **TO 24h Volume**: _Data unavailable_
\`;
  }

  message += \`
💰 **BTC Price**: $\${btcToUsd.toFixed(2)} USD
🌐 **Active Service Nodes**: \${activeNodes} nodes
🌐 **Service Nodes Awaiting Contributions**: \${awaitingNodes} nodes
\`;
  return message;
};
`.trim(), {flag: 'w'});

// ALERTS
fs.writeFileSync('alerts/nodeAlerter.js', `
const axios = require('axios');
require('dotenv').config();
const DISCORD_ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;

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
    const prevState = nodeAlertState[i];

    // Helper: alert to both platforms
    async function sendAlert(alertText) {
      if (telegramBot) {
        await telegramBot.sendMessage(ALERT_USER_ID, alertText);
      }
      if (discordBot && discordBot.channels && discordBot.channels.cache && DISCORD_ALERT_CHANNEL_ID) {
        const channel = discordBot.channels.cache.get(DISCORD_ALERT_CHANNEL_ID);
        if (channel) channel.send(alertText);
      }
    }

    // Offline
    if (!r.online) {
      if (!prevState.offline) {
        await sendAlert(\`🚨 [NODE ALERT]\\n\${r.node.name} is OFFLINE!\`);
        prevState.offline = true;
      }
      prevState.behind = false;
      continue;
    } else {
      if (prevState.offline) {
        await sendAlert(\`✅ [NODE ALERT]\\n\${r.node.name} is back ONLINE!\`);
        prevState.offline = false;
      }
    }
    // Behind
    if (r.height && maxHeight && (maxHeight - r.height > 2)) {
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

// HANDLERS
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
    let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false }));
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

// BOT.JS
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

// ENV, PACKAGE, README
fs.writeFileSync('.env', `
TELEGRAM_TOKEN=YOUR_TELEGRAM_TOKEN
DISCORD_TOKEN=YOUR_DISCORD_TOKEN
ALERT_USER_ID=YOUR_TELEGRAM_USER_ID
DISCORD_ALERT_CHANNEL_ID=YOUR_DISCORD_CHANNEL_ID
`.trim(), {flag: 'w'});

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

- Alerts are sent to **Telegram** user (\`ALERT_USER_ID\`) and **Discord** channel (\`DISCORD_ALERT_CHANNEL_ID\`) if a node is offline, out-of-sync, or back online.

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

// UNIT TESTS
fs.writeFileSync('__tests__/formatNetworkStats.test.js', `
const formatNetworkStats = require('../utils/formatNetworkStats');

describe('formatNetworkStats', () => {
  it('should return null if required fields missing', () => {
    expect(formatNetworkStats({})).toBeNull();
    expect(formatNetworkStats({networkData: {}})).toBeNull();
  });

  it('should render message with arqPrice', () => {
    const result = formatNetworkStats({
      networkData: {height: 1234, hashrate: 0.45, difficulty: 12345},
      emissionData: {emission: '1000000'},
      arqPrice: {priceBtc: '0.00001234', priceSat: 1234, volumeBtc: 10},
      btcToUsd: 60000,
      activeNodes: 12,
      awaitingNodes: 2
    });
    expect(result).toMatch(/\\*\\*Network Height\\*\\*: 1234/);
    expect(result).toMatch(/\\*\\*TO Price\\*\\*: 0\\.00001234 BTC/);
    expect(result).toMatch(/\\*\\*BTC Price\\*\\*: \\$60000/);
    expect(result).toMatch(/\\*\\*Active Service Nodes\\*\\*: 12/);
    expect(result).not.toMatch(/Data unavailable/);
  });

  it('should handle missing arqPrice gracefully', () => {
    const result = formatNetworkStats({
      networkData: {height: 1000, hashrate: 0.22, difficulty: 11111},
      emissionData: {emission: '888888'},
      arqPrice: null,
      btcToUsd: 50000,
      activeNodes: 5,
      awaitingNodes: 1
    });
    expect(result).toMatch(/\\*\\*TO Price\\*\\*: _Data unavailable_/);
    expect(result).toMatch(/\\*\\*TO 24h Volume\\*\\*: _Data unavailable_/);
  });
});
`.trim(), {flag: 'w'});

fs.writeFileSync('__tests__/fetchArqPrice.test.js', `
const fetchArqPrice = require('../fetch/fetchArqPrice');
const axios = require('axios');

jest.mock('axios');

describe('fetchArqPrice', () => {
  it('returns correct price object', async () => {
    axios.get.mockResolvedValue({ data: { price: "0.00001", volume: "100" } });
    const result = await fetchArqPrice();
    expect(result).toEqual({ priceBtc: "0.00001000", priceSat: 1000, volumeBtc: 100 });
  });

  it('returns null on error', async () => {
    axios.get.mockRejectedValue(new Error("fail"));
    const result = await fetchArqPrice();
    expect(result).toBeNull();
  });
});
`.trim(), {flag: 'w'});

fs.writeFileSync('__tests__/fetchBtcToUsd.test.js', `
const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const axios = require('axios');

jest.mock('axios');

describe('fetchBtcToUsd', () => {
  it('should return parsed price', async () => {
    axios.get.mockResolvedValue({ data: { price: "59999.99" } });
    const result = await fetchBtcToUsd();
    expect(result).toBeCloseTo(59999.99);
  });

  it('should return null on error', async () => {
    axios.get.mockRejectedValue(new Error("fail"));
    const result = await fetchBtcToUsd();
    expect(result).toBeNull();
  });
});
`.trim(), {flag: 'w'});

fs.writeFileSync('__tests__/nodeAlerter.test.js', `
const nodeAlerter = require('../alerts/nodeAlerter');
const nodeList = [
  { name: 'Node1', url: 'http://fakeurl.com/1' }
];

jest.mock('axios');

describe('nodeAlerter', () => {
  it('sends offline and online alerts (simulate)', async () => {
    const axios = require('axios');
    // 1st call: node is offline, 2nd call: node is online and in sync
    axios.get
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ data: { height: 100, target_height: 100 } });

    let messages = [];
    const fakeTelegram = { sendMessage: jest.fn((id, msg) => messages.push(['tg', msg])) };
    const fakeDiscord = { channels: { cache: new Map([["cid", { send: msg => messages.push(['ds', msg]) }]]) } };

    let state = [{ offline: false, behind: false }];
    process.env.DISCORD_ALERT_CHANNEL_ID = "cid";

    // 1st: node offline
    await nodeAlerter(nodeList, state, fakeTelegram, 42, fakeDiscord);
    expect(messages.some(([type, msg]) => /OFFLINE/.test(msg))).toBeTruthy();

    // 2nd: node back online
    await nodeAlerter(nodeList, state, fakeTelegram, 42, fakeDiscord);
    expect(messages.some(([type, msg]) => /back ONLINE/.test(msg))).toBeTruthy();
  });
});
`.trim(), {flag: 'w'});

fs.writeFileSync('__tests__/nodes.test.js', `
const nodes = require('../commands/nodes');
const axios = require('axios');
const nodeList = require('../config/nodeList');

jest.mock('axios');

describe('nodes command', () => {
  it('shows online, syncing, and offline', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { height: 100, target_height: 102 } }) // syncing
      .mockResolvedValueOnce({ data: { height: 105 } }) // fully synced
      .mockRejectedValueOnce(new Error("fail")) // offline
      .mockResolvedValueOnce({ data: { height: 110, target_height: 110 } }); // fully synced

    const result = await nodes();
    expect(result).toMatch(/Node1 : ✅ ONLINE/);
    expect(result).toMatch(/SYNCING|FULLY SYNCED/);
    expect(result).toMatch(/Node3 : ❌ OFFLINE/);
  });
});
`.trim(), {flag: 'w'});

// JEST CONFIG
if (!fs.existsSync('jest.config.js')) {
  fs.writeFileSync('jest.config.js', `
module.exports = {
  testEnvironment: "node"
};
  `.trim(), {flag: 'w'});
}

console.log('✅ All files, handlers, code, .env, README.md, and matching tests generated!\n- Run npm install\n- Fill in .env\n- npm start\n- npm test');
