const fetchNetworkInfo = require('../fetch/fetchNetworkInfo');
const fetchEmissionData = require('../fetch/fetchEmissionData');
const fetchArqPrice = require('../fetch/fetchArqPrice');
const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');
const fetchServiceNodeData = require('../fetch/fetchServiceNodeData');
module.exports = async (telegramBot, msg) => {
    const networkData = await fetchNetworkInfo();
    const emissionData = await fetchEmissionData();
    const arqPrice = await fetchArqPrice();
    const btcToUsd = await fetchBtcToUsd();
    const { activeNodes, awaitingNodes } = await fetchServiceNodeData();
    if (networkData && emissionData && arqPrice && btcToUsd) {
        const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
        const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
        const message = `
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
        telegramBot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    } else {
        telegramBot.sendMessage(msg.chat.id, "Failed to fetch network data.", { parse_mode: 'Markdown' });
    }
};