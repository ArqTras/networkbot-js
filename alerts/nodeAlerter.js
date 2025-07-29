const axios = require('axios');
module.exports = async (nodeList, nodeAlertState, telegramBot, ALERT_USER_ID) => {
  const pingResults = await Promise.all(nodeList.map(async (node) => {
    try {
      const res = await axios.get(node.url, { timeout: 5000 });
      const data = res.data;
      return { online: true, height: data.height || 0, target_height: data.target_height || 0, node };
    } catch (e) {
      return { online: false, height: null, target_height: null, node };
    }
  }));
  const onlineNodes = pingResults.filter(r => r.online);
  const maxHeight = onlineNodes.length ? Math.max(...onlineNodes.map(r => r.height || 0)) : 0;
  for (let i = 0; i < pingResults.length; i++) {
    const r = pingResults[i];
    const prevState = nodeAlertState[i];
    if (!r.online) {
      if (!prevState.offline) {
        await telegramBot.sendMessage(ALERT_USER_ID, `🚨 [NODE ALERT]\n${r.node.name} is OFFLINE!`);
        prevState.offline = true;
      }
      prevState.behind = false;
      continue;
    } else {
      if (prevState.offline) {
        await telegramBot.sendMessage(ALERT_USER_ID, `✅ [NODE ALERT]\n${r.node.name} is back ONLINE!`);
        prevState.offline = false;
      }
    }
    if (r.height && maxHeight && (maxHeight - r.height > 2)) {
      if (!prevState.behind) {
        await telegramBot.sendMessage(ALERT_USER_ID, `🚨 [NODE ALERT]\n${r.node.name} is OUT OF SYNC by ${maxHeight - r.height} blocks (Current: ${r.height}, Highest: ${maxHeight})!`);
        prevState.behind = true;
      }
    } else {
      if (prevState.behind) {
        await telegramBot.sendMessage(ALERT_USER_ID, `✅ [NODE ALERT]\n${r.node.name} is now back IN SYNC. (Height: ${r.height})`);
        prevState.behind = false;
      }
    }
  }
};