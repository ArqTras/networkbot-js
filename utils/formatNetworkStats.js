module.exports = function formatNetworkStats(params) {
  const networkData = params.networkData;
  const arqPrice = params.arqPrice;
  const btcToUsd = params.btcToUsd;
  const activeNodes = params.activeNodes;
  const awaitingNodes = params.awaitingNodes;

  const parts = [];
  parts.push('🔗 Arqma Network Stats');
  parts.push('');
  parts.push('📊 Network Height: ' + (networkData && networkData.height !== undefined && networkData.height !== null ? networkData.height : 'Data unavailable'));
  parts.push('💻 Network Hashrate: ' + (networkData && networkData.hashrate !== undefined && networkData.hashrate !== null ? (networkData.hashrate + ' MH/s') : 'Data unavailable'));
  parts.push('⚙️ Network Difficulty: ' + (networkData && networkData.difficulty !== undefined && networkData.difficulty !== null ? networkData.difficulty : 'Data unavailable'));

  if (arqPrice) {
    if (arqPrice.priceBtc && btcToUsd) {
      // We have BTC price
      const priceUsd = (parseFloat(arqPrice.priceBtc) * btcToUsd).toFixed(6);
      parts.push('💰 Price: ' + arqPrice.priceBtc + ' BTC (' + arqPrice.priceSat + ' sat / $' + priceUsd + ' USD)');
    } else if (arqPrice.priceUsd) {
      // We have USD price from nonkyc.io (ARQ/USDT)
      const priceUsd = parseFloat(arqPrice.priceUsd).toFixed(6);
      if (btcToUsd) {
        // Convert to BTC for display
        const priceBtc = (arqPrice.priceUsd / btcToUsd).toFixed(8);
        const priceSat = Math.round((arqPrice.priceUsd / btcToUsd) * 100000000);
        parts.push('💰 Price: ' + priceBtc + ' BTC (' + priceSat + ' sat / $' + priceUsd + ' USD)');
      } else {
        // Just show USD
        parts.push('💰 Price: $' + priceUsd + ' USD');
      }
    } else {
      parts.push('💰 Price: Data unavailable');
    }
  } else {
    parts.push('💰 Price: Data unavailable');
  }

  parts.push('💰 BTC Price: ' + ((btcToUsd !== undefined && btcToUsd !== null) ? btcToUsd.toFixed(2) : 'Data unavailable') + ' USD');
  parts.push('🌐 Active Service Nodes: ' + (activeNodes !== undefined && activeNodes !== null ? (activeNodes + ' nodes') : '0 nodes'));
  parts.push('🌐 Service Nodes Awaiting Contributions: ' + (awaitingNodes !== undefined && awaitingNodes !== null ? (awaitingNodes + ' nodes') : '0 nodes'));
  return parts.join('\n');
};