const TelegramBot = require('node-telegram-bot-api');
const helpme = require('../commands/helpme');
const links = require('../commands/links');
const pools = require('../commands/pools');
const daemon_info = require('../commands/daemon_info');
const network = require('../commands/network');
const nodes = require('../commands/nodes');
const restrictCmd = require('../commands/restrict');
const zmqdiag = require('../commands/zmqdiag');
const { isBlocked } = require('../utils/blocklist');
const { isRestricted } = require('../utils/restrictlist');

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function formatRemaining(ms) { const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return `${h}h ${m}m ${s}s`; }

module.exports = (TELEGRAM_TOKEN, ALERT_USER_ID) => {
  const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

  async function safeSend(chatId, text) { return telegramBot.sendMessage(chatId, text, { disable_web_page_preview: true }); }
  async function sendPre(chatId, text) { return telegramBot.sendMessage(chatId, `<pre>${escapeHtml(text)}</pre>`, { parse_mode: 'HTML', disable_web_page_preview: true }); }

  function guard(handler) {
    return async (msg, match) => {
      const blocked = isBlocked({ id: msg.from?.id, username: msg.from?.username });
      if (blocked) { try { await safeSend(msg.chat.id, '⛔ You are blocked from using commands.'); } catch {} return; }
      const rest = isRestricted({ id: msg.from?.id, username: msg.from?.username });
      if (rest.restricted) { try { await safeSend(msg.chat.id, `🚫 You are restricted from using commands for ${formatRemaining(rest.remainingMs)}.`); } catch {} return; }
      return handler(msg, match);
    };
  }

  telegramBot.onText(/\/helpme/, guard((msg) => safeSend(msg.chat.id, helpme('telegram'))));
  telegramBot.onText(/\/links/,  guard((msg) => safeSend(msg.chat.id, links())));
  telegramBot.onText(/\/pools/,  guard(async (msg) => safeSend(msg.chat.id, await pools())));
  telegramBot.onText(/\/daemon_info/, guard(async (msg) => safeSend(msg.chat.id, await daemon_info())));
  telegramBot.onText(/\/network/, guard(async (msg) => safeSend(msg.chat.id, await network())));
  telegramBot.onText(/\/nodes/,   guard(async (msg) => safeSend(msg.chat.id, await nodes())));

  telegramBot.onText(/^\/restrict(\s+.+)?$/, async (msg) => {
    const text = msg.text || '';
    const resp = await restrictCmd({ msg, text, ALERT_USER_ID });
    try { await safeSend(msg.chat.id, resp); } catch {}
  });

  telegramBot.onText(/^\/zmqdiag\s+(\S+)/, async (msg, match) => {
    const name = match && match[1];
    const fromId = msg.from && msg.from.id;
    const resp = await zmqdiag({ name, ALERT_USER_ID, fromId });
    try { await sendPre(msg.chat.id, resp); } catch {}
  });

  console.log('Telegram bot is ready!');
  return telegramBot;
};
