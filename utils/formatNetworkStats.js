module.exports = ({
  networkData,
  emissionData,
  arqPrice,
  btcToUsd,
  activeNodes,
  awaitingNodes
}) => {
  if (!(networkData && emissionData && btcToUsd)) {
    return null;
  }
  let message = `
🔗 **Arqma Network Stats**

📊 **Network Height**: ${networkData.height}
💻 **Network Hashrate**: ${networkData.hashrate} MH/s
⚙️ **Network Difficulty**: ${networkData.difficulty}
🪙 **Total Emission (Coinbase)**: ${emissionData.emission} ARQ
`;
  if (arqPrice) {
    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
    message += `
💰 **TO Price**: ${arqPrice.priceBtc} BTC (${arqPrice.priceSat} sat)
💰 **TO 24h Volume**: ${volumeArq} ARQ ($${volumeUsd} USD)
`;
  } else {
    message += `
💰 **TO Price**: _Data unavailable_
💰 **TO 24h Volume**: _Data unavailable_
`;
  }
  message += `
💰 **BTC Price**: $${btcToUsd.toFixed(2)} USD
🌐 **Active Service Nodes**: ${activeNodes} nodes
🌐 **Service Nodes Awaiting Contributions**: ${awaitingNodes} nodes
`;
  return message;
};