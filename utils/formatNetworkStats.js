module.exports = function formatNetworkStats(params) {
  const networkData = params.networkData;
  const emissionData = params.emissionData;
  const arqPrice = params.arqPrice;
  const btcToUsd = params.btcToUsd;
  const activeNodes = params.activeNodes;
  const awaitingNodes = params.awaitingNodes;

  const parts = [];
  parts.push('🔗 Arqma Network Stats');
  parts.push('');
  parts.push('📊 Network Height: ' + (networkData && networkData.height !== undefined ? networkData.height : 'Data unavailable'));
  parts.push('💻 Network Hashrate: ' + (networkData && networkData.hashrate !== undefined ? (networkData.hashrate + ' MH/s') : 'Data unavailable'));
  parts.push('⚙️ Network Difficulty: ' + (networkData && networkData.difficulty !== undefined ? networkData.difficulty : 'Data unavailable'));
  parts.push('🪙 Total Emission (Coinbase): ' + (emissionData && emissionData.emission !== undefined ? (emissionData.emission + ' ARQ') : 'Data unavailable'));

  if (arqPrice && btcToUsd) {
    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);
    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);
    parts.push('💰 TO Price: ' + arqPrice.priceBtc + ' BTC (' + arqPrice.priceSat + ' sat)');
    parts.push('💰 TO 24h Volume: ' + volumeArq + ' ARQ ($' + volumeUsd + ' USD)');
  } else {
    parts.push('💰 TO Price: Data unavailable');
    parts.push('💰 TO 24h Volume: Data unavailable');
  }

  parts.push('💰 BTC Price: ' + ((btcToUsd !== undefined && btcToUsd !== null) ? btcToUsd.toFixed(2) : 'Data unavailable') + ' USD');
  parts.push('🌐 Active Service Nodes: ' + (activeNodes !== undefined ? (activeNodes + ' nodes') : 'Data unavailable'));
  parts.push('🌐 Service Nodes Awaiting Contributions: ' + (awaitingNodes !== undefined ? (awaitingNodes + ' nodes') : 'Data unavailable'));
  return parts.join('\n');
};
