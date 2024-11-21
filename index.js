require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const TelegramBot = require('node-telegram-bot-api');
const { RPCDaemon } = require('@arqma/arqma-rpc');
const OpenAI = require('openai');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Debugging: Log the presence of environment variables (Do not log actual keys)
console.log('TELEGRAM_TOKEN loaded:', !!TELEGRAM_TOKEN);
console.log('DISCORD_TOKEN loaded:', !!DISCORD_TOKEN);
console.log('OPENAI_API_KEY loaded:', !!OPENAI_API_KEY);

if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !OPENAI_API_KEY) {
    console.error('One or more environment variables are missing. Please check your .env file.');
    process.exit(1);
}

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// Initialize Telegram Bot
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Initialize Discord Bot
const discordBot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
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

📊 /network \\- Get ArQmA network statistics
🔗 /links \\- Display important ArQmA\\-related links
⛏️ /pools \\- Display ArQmA mining pools with hashrates
🛠️ /daemon\\_info \\- Get detailed ArQmA daemon information
🖼️ /generate\\_image \\- Generate an AI image with ARQMA text and logo
❓ /helpme \\- Show this help message
`;

const discordCommands = `
📜 **Available Commands**

📊 !network - Get ArQmA network statistics
🔗 !links - Display important ArQmA-related links
⛏️ !pools - Display ArQmA mining pools with hashrates
🛠️ !daemon_info - Get detailed ArQmA daemon information
🖼️ !generate_image - Generate an AI image with ARQMA text and logo
❓ !helpme - Show this help message
`;

// Fetch BTC-to-USD price
const fetchBtcToUsd = async () => {
    try {
        const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice/BTC.json');
        return parseFloat(response.data.bpi.USD.rate.replace(',', ''));
    } catch (error) {
        console.error("Error fetching BTC-to-USD rate:", error);
        return null;
    }
};

// Fetch ARQ-to-BTC price and volume
const fetchArqPrice = async () => {
    try {
        const response = await axios.get('https://tradeogre.com/api/v1/ticker/BTC-ARQ');
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
            difficulty: data.difficulty,
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
        return { emission: emission.toString() };
    } catch (error) {
        console.error("Error fetching emission data:", error);
        return null;
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
        return sortedPools.map((pool) => {
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

    if (networkData && emissionData && arqPrice && btcToUsd) {
        const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
        const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);

        return `
🔗 **ArQmA Network Stats**

📊 **Network Height**: ${networkData.height}
💻 **Network Hashrate**: ${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: ${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: ${emissionData.emission} ARQ
💰 **TO Price**: ${arqPrice.priceBtc} BTC (${arqPrice.priceSat} sat)
💰 **TO 24h Volume**: ${volumeArq} ARQ ($${volumeUsd} USD)
💰 **BTC Price**: $${btcToUsd.toFixed(2)} USD
        `;
    }

    return "Failed to fetch network data.";
};

// Generate AI Image
const generateAIImage = async () => {
    try {
        const prompt = "An artistic image featuring the text 'ARQMA' and a hexagon transparent logo in modern digital art style.";
        const response = await openai.images.generate({
            prompt: prompt,
            n: 1,
            size: "512x512",
        });

        const imageUrl = response.data[0].url;

        // Download the image to a temporary file
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tempImagePath = path.join(__dirname, 'temp_image.png');
        fs.writeFileSync(tempImagePath, imageResponse.data);

        return tempImagePath;
    } catch (error) {
        // Check for billing limit error
        const errorMessage = error.response ? error.response.data.error.message : error.message;
        console.error("Error generating AI image:", errorMessage);

        if (errorMessage.includes("Billing hard limit has been reached")) {
            return "billing_limit_reached";
        }

        return null;
    }
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

telegramBot.onText(/\/generate_image/, async (msg) => {
    const chatId = msg.chat.id;
    telegramBot.sendMessage(chatId, "Generating image, please wait...");
    const result = await generateAIImage();

    if (result === "billing_limit_reached") {
        telegramBot.sendMessage(chatId, "⚠️ Billing limit reached. Please wait a bit before generating a new image.");
    } else if (result) {
        telegramBot.sendPhoto(chatId, result).then(() => {
            // Delete the temporary image file
            fs.unlinkSync(result);
        });
    } else {
        telegramBot.sendMessage(chatId, "Failed to generate image. Please check the console for details.");
    }
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
    } else if (content === '!generate_image') {
        message.channel.send("Generating image, please wait...");
        const result = await generateAIImage();

        if (result === "billing_limit_reached") {
            message.channel.send("⚠️ Billing limit reached. Please wait a bit before generating a new image.");
        } else if (result) {
            message.channel.send({ files: [result] }).then(() => {
                // Delete the temporary image file
                fs.unlinkSync(result);
            });
        } else {
            message.channel.send("Failed to generate image. Please check the console for details.");
        }
    }
});

// Start the bots
discordBot.login(DISCORD_TOKEN).then(() => console.log("Discord bot is ready!"));
telegramBot.on('polling_error', (error) => console.error("Telegram polling error:", error));
console.log("Telegram bot is ready!");
