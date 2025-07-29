const fetchPoolsData = require('../fetch/fetchPoolsData');
module.exports = async (telegramBot, msg) => {
    const pools = await fetchPoolsData();
    telegramBot.sendMessage(msg.chat.id, pools || "Failed to fetch pool data.", { parse_mode: 'Markdown' });
};