module.exports = (platform) => {
  if (platform === 'discord') {
    return [
      '📜 Available Commands',
      '',
      '📊 !network - Get Arqma network statistics',
      '🔗 !links - Display important Arqma-related links',
      '⛏️ !pools - Display Arqma mining pools with hashrates',
      '🛠️ !daemon_info - Detailed info (ZMQ-RPC first)',
      '🧱 !helpme - Show this help message',
      '🖥️ !nodes - Per-node status (ZMQ-RPC first)',
      '🧪 !zmqdiag <NodeName> - Admin ZMQ diagnostics'
    ].join('\n');
  }
  return [
    '📜 Available Commands',
    '',
    '📊 /network - Get Arqma network statistics',
    '🔗 /links - Display important Arqma-related links',
    '⛏️ /pools - Display Arqma mining pools with hashrates',
    '🛠️ /daemon_info - Detailed info (ZMQ-RPC first)',
    '🚫 /restrict <@user|id> - (admin) restrict commands 24h',
    '❓ /helpme - Show this help message',
    '🖥️ /nodes - Per-node status (ZMQ-RPC first)',
    '🧪 /zmqdiag <NodeName> - Admin ZMQ diagnostics'
  ].join('\n');
};
