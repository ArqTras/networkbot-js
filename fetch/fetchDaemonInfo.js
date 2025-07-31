module.exports = async (daemonClient) => {
  try {
    const response = await daemonClient.getInfo();

    const {
      height,
      top_block_hash,
      difficulty,
      target,
      version,
      database_size,
      incoming_connections_count,
      outgoing_connections_count
    } = response || {};

    // Obliczenia z zabezpieczeniem na undefined/null/0
    const hashrate =
      typeof difficulty === "number" && typeof target === "number" && target !== 0
        ? (difficulty / target / 1_000_000).toFixed(2)
        : "Data unavailable";
    const dbSizeGB =
      typeof database_size === "number"
        ? (database_size / (1024 ** 3)).toFixed(2)
        : "Data unavailable";
    const peers =
      typeof incoming_connections_count === "number" &&
      typeof outgoing_connections_count === "number"
        ? incoming_connections_count + outgoing_connections_count
        : "Data unavailable";
    const heightStr = height !== undefined ? height : "Data unavailable";
    const versionStr = version !== undefined ? version : "Data unavailable";
    const topBlockHashStr = top_block_hash
      ? `[${top_block_hash}](https://explorer.arqma.com/search?value=${top_block_hash})`
      : "Data unavailable";

    return `
🛠️ **Daemon Info**

💻 **Network Hashrate**: ${hashrate} MH/s
📊 **Height**: ${heightStr}
🔗 **Top Block Hash**: ${topBlockHashStr}
🔄 **Version**: ${versionStr}
💾 **Database Size**: ${dbSizeGB} GB
📡 **Peers Connected**: ${peers}
    `;
  } catch (error) {
    console.error("Error fetching daemon info:", error);
    // Wszystkie pola jako Data unavailable
    return `
🛠️ **Daemon Info**

💻 **Network Hashrate**: Data unavailable
📊 **Height**: Data unavailable
🔗 **Top Block Hash**: Data unavailable
🔄 **Version**: Data unavailable
💾 **Database Size**: Data unavailable
📡 **Peers Connected**: Data unavailable
    `;
  }
};
