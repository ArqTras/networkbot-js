
// utils/telegram.js — chunked send helpers for Telegram
function splitIntoChunks(text, max = 3500) {
  const chunks = [];
  let buf = '';
  const lines = String(text || '').split('\n');
  for (const line of lines) {
    // +1 for newline if we add it
    if ((buf.length + line.length + 1) > max) {
      if (buf) chunks.push(buf);
      if (line.length > max) {
        // hard-break long line
        for (let i = 0; i < line.length; i += max) {
          chunks.push(line.slice(i, i + max));
        }
        buf = '';
      } else {
        buf = line;
      }
    } else {
      buf = buf ? (buf + '\n' + line) : line;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function sendLong(bot, chatId, text, opts = {}) {
  const parts = splitIntoChunks(text, opts.max || 3500);
  for (const part of parts) {
    try {
      await bot.sendMessage(chatId, part, { disable_web_page_preview: true, ...opts });
    } catch (e) {
      // keep trying remaining parts, but don't crash handler
    }
  }
}

async function sendLongPre(bot, chatId, text) {
  // use a slightly smaller max to accommodate <pre> wrapper
  const parts = splitIntoChunks(String(text || ''), 3200);
  for (const part of parts) {
    const payload = '<pre>' + String(part)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
    try {
      await bot.sendMessage(chatId, payload, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {}
  }
}

module.exports = { sendLong, sendLongPre };
