
// utils/discord.js — chunked send for Discord (~2000 char limit)
function splitIntoChunks(text, max = 1900) {
  const chunks = [];
  let buf = '';
  const lines = String(text || '').split('\n');
  for (const line of lines) {
    if ((buf.length + line.length + 1) > max) {
      if (buf) chunks.push(buf);
      if (line.length > max) {
        for (let i = 0; i < line.length; i += max) chunks.push(line.slice(i, i + max));
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

async function sendLongDiscord(channel, text) {
  const parts = splitIntoChunks(text, 1900);
  for (const part of parts) {
    try { await channel.send(part); } catch (e) {}
  }
}

module.exports = { sendLongDiscord };
