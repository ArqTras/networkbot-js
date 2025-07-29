const axios = require('axios');
const nodeList = require('../config/nodeList');
module.exports = async (telegramBot, msg) => {
    const pingResults = await Promise.all(nodeList.map(async (node) => {
        try {
            const res = await axios.get(node.url, { timeout: 5000 });
            const data = res.data;
            let status, desc;
            if (data.target_height && data.target_height > 0) {
                const diff = Math.abs(data.target_height - data.height);
                if (diff > 2) {
                    status = "SYNCING ⏳";
                    desc = `Target Height: ${data.target_height}, Height: ${data.height}`;
                } else {
                    status = "FULLY SYNCED ✅";
                    desc = `Height: ${data.height}`;
                }
            } else if (data.height) {
                status = "FULLY SYNCED ✅";
                desc = `Height: ${data.height}`;
            } else {
                status = "UNKNOWN";
                desc = "No data";
            }
            return `${node.name} : ✅ ONLINE | ${desc} (${status})`;
        } catch (e) {
            return `${node.name} : ❌ OFFLINE`;
        }
    }));
    telegramBot.sendMessage(msg.chat.id, pingResults.join('\n'), { parse_mode: 'Markdown' });
};