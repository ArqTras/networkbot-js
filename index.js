require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const { RPCDaemon } = require('@arqma/arqma-rpc');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Initialize Telegram Bot
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Initialize Discord Bot
const discordBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// Initialize RPC Daemon client
const daemonClient = RPCDaemon.createDaemonClient({ url: 'http://127.0.0.1:19994' });
daemonClient.sslRejectUnauthorized(false);

// Define important links and commands
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
`;

const discordCommands = `
📜 **Available Commands**

📊 !network - Get Arqma network statistics
🔗 !links - Display important Arqma-related links
⛏️ !pools - Display Arqma mining pools with hashrates
🛠️ !daemon_info - Get detailed Arqma daemon information
❓ !helpme - Show this help message
`;

// Fetch BTC-to-USD price
const fetchBtcToUsd = async () => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        return parseFloat(response.data.price);
    } catch (error) {
        console.error("Error fetching BTC-to-USD rate from Binance:", error);
        return null;
    }
};

// Fetch ARQ-to-BTC price and volume
const fetchArqPrice = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
        const priceBtc = parseFloat(response.data.price).toFixed(8);
        const priceSat = Math.round(priceBtc * 100_000_000);
        const volumeBtc = parseFloat(response.data.volume); // Volume is in BTC
        return { priceBtc, priceSat, volumeBtc };
    } catch (error) {
        console.error("Error fetching ARQ price:", error);
        return null;
    }
};

// Fetch network information
const fetchNetworkInfo = async () => {
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

// Fetch emission data
const fetchEmissionData = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/api/emission');
        const emission = Math.floor(response.data.data.coinbase / 100_000);
        return { emission: emission.toString().slice(0, 8) };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return null;
    }
};

// Fetch active service nodes and service nodes awaiting contributions
const fetchServiceNodeData = async () => {
    try {
        const response = await axios.get('https://explorer.arqma.com/service_nodes');
        const $ = cheerio.load(response.data);

        // Active Service Nodes
        const activeNodesText = $('body > div:nth-child(3) > h2:nth-child(4)').text().trim();
        const activeNodes = parseInt(activeNodesText.replace(/\D/g, '')); // Extract number

        // Service Nodes Awaiting Contributions
        const awaitingNodesText = $('#service-nodes-awaiting > span:nth-child(1)').text().trim(); // Extract number from span
        const awaitingNodes = parseInt(awaitingNodesText.replace(/\D/g, '')); // Extract number

        return { activeNodes, awaitingNodes };
    } catch (error) {
        console.error("Error fetching service node data:", error);
        return { activeNodes: 0, awaitingNodes: 0 };
    }
};

// Fetch pools data
const fetchPoolsData = async () => {
    try {
        const response = await axios.get('https://miningpoolstats.stream/arqma');
        const tMatch = response.data.match(/var last_time = "([^"]+)"/);

        if (!tMatch) {
            console.error("Failed to extract 't' parameter.");
            return "Failed to fetch pool data.";
        }

        const t = tMatch[1];
        const poolsQueryUrl = `https://data.miningpoolstats.stream/data/arqma.js?t=${t}`;
        const poolsQuery = await axios.get(poolsQueryUrl);
        const poolsInfo = poolsQuery.data.data || [];

        const sortedPools = poolsInfo.sort((a, b) => b.hashrate - a.hashrate);
        return sortedPools.map(pool => {
            const name = pool.pool_id || "Unknown Pool";
            const hashrate = pool.hashrate || 0;

            return hashrate >= 1_000_000
                ? `⛏️ **${name}**: ${(hashrate / 1_000_000).toFixed(2)} MH/s`
                : hashrate >= 1_000
                ? `⛏️ **${name}**: ${(hashrate / 1_000).toFixed(2)} KH/s`
                : `⛏️ **${name}**: ${hashrate} H/s`;
        }).join('\n');
    } catch (error) {
        console.error("Error fetching pool data:", error);
        return "Failed to fetch pool data.";
    }
};

// Fetch daemon info
const fetchDaemonInfo = async () => {
    try {
        const response = await daemonClient.getInfo();
        const { height, top_block_hash, difficulty, target, version, database_size } = response;

        const hashrate = (difficulty / target / 1_000_000).toFixed(2);
        const dbSizeGB = (database_size / (1024 ** 3)).toFixed(2);

        return `
🛠️ **Daemon Info**

💻 **Network Hashrate**: ${hashrate} MH/s
📊 **Height**: ${height}
🔗 **Top Block Hash**: [${top_block_hash}](https://explorer.arqma.com/search?value=${top_block_hash})
🔄 **Version**: ${version}
💾 **Database Size**: ${dbSizeGB} GB
        `;
    } catch (error) {
        console.error("Error fetching daemon info:", error);
        return "Failed to fetch daemon information.";
    }
};

// Handle network command
const handleNetworkCommand = async () => {
    const networkData = await fetchNetworkInfo();
    const emissionData = await fetchEmissionData();
    const arqPrice = await fetchArqPrice();
    const btcToUsd = await fetchBtcToUsd();
    const { activeNodes, awaitingNodes } = await fetchServiceNodeData(); // Fetch active and awaiting nodes

    if (networkData && emissionData && arqPrice && btcToUsd) {
        const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
        const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);

        return `
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
    }

    return "Failed to fetch network data.";
};

// Telegram handlers
telegramBot.onText(/\/helpme/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, telegramCommands, { parse_mode: 'MarkdownV2' });
});

telegramBot.onText(/\/links/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, importantLinks, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/pools/, async (msg) => {
    const pools = await fetchPoolsData();
    telegramBot.sendMessage(msg.chat.id, pools || "Failed to fetch pool data.", { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/daemon_info/, async (msg) => {
    const daemonInfo = await fetchDaemonInfo();
    telegramBot.sendMessage(msg.chat.id, daemonInfo, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/network/, async (msg) => {
    const message = await handleNetworkCommand();
    telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

// Discord handlers
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
        const daemonInfo = await fetchDaemonInfo();
        message.channel.send(daemonInfo);
    } else if (content === '!network') {
        const responseMessage = await handleNetworkCommand();
        message.channel.send(responseMessage);
    }
});

// Start the bots
discordBot.login(DISCORD_TOKEN).then(() => console.log("Discord bot is ready!"));
console.log("Telegram bot is ready!");
