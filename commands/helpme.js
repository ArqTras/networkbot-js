module.exports = async (arg) => {
  const reply = arg && typeof arg === 'object' ? arg.reply : null;
  const text =
`📜 Available Commands

📊 /network - Get Arqma network statistics
💱 /trade - ARQX/BTCX order book, last price & 24h volume
🔗 /links - Display important Arqma-related links
⛏️ /pools - Display Arqma mining pools with hashrates
🛠️ /daemon_info - Detailed info (ZMQ-RPC first)
🖥️ /nodes - Per-node status (ZMQ-RPC first)
🟣 /sn - Service nodes: open nodes & reward share
❓ /helpme - Show this help message
🧪 /zmqdiag <NodeName> - Admin ZMQ diagnostics`;
  if (typeof reply === 'function') await reply(text);
  return text;
};
