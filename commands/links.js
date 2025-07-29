module.exports = (telegramBot, msg, importantLinks) => {
    telegramBot.sendMessage(msg.chat.id, importantLinks, { parse_mode: 'Markdown' });
};