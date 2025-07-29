const fetchDaemonInfo = require('../fetch/fetchDaemonInfo');
module.exports = async (telegramBot, msg, daemonClient) => {
    const daemonInfo = await fetchDaemonInfo(daemonClient);
    telegramBot.sendMessage(msg.chat.id, daemonInfo, { parse_mode: 'Markdown' });
};