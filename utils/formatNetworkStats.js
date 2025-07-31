module.exports = ({
  networkData,
  emissionData,
  arqPrice,
  btcToUsd,
  activeNodes,
  awaitingNodes
}) => {
  let message = `
🔗 Arqma Network Stats

📊 Network Height: ${networkData && networkData.height !== undefined ? networkData.height : 'Data unavailable'}
💻 Network Hashrate: ${networkData && networkData.hashrate !== undefined ? networkData.hashrate + ' MH/s' : 'Data unavailable'}
⚙️ Network Difficulty: ${networkData && networkData.difficulty !== undefined ? networkData.difficulty : 'Data unavailable'}
🪙 Total Emission (Coinbase): ${emissionData && emissionData.emission !== undefined ? emissionData.emission + ' ARQ' : 'Data unavailable'}
`;
  if (arqPrice && btcToUsd) {
    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
    message += `
💰 TO Price: ${arqPrice.priceBtc} BTC (${arqPrice.priceSat} sat)
💰 TO 24h Volume: ${volumeArq} ARQ ($${volumeUsd} USD)
`;
  } else {
    message += `
💰 TO Price: Data unavailable
💰 TO 24h Volume: Data unavailable
`;
  }
  message += `
💰 BTC Price: $${btcToUsd !== undefined && btcToUsd !== null ? btcToUsd.toFixed(2) : 'Data unavailable'} USD
🌐 Active Service Nodes: ${activeNodes !== undefined ? activeNodes + ' nodes' : 'Data unavailable'}
🌐 Service Nodes Awaiting Contributions: ${awaitingNodes !== undefined ? awaitingNodes + ' nodes' : 'Data unavailable'}
`;
  return message;
};