module.exports = (telegramBot, msg, telegramCommands) => {
    telegramBot.sendMessage(msg.chat.id, telegramCommands, { parse_mode: 'MarkdownV2' });
};