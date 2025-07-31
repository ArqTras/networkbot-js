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

  let message = `
🔗 Arqma Network Stats

📊 Network Height: ${n.height ?? missing}
💻 Network Hashrate: ${n.hashrate ?? missing}${n.hashrate ? " MH/s" : ""}
⚙️ Network Difficulty: ${n.difficulty ?? missing}
🪙 Total Emission (Coinbase): ${e.emission ?? missing} ARQ
`;

  // Price and volume
  if (arqPrice && price.priceBtc && price.priceSat && price.volumeBtc && btc) {
    const volumeUsd = (price.volumeBtc * btc).toFixed(2);
    const volumeArq = (price.volumeBtc / price.priceBtc).toFixed(2);
    message += `
💰 TO Price: ${price.priceBtc} BTC (${price.priceSat} sat)
💰 TO 24h Volume: ${volumeArq} ARQ ($${volumeUsd} USD)
`;
  } else {
    message += `
💰 TO Price: ${missing}
💰 TO 24h Volume: ${missing}
`;
  }

  // BTC price
  message += `
💰 BTC Price: $${btc ? btc.toFixed(2) : missing} USD
🌐 Active Service Nodes: ${activeNodes ?? missing} nodes
🌐 Service Nodes Awaiting Contributions: ${awaitingNodes ?? missing} nodes
`;

  return message.trim();
};