require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
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

// Caching setup
let networkCache = null;
let lastNetworkFetch = 0;
const CACHE_DURATION = 60000; // Cache for 1 minute

// Data fetching functions
const fetchNetworkInfo = async () => {
    const now = Date.now();
    if (!networkCache || now - lastNetworkFetch > CACHE_DURATION) {
        try {
            const response = await axios.get('https://explorer.arqma.com/api/networkinfo');
            const data = response.data.data;
            networkCache = {
                height: data.height,
                hashrate: (data.hash_rate / 1_000_000).toFixed(2),
                difficulty: data.difficulty
            };
            lastNetworkFetch = now;
        } catch (error) {
            console.error("Error fetching network info:", error);
            return null;
        }
    }
    return networkCache;
};

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

const fetchArqPrice = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
        const priceBtc = parseFloat(response.data.price).toFixed(8);
        const priceSat = Math.round(priceBtc * 100_000_000);
        return { priceBtc, priceSat };
    } catch (error) {
        console.error("Error fetching ARQ price:", error);
        return null;
    }
};

const fetchPoolsData = async () => {
    try {
        const poolsSecurity = await axios.get('https://miningpoolstats.stream/arqma');
        const tMatch = poolsSecurity.data.match(/var last_time = "([^"]+)"/);

        if (!tMatch) {
            console.error("Failed to extract 't' parameter.");
            return null;
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
                : `⛏️ **${name}**: ${(hashrate / 1_000).toFixed(2)} KH/s`;
        }).join('\n');
    } catch (error) {
        console.error("Error fetching pool data:", error);
        return null;
    }
};

const fetchDaemonInfo = async () => {
    try {
        const response = await daemonClient.getInfo();
        const { height, top_block_hash, difficulty, target, version, database_size } = response;

        const hashrate = (difficulty / target / 1_000_000).toFixed(2);
        const dbSizeGB = (database_size / (1024 ** 3)).toFixed(2);

        return {
            hashrate,
            height,
            topBlockHash: top_block_hash,
            version,
            dbSizeGB
        };
    } catch (error) {
        console.error("Error fetching daemon info:", error);
        return null;
    }
};

// Handler Functions
const handleNetworkCommand = async () => {
    const networkData = await fetchNetworkInfo();
    const emissionData = await fetchEmissionData();
    const arqPrice = await fetchArqPrice();

    if (networkData && emissionData && arqPrice) {
        return `
🔗 **Arqma Network Stats**

📊 **Network Height**: ${networkData.height}
💻 **Network Hashrate**: ${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: ${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: ${emissionData.emission} ARQ
💰 **TO Price**: ${arqPrice.priceBtc} BTC (${arqPrice.priceSat} sat)
        `;
    }
    return "Failed to fetch network data.";
};

// Telegram bot handlers
telegramBot.onText(/\/network/, async (msg) => {
    const message = await handleNetworkCommand();
    telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/daemon_info/, async (msg) => {
    const daemonInfo = await fetchDaemonInfo();
    const message = daemonInfo ? `
🛠️ *Daemon Info*

💻 *Network Hashrate*: ${daemonInfo.hashrate} MH/s
📊 *Height*: ${daemonInfo.height}
🔗 *Top Block Hash*: [${daemonInfo.topBlockHash}](https://explorer.arqma.com/search?value=${daemonInfo.topBlockHash})
🔄 *Version*: ${daemonInfo.version}
💾 *Database Size*: ${daemonInfo.dbSizeGB} GB
        ` : "Failed to fetch daemon information.";
    telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/pools/, async (msg) => {
    const poolData = await fetchPoolsData();
    telegramBot.sendMessage(msg.chat.id, poolData ? `🔗 *Arqma Pools*\n\n${poolData}` : "Failed to fetch pool data.", { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/links/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, importantLinks, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/helpme/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, telegramCommands, { parse_mode: 'MarkdownV2' });
});

// Discord bot event handlers
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();
    if (content === '!network') {
        const responseMessage = await handleNetworkCommand();
        message.channel.send(responseMessage);
    } else if (content === '!daemon_info') {
        const daemonInfo = await fetchDaemonInfo();
        const responseMessage = daemonInfo ? `
🛠️ **Daemon Info**

💻 **Network Hashrate**: ${daemonInfo.hashrate} MH/s
📊 **Height**: ${daemonInfo.height}
🔗 **Top Block Hash**: [${daemonInfo.topBlockHash}](https://explorer.arqma.com/search?value=${daemonInfo.topBlockHash})
🔄 **Version**: ${daemonInfo.version}
💾 **Database Size**: ${daemonInfo.dbSizeGB} GB
        ` : "Failed to fetch daemon information.";
        message.channel.send(responseMessage);
    } else if (content === '!pools') {
        const poolData = await fetchPoolsData();
        message.channel.send(poolData ? `🔗 **Arqma Pools**\n\n${poolData}` : "Failed to fetch pool data.");
    } else if (content === '!links') {
        message.channel.send(importantLinks);
    } else if (content === '!helpme') {
        message.channel.send(discordCommands);
    }
});

// Start the bots
discordBot.login(DISCORD_TOKEN).then(() => console.log("Discord bot is ready!"));
console.log("Telegram bot is ready!");

