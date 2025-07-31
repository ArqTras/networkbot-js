const axios = require('axios');
const nodeList = require('../config/nodeList');

/**
 * Returns the status of all nodes in the list.
 * Handles BUSY/SYNCING, OFFLINE, FULLY SYNCED.
 */
module.exports = async () => {
  // Fetch all nodes in parallel, with extended timeout and error details
  const nodeStatuses = await Promise.all(nodeList.map(async (node) => {
    try {
      const res = await axios.get(node.url, { timeout: 15000 }); // 15 seconds
      const data = res.data;
      return {
        name: node.name,
        online: true,
        height: data.height || 0,
        target_height: data.target_height || data.height || 0,
        syncing: typeof data.target_height === "number" && data.target_height - data.height > 1
      };
    } catch (e) {
      // Timeout (BUSY/SYNCING), or truly offline
      const offlineMsg =
        e.code === 'ECONNABORTED' ? '⌛ BUSY/SYNCING (timeout)' :
        (e.response && e.response.status === 503) ? '⌛ SYNCING (HTTP 503)' :
        '❌ OFFLINE';
      return { name: node.name, online: false, errorType: offlineMsg };
    }
  }));

  // Find the highest reported height
  const maxHeight = Math.max(
    ...nodeStatuses.filter(n => n.online).map(n => n.height || 0),
    0
  );

  // Build readable output for each node
  const output = nodeStatuses.map(node => {
    if (!node.online) {
      return `${node.name} : ${node.errorType}`;
    }
    if (node.height < maxHeight) {
      return `${node.name} : ✅ ONLINE | Height: ${node.height}, Target Height: ${maxHeight} (SYNCING ⏳)`;
    }
    if (node.syncing && node.target_height > node.height) {
      return `${node.name} : ✅ ONLINE | Height: ${node.height}, Target Height: ${node.target_height} (SYNCING ⏳)`;
    }
    return `${node.name} : ✅ ONLINE | Height: ${node.height} (FULLY SYNCED ✅)`;
  });

  return output.join('\n');
};