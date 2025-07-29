// Main bot entry point
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const { RPCDaemon } = require('@arqma/arqma-rpc');
const nodeList = require('./config/nodeList');
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;
if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !ALERT_USER_ID) {
    console.error("Missing required environment variables! (TELEGRAM_TOKEN, DISCORD_TOKEN, ALERT_USER_ID)");
    process.exit(1);
}
let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false }));
let telegramBot;
try {
    telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
    console.log("Telegram bot is ready!");
} catch (e) {
    console.error("Could not start Telegram bot:", e);
    process.exit(1);
}
const discordBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});
const daemonClient = RPCDaemon.createDaemonClient({ url: 'http://127.0.0.1:19994' });
daemonClient.sslRejectUnauthorized(false);
const importantLinks = `
🔗 **Important Links**

🌐 [ArQmA website](https://arqma.com/)
📂 [Github](https://github.com/arqma)
📖 [Documentation](https://github.com/arqma/arqma/wiki/)
🖥️ [GUI Wallet](https://github.com/arqma/arqma-electron-wallet/releases/)
📝 [Paper Wallet](https://generate.arqma.com/)
⛏️ [Pool stats](https://miningpoolstats.stream/arqma)
💬 [Telegram](https://telegram.arqma.com/)
🎮 [Discord](https://chat.arqma.com/)
`;
const telegramCommands = `
📜 *Available Commands*

📊 /network \\- Get Arqma network statistics
🔗 /links \\- Display important Arqma\\-related links
⛏️ /pools \\- Display Arqma mining pools with hashrates
🛠️ /daemon\\_info \\- Get detailed Arqma daemon information
❓ /helpme \\- Show this help message
🖥️ /nodes \\- Get information from the Arqma nodes
`;
const discordCommands = `
📜 **Available Commands**

📊 !network - Get Arqma network statistics
🔗 !links - Display important Arqma-related links
⛏️ !pools - Display Arqma mining pools with hashrates
🛠️ !daemon_info - Get detailed Arqma daemon information
❓ !helpme - Show this help message
🖥️ !nodes - Get information from the Arqma nodes
`;
const helpme = require('./commands/helpme');
const links = require('./commands/links');
const pools = require('./commands/pools');
const daemon_info = require('./commands/daemon_info');
const network = require('./commands/network');
const nodes = require('./commands/nodes');
const nodeAlerter = require('./alerts/nodeAlerter');
setInterval(() => nodeAlerter(nodeList, nodeAlertState, telegramBot, ALERT_USER_ID), 60 * 1000);
telegramBot.onText(/\/helpme/, msg => helpme(telegramBot, msg, telegramCommands));
telegramBot.onText(/\/links/, msg => links(telegramBot, msg, importantLinks));
telegramBot.onText(/\/pools/, msg => pools(telegramBot, msg));
telegramBot.onText(/\/daemon_info/, msg => daemon_info(telegramBot, msg, daemonClient));
telegramBot.onText(/\/network/, msg => network(telegramBot, msg));
telegramBot.onText(/\/nodes/, msg => nodes(telegramBot, msg));
const fetchPoolsData = require('./fetch/fetchPoolsData');
const fetchDaemonInfo = require('./fetch/fetchDaemonInfo');
const fetchNetworkInfo = require('./fetch/fetchNetworkInfo');
const fetchEmissionData = require('./fetch/fetchEmissionData');
const fetchArqPrice = require('./fetch/fetchArqPrice');
const fetchBtcToUsd = require('./fetch/fetchBtcToUsd');
const fetchServiceNodeData = require('./fetch/fetchServiceNodeData');
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();
    if (content === '!helpme') {
        message.channel.send(discordCommands);
    } else if (content === '!links') {
        message.channel.send(importantLinks);
    } else if (content === '!pools') {
        const pools = await fetchPoolsData();
        message.channel.send(pools || "Failed to fetch pool data.");
    } else if (content === '!daemon_info') {
        const daemonInfo = await fetchDaemonInfo(daemonClient);
        message.channel.send(daemonInfo);
    } else if (content === '!network') {
        const networkData = await fetchNetworkInfo();
        const emissionData = await fetchEmissionData();
        const arqPrice = await fetchArqPrice();
        const btcToUsd = await fetchBtcToUsd();
        const { activeNodes, awaitingNodes } = await fetchServiceNodeData();
        if (networkData && emissionData && arqPrice && btcToUsd) {
            const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
            const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
            const msgText = `
🔗 **Arqma Network Stats**

📊 **Network Height**: ${networkData.height}
💻 **Network Hashrate**: ${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: ${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: ${emissionData.emission} ARQ
💰 **TO Price**: ${arqPrice.priceBtc} BTC (${arqPrice.priceSat} sat)
💰 **TO 24h Volume**: ${volumeArq} ARQ ($${volumeUsd} USD)
💰 **BTC Price**: $${btcToUsd.toFixed(2)} USD
🌐 **Active Service Nodes**: ${activeNodes} nodes
🌐 **Service Nodes Awaiting Contributions**: ${awaitingNodes} nodes
            `;
            message.channel.send(msgText);
        } else {
            message.channel.send("Failed to fetch network data.");
        }
    } else if (content === '!nodes') {
        const axios = require('axios');
        const pingResults = await Promise.all(nodeList.map(async (node) => {
            try {
                const res = await axios.get(node.url, { timeout: 5000 });
                const data = res.data;
                let status, desc;
                if (data.target_height && data.target_height > 0) {
                    const diff = Math.abs(data.target_height - data.height);
                    if (diff > 2) {
                        status = "SYNCING ⏳";
                        desc = `Target Height: ${data.target_height}, Height: ${data.height}`;
                    } else {
                        status = "FULLY SYNCED ✅";
                        desc = `Height: ${data.height}`;
                    }
                } else if (data.height) {
                    status = "FULLY SYNCED ✅";
                    desc = `Height: ${data.height}`;
                } else {
                    status = "UNKNOWN";
                    desc = "No data";
                }
                return `${node.name} : ✅ ONLINE | ${desc} (${status})`;
            } catch (e) {
                return `${node.name} : ❌ OFFLINE`;
            }
        }));
        message.channel.send(pingResults.join('\n'));
    }
});
discordBot.login(DISCORD_TOKEN)
    .then(() => console.log("Discord bot is ready!"))
    .catch(err => console.error("Discord login failed:", err));