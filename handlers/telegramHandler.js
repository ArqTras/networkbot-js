const TelegramBot = require('node-telegram-bot-api');
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const pools = require('../commands/pools');
const daemon_info = require('../commands/daemon_info');
const network = require('../commands/network');
const nodes = require('../commands/nodes');

module.exports = (TELEGRAM_TOKEN, ALERT_USER_ID, daemonClient) => {
  const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  telegramBot.onText(/\/helpme/, msg => telegramBot.sendMessage(msg.chat.id, helpme("telegram"), { parse_mode: 'MarkdownV2' }));
  telegramBot.onText(/\/links/, msg => telegramBot.sendMessage(msg.chat.id, links(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\/pools/, async msg => telegramBot.sendMessage(msg.chat.id, await pools(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\/daemon_info/, async msg => telegramBot.sendMessage(msg.chat.id, await daemon_info(daemonClient), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\/network/, async msg => telegramBot.sendMessage(msg.chat.id, await network(), { parse_mode: 'Markdown' }));
  telegramBot.onText(/\/nodes/, async msg => telegramBot.sendMessage(msg.chat.id, await nodes(), { parse_mode: 'Markdown' }));

  console.log("Telegram bot is ready!");
  return telegramBot;
};