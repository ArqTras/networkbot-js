module.exports = ({
  networkData,
  emissionData,
  arqPrice,
  btcToUsd,
  activeNodes,
  awaitingNodes
}) => {
  // Graceful fallback for each value
  const safe = (val, f) => (val === undefined || val === null ? "Data unavailable" : f ? f(val) : val);

  let message = `
🔗 Arqma Network Stats

📊 Network Height: ${safe(networkData && networkData.height)}
💻 Network Hashrate: ${safe(networkData && networkData.hashrate)}
⚙️ Network Difficulty: ${safe(networkData && networkData.difficulty)}
🪙 Total Emission (Coinbase): ${safe(emissionData && emissionData.emission)}
`;

  if (arqPrice && btcToUsd) {
    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
    message += `
💰 TO Price: ${safe(arqPrice.priceBtc)}
💰 TO 24h Volume: ${safe(volumeArq)} ARQ ($${safe(volumeUsd)} USD)
`;
  } else {
    message += `
💰 TO Price: Data unavailable
💰 TO 24h Volume: Data unavailable
`;
  }
  message += `
💰 BTC Price: $${safe(btcToUsd, x => Number(x).toFixed(2))} USD
🌐 Active Service Nodes: ${safe(activeNodes)} nodes
🌐 Service Nodes Awaiting Contributions: ${safe(awaitingNodes)} nodes
`;
  return message;
};