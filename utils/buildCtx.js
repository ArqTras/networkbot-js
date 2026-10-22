function fromTelegram(msg, ALERT_USER_ID) {
  const chatType = msg?.chat?.type || '';
  const fromUsername = msg?.from?.username || '';
  const fromId = msg?.from?.id || null;
  const isDM = chatType === 'private';
  const isAdminUser =
    String(fromUsername || '').toLowerCase() === 'arqtras' ||
    (ALERT_USER_ID && String(fromId) === String(ALERT_USER_ID));
  return { platform:'telegram', chatType, fromUsername, fromId, isAdminDM: !!(isDM && isAdminUser) };
}
function fromDiscord(message, ALERT_USER_ID) {
  const isDM =
    (message?.channel?.isDMBased && message.channel.isDMBased()) ||
    String(message?.channel?.type || '').toLowerCase().includes('dm');
  const fromUsername = message?.author?.username || '';
  const fromId = message?.author?.id || null;
  const isAdminUser =
    String(fromUsername || '').toLowerCase() === 'arqtras' ||
    (ALERT_USER_ID && String(fromId) === String(ALERT_USER_ID));
  return { platform:'discord', chatType: isDM ? 'private' : 'group', fromUsername, fromId, isAdminDM: !!(isDM && isAdminUser) };
}
module.exports = { fromTelegram, fromDiscord };
