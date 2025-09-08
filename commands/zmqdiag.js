const nodeList = require('../config/nodeList');
const { getInfoZmq } = require('../utils/zmqRpc');

function val(v) { return (v === null || v === undefined) ? 'null' : String(v); }

module.exports = async ({ name, ALERT_USER_ID, fromId }) => {
  if (!fromId || String(fromId) !== String(ALERT_USER_ID)) return '⛔ You are not allowed to use this command.';
  const node = nodeList.find(n => n.name.toLowerCase() === String(name || '').toLowerCase());
  if (!node) return 'Usage: zmqdiag <NodeName> — unknown node.';
  const info = await getInfoZmq(node.host, 19995, 4000);
  const u = (info && info.unified) || {};
  const used = (info && info.used) || 'none';
  const raw = info && info.raw;

  const lines = [];
  lines.push('🔎 ZMQ DIAG for ' + node.name + ' @ tcp://' + node.host + ':19995');
  lines.push('Pattern: ' + used);
  lines.push('');
  lines.push('Unified:');
  lines.push('- height: ' + val(u.height));
  lines.push('- target_height: ' + val(u.target_height));
  lines.push('- target: ' + val(u.target));
  lines.push('- difficulty: ' + val(u.difficulty));
  lines.push('- version: ' + val(u.version));
  lines.push('- top_block_hash: ' + val(u.top_block_hash));
  lines.push('- peers: ' + val(u.peers));
  lines.push('');
  lines.push('Raw JSON (pretty):');
  if (raw) { try { lines.push(JSON.stringify(raw, null, 2)); } catch { lines.push('(raw present but failed to stringify)'); } }
  else { lines.push('(no JSON parsed)'); }

  return lines.join('\n');
};
