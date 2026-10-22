const axios = require('axios');
module.exports = async () => {
  try {
    const response = await axios.get('https://miningpoolstats.stream/arqma');
    const tMatch = response.data && response.data.match(/var last_time = \"([^\"]+)\"/);
    if (!tMatch) return 'Failed to fetch pool data.';
    const t = tMatch[1];
    const poolsQueryUrl = 'https://data.miningpoolstats.stream/data/arqma.js?t=' + t;
    const poolsQuery = await axios.get(poolsQueryUrl);
    const poolsInfo = (poolsQuery.data && poolsQuery.data.data) ? poolsQuery.data.data : [];
    const sorted = poolsInfo.sort((a, b) => (b.hashrate || 0) - (a.hashrate || 0));
    let total = 0;
    const lines = sorted.map(p => {
      const name = p.pool_id || 'Unknown Pool';
      const h = p.hashrate || 0; total += h;
      if (h >= 1e6) return '⛏️ ' + name + ': ' + (h / 1e6).toFixed(2) + ' MH/s';
      if (h >= 1e3) return '⛏️ ' + name + ': ' + (h / 1e3).toFixed(2) + ' KH/s';
      return '⛏️ ' + name + ': ' + h + ' H/s';
    }).join('\n');
    return '🌐 Total Pool Hashrate: ' + (total / 1e6).toFixed(2) + ' MH/s\n\n' + lines;
  } catch { return 'Failed to fetch pool data.'; }
};