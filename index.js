const fs = require('fs');
const axios = require('axios');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const { RPCDaemon } = require('@arqma/arqma-rpc');

// Read tokens from external files
const TELEGRAM_TOKEN = fs.readFileSync('telegram_token.info', 'utf8').trim();
const DISCORD_TOKEN = fs.readFileSync('discord_token.info', 'utf8').trim();

// Initialize RPC Daemon Client
const daemonClient = RPCDaemon.createDaemonClient({
  url: 'http://127.0.0.1:19994'
});
daemonClient.sslRejectUnauthorized(false);

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

// Important Links Message
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

// Available Commands Messages for Telegram and Discord
const telegramAvailableCommands = `
📜 *Available Commands*

📊 /network - Get Arqma network statistics
🔗 /links - Display important Arqma-related links
⛏️ /pools - Display Arqma mining pools with hashrates
🛠️ /daemon\\_info - Display Arqma daemon information
❓ /helpme - Show this help message
`;

const discordAvailableCommands = `
📜 **Available Commands**

📊 !network - Get Arqma network statistics
🔗 !links - Display important Arqma-related links
⛏️ !pools - Display Arqma mining pools with hashrates
🛠️ !daemon_info - Display Arqma daemon information
❓ !helpme - Show this help message
`;

// Fetch Network Info including emission and price data
const fetchNetworkInfo = async () => {
    try {
        const networkResponse = await axios.get('https://explorer.arqma.com/api/networkinfo');
        const emissionResponse = await axios.get('https://explorer.arqma.com/api/emission');
        const priceResponse = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');
        
        const networkData = networkResponse.data.data;
        const emissionData = Math.floor(emissionResponse.data.data.coinbase / 100_000);
        const priceInBtc = parseFloat(priceResponse.data.price).toFixed(8);
        const priceInSat = Math.round(priceInBtc * 100_000_000);

        return {
            height: networkData.height,
            hashrate: (networkData.hash_rate / 1_000_000).toFixed(2), // Convert to MH/s
            difficulty: networkData.difficulty,
            emission: emissionData.toString(),
            priceBtc: priceInBtc,
            priceSat: priceInSat
        };
    } catch (error) {
        console.error("Error fetching network info:", error);
        return null;
    }
};

// Fetch Daemon Info with Network Hashrate Calculation for Daemon Info Command
const fetchDaemonInfo = async () => {
    try {
        const data = await daemonClient.getInfo();
        
        // Calculate Network Hashrate by dividing difficulty by target (120)
        const networkHashrate = (data.difficulty / data.target / 1_000_000).toFixed(2); // in MH/s
        const topBlockHashLink = `https://explorer.arqma.com/search?value=${data.top_block_hash}`;

        return {
            height: data.height,
            topBlockHash: data.top_block_hash,
            topBlockHashLink,
            version: data.version,
            databaseSize: (data.database_size / (1024 ** 3)).toFixed(2), // in GB
            networkHashrate
        };
    } catch (error) {
        console.error("Error fetching daemon info:", error);
        return null;
    }
};

// Telegram Bot Handlers
telegramBot.onText(/\/start/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, "Hello! Use /network to get the latest Arqma network, emission, and price stats.");
});

telegramBot.onText(/\/network/, async (msg) => {
    const networkData = await fetchNetworkInfo();
    
    if (networkData) {
        const message = `
📊 *Arqma Network Stats*

📊 *Network Height*: ${networkData.height}
💻 *Network Hashrate*: ${networkData.hashrate} MH/s
⚙️ *Network Difficulty*: ${networkData.difficulty}
🪙 *Total Emission (Coinbase)*: ${networkData.emission} ARQ
💰 *TO Price*: ${networkData.priceBtc} BTC (${networkData.priceSat} sat)
        `;
        telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    } else {
        telegramBot.sendMessage(msg.chat.id, "Failed to fetch network data.");
    }
});

telegramBot.onText(/\/daemon_info/, async (msg) => {
    const daemonInfo = await fetchDaemonInfo();
    
    if (daemonInfo) {
        const message = `
🛠️ *Daemon Info*

💻 *Network Hashrate*: ${daemonInfo.networkHashrate} MH/s
📊 *Height*: ${daemonInfo.height}
🔗 *Top Block Hash*: [${daemonInfo.topBlockHash}](${daemonInfo.topBlockHashLink})
🔄 *Version*: ${daemonInfo.version}
💾 *Database Size*: ${daemonInfo.databaseSize} GB
        `;
        telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    } else {
        telegramBot.sendMessage(msg.chat.id, "Failed to fetch daemon info.");
    }
});

telegramBot.onText(/\/links/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, importantLinks, { parse_mode: 'Markdown' });
});

telegramBot.onText(/\/helpme/, (msg) => {
    telegramBot.sendMessage(msg.chat.id, telegramAvailableCommands, { parse_mode: 'Markdown' });
});

// Discord Bot Command Handlers
discordBot.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    const content = message.content.toLowerCase();

    if (content === '!network') {
        const networkData = await fetchNetworkInfo();
        
        if (networkData) {
            const responseMessage = `
📊 **Arqma Network Stats**

📊 **Network Height**: ${networkData.height}
💻 **Network Hashrate**: ${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: ${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: ${networkData.emission} ARQ
💰 **TO Price**: ${networkData.priceBtc} BTC (${networkData.priceSat} sat)
            `;
            message.channel.send(responseMessage);
        } else {
            message.channel.send("Failed to fetch network data.");
        }
    } else if (content === '!daemon_info') {
        const daemonInfo = await fetchDaemonInfo();
        
        if (daemonInfo) {
            const responseMessage = `
🛠️ **Daemon Info**

💻 **Network Hashrate**: ${daemonInfo.networkHashrate} MH/s
📊 **Height**: ${daemonInfo.height}
🔗 **Top Block Hash**: [${daemonInfo.topBlockHash}](${daemonInfo.topBlockHashLink})
🔄 **Version**: ${daemonInfo.version}
💾 **Database Size**: ${daemonInfo.databaseSize} GB
            `;
            message.channel.send(responseMessage);
        } else {
            message.channel.send("Failed to fetch daemon info.");
        }
    } else if (content === '!links') {
        message.channel.send(importantLinks);
    } else if (content === '!helpme') {
        message.channel.send(discordAvailableCommands);
    }
});

// Login Discord bot
discordBot.login(DISCORD_TOKEN).then(() => console.log("Discord bot is ready!"));

// Telegram bot error handling
telegramBot.on('polling_error', error => console.error(`Polling error: ${error.message}`));
console.log("Telegram bot is ready!");

