const { removeRestricts } = require('../utils/restrictlist');

module.exports = async ({ msg, text, ALERT_USER_ID }) => {
  const callerId = msg.from && msg.from.id;
  if (!callerId || String(callerId) !== String(ALERT_USER_ID)) return '⛔ You are not allowed to use this command.';
  const args = (text || '').split(/\s+/).slice(1);
  if (!args.length) return 'Usage: /unrestrict <@username|id>';

  const raw = args[0];
  let username = null, id = null;
  if (/^@/.test(raw)) username = raw.replace(/^@+/, '').trim().toLowerCase();
  else if (/^\d+$/.test(raw)) id = raw.trim();
  else username = raw.trim().toLowerCase();
  if (!username && !id) return 'Provide a valid @username or numeric id.';

  const records = [];
  if (username) records.push({ type: 'username', value: username });
  if (id) records.push({ type: 'id', value: String(id) });
  const when = new Date();
  const res = removeRestricts(records, when);
  if (!res.changed) return 'ℹ️ No active restriction found for ' + (username ? '@' + username : (id ? '(id:' + id + ')' : 'given user')) + '.';
  return '✅ Unrestricted: ' + (username ? '@' + username : '') + (id ? ' (id:' + id + ')' : '') + ' — Commands re-enabled on Telegram & Discord.\nTime: ' + when.toISOString();
};
