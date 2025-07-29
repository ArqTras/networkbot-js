const axios = require('axios');
module.exports = async () => {
    try {
        const response = await axios.get('https://miningpoolstats.stream/arqma');
        const tMatch = response.data.match(/var last_time = "([^"]+)"/);

        if (!tMatch) return "Failed to fetch pool data.";

        const t = tMatch[1];
        const poolsQueryUrl = `https://data.miningpoolstats.stream/data/arqma.js?t=${t}`;
        const poolsQuery = await axios.get(poolsQueryUrl);
        const poolsInfo = poolsQuery.data.data || [];

        const sortedPools = poolsInfo.sort((a, b) => b.hashrate - a.hashrate);
        let totalHashrate = 0;
        const poolLines = sortedPools.map(pool => {
            const name = pool.pool_id || "Unknown Pool";
            const hashrate = pool.hashrate || 0;
            totalHashrate += hashrate;
            return hashrate >= 1_000_000
                ? `⛏️ **${name}**: ${(hashrate / 1_000_000).toFixed(2)} MH/s`
                : hashrate >= 1_000
                ? `⛏️ **${name}**: ${(hashrate / 1_000).toFixed(2)} KH/s`
                : `⛏️ **${name}**: ${hashrate} H/s`;
        }).join('\n');

        return `${poolLines}\n\n🌐 **Total Pool Hashrate**: ${(totalHashrate / 1_000_000).toFixed(2)} MH/s`;
    } catch (error) {
        console.error("Error fetching pool data:", error);
        return "Failed to fetch pool data.";
    }
};