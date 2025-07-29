module.exports = (platform) => {
  return platform === "discord" ? `
📜 **Available Commands**

📊 !network - Get Arqma network statistics
🔗 !links - Display important Arqma-related links
⛏️ !pools - Display Arqma mining pools with hashrates
🛠️ !daemon_info - Get detailed Arqma daemon information
❓ !helpme - Show this help message
🖥️ !nodes - Get information from the Arqma nodes
` : `
📜 *Available Commands*

📊 /network \\- Get Arqma network statistics
🔗 /links \\- Display important Arqma\\-related links
⛏️ /pools \\- Display Arqma mining pools with hashrates
🛠️ /daemon\\_info \\- Get detailed Arqma daemon information
❓ /helpme \\- Show this help message
🖥️ /nodes \\- Get information from the Arqma nodes
`;
};