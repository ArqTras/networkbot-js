const axios = require('axios');
const nodeList = require('../config/nodeList');
const { getInfoZmq } = require('../utils/zmqRpc');

async function getViaHttp(url) {
  try {
    const res = await axios.get(url, { timeout: 8000 });
    const d = res.data || {};
    const height = typeof d.height === 'number' ? d.height : 0;
    const targetHeight = typeof d.target_height === 'number' ? d.target_height : height;
    return { ok: true, height, targetHeight };
  } catch (e) {
    const offlineMsg = e && e.code === 'ECONNABORTED' ? '⌛ BUSY/SYNCING (timeout)'
      : (e && e.response && e.response.status === 503) ? '⌛ SYNCING (HTTP 503)' : '❌ OFFLINE';
    return { ok: false, errorType: offlineMsg };
  }
}

function isMeaningful(z) { return !!(z && (typeof z.height === 'number' || typeof z.target_height === 'number')); }

module.exports = async () => {
  const results = await Promise.all(nodeList.map(async (node) => {
    if (node.host) {
      const data = await getInfoZmq(node.host, 19995, 4000);
      const z = data && data.unified;
      if (isMeaningful(z)) {
        const height = z.height || 0;
        const targetHeight = (typeof z.target_height === 'number') ? z.target_height : height;
        return { name: node.name, online: true, height, targetHeight, via: 'ZMQ-RPC' };
      }
    }
    const h = await getViaHttp(node.url);
    if (h.ok) return { name: node.name, online: true, height: h.height, targetHeight: h.targetHeight, via: 'HTTP' };
    return { name: node.name, online: false, errorType: h.errorType || '❌ OFFLINE' };
  }));

  const onlineHeights = results.filter(r => r.online).map(r => r.height);
  const maxHeight = onlineHeights.length ? Math.max.apply(null, onlineHeights) : 0;

  const lines = results.map(r => {
    if (!r.online) return r.name + ' : ' + r.errorType;
    const via = r.via ? ' (' + r.via + ')' : '';
    if (r.height < maxHeight) {
      return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ', Target Height: ' + maxHeight + ' (SYNCING ⏳)';
    }
    if (r.targetHeight > r.height) {
      return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ', Target Height: ' + r.targetHeight + ' (SYNCING ⏳)';
    }
    return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ' (FULLY SYNCED ✅)';
  });

  return lines.join('\n');
};