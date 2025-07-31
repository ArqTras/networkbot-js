const axios = require('axios');
const nodeList = require('../config/nodeList');

module.exports = async () => {
  const statuses = await Promise.all(nodeList.map(async (node) => {
    try {
      const res = await axios.get(node.url, { timeout: 5000 });
      const data = res.data;
      return { name: node.name, online: true, height: data.height || 0, target_height: data.target_height || 0 };
    } catch (e) {
      return { name: node.name, online: false, height: null, target_height: null };
    }
  }));

  // Find highest height among online nodes
  const onlineHeights = statuses.filter(n => n.online).map(n => n.height || 0);
  const maxHeight = onlineHeights.length ? Math.max(...onlineHeights) : 0;

  const output = statuses.map(node => {
    if (!node.online) {
      return `${node.name} : ❌ OFFLINE`;
    }
    if (node.height < maxHeight) {
      return `${node.name} : ✅ ONLINE | Height: ${node.height}, Target Height: ${maxHeight} (SYNCING ⏳)`;
    } else {
      return `${node.name} : ✅ ONLINE | Height: ${node.height} (FULLY SYNCED ✅)`;
    }
  });

  return output.join('\n');
};