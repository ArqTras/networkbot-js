const axios = require('axios');
const nodeList = require('../config/nodeList');
const { getInfoZmq } = require('../utils/zmqRpc');

const BLOCK_TIME_SECONDS = 120;

async function getViaHttp(url) {
  try {
    const res = await axios.get(url, { timeout: 8000 });
    const d = res.data || {};
    return {
      ok: true,
      via: 'HTTP',
      height: (typeof d.height === 'number') ? d.height : null,
      difficulty: (typeof d.difficulty === 'number') ? d.difficulty : null,
      target: (typeof d.target === 'number') ? d.target : null,
      version: d.version || d.daemon_version || null,
      top: d.top_block_hash || d.top_hash || null,
      peers: ((d.incoming_connections_count || 0) + (d.outgoing_connections_count || 0)) || null
    };
  } catch { return { ok: false }; }
}

function fmt(v, suffix) { return (v === null || v === undefined) ? 'Data unavailable' : String(v) + (suffix || ''); }
function computeHashrate(difficulty, targetSec) {
  const t = (typeof targetSec === 'number' && targetSec > 0) ? targetSec : BLOCK_TIME_SECONDS;
  if (typeof difficulty !== 'number' || difficulty <= 0) return null;
  return (difficulty / t / 1e6).toFixed(2) + ' MH/s';
}
function isMeaningful(z) { return !!(z && (typeof z.height === 'number' || typeof z.difficulty === 'number' || z.top_block_hash)); }

module.exports = async () => {
  const results = await Promise.all(nodeList.map(async (node) => {
    if (node.host) {
      const data = await getInfoZmq(node.host, 19995, 4000);
      const z = data && data.unified;
      if (isMeaningful(z)) {
        const hashrate = computeHashrate(z.difficulty, z.target);
        return { name: node.name, ok: true, via: 'ZMQ-RPC', height: z.height ?? null, difficulty: z.difficulty ?? null, target: z.target ?? null, version: z.version ?? null, top: z.top_block_hash ?? null, peers: z.peers ?? null, hashrate };
      }
    }
    const h = await getViaHttp(node.url);
    if (h.ok) return { name: node.name, ok: true, via: h.via, height: h.height, difficulty: h.difficulty, target: h.target, version: h.version, top: h.top, peers: h.peers, hashrate: computeHashrate(h.difficulty, h.target) };
    return { name: node.name, ok: false };
  }));

  const sections = results.map(r => {
    if (!r.ok) return '**' + r.name + '** : ❌ Unreachable';
    return [
      '🛠️ ' + '**' + r.name + '**' + '  ' + '_' + r.via + '_',
      '💻 Network Hashrate: ' + fmt(r.hashrate),
      '📊 Height: ' + fmt(r.height),
      '🔗 Top Block Hash: ' + fmt(r.top),
      '🔄 Version: ' + fmt(r.version),
      '📡 Peers Connected: ' + fmt(r.peers)
    ].join('\n');
  });

  return sections.join('\n\n');
};