module.exports = async (daemonClient) => {
  try {
    const response = await daemonClient.getInfo();
    const { height, top_block_hash, difficulty, target, version, database_size, incoming_connections_count, outgoing_connections_count } = response;
    const hashrate = (difficulty / target / 1_000_000).toFixed(2);
    const dbSizeGB = (database_size / (1024 ** 3)).toFixed(2);
    const peers = (incoming_connections_count || 0) + (outgoing_connections_count || 0);
    return `
🛠️ **Daemon Info**

💻 **Network Hashrate**: ${hashrate} MH/s
📊 **Height**: ${height}
🔗 **Top Block Hash**: [${top_block_hash}](https://explorer.arqma.com/search?value=${top_block_hash})
🔄 **Version**: ${version}
💾 **Database Size**: ${dbSizeGB} GB
📡 **Peers Connected**: ${peers}
    `;
  } catch (error) {
    console.error("Error fetching daemon info:", error);
    return "Failed to fetch daemon information.";
  }
};