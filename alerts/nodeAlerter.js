const axios = require('axios');
require('dotenv').config();
const DISCORD_ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;

// Each item: { offline: false, behind: false, offlineCount: 0 }
module.exports = async (nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot) => {
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
    let prevState = nodeAlertState[i];
    if (typeof prevState.offlineCount !== "number") prevState.offlineCount = 0;

    // Alert to both
    async function sendAlert(alertText) {
      if (telegramBot) await telegramBot.sendMessage(ALERT_USER_ID, alertText);
      if (discordBot && discordBot.channels && discordBot.channels.cache && DISCORD_ALERT_CHANNEL_ID) {
        const channel = discordBot.channels.cache.get(DISCORD_ALERT_CHANNEL_ID);
        if (channel) channel.send(alertText);
      }
    }

    // OFFLINE ALERT: only if 2+ consecutive checks
    if (!r.online) {
      prevState.offlineCount++;
      if (!prevState.offline && prevState.offlineCount >= 2) {
        await sendAlert(`🚨 [NODE ALERT]\n${r.node.name} is OFFLINE for ${prevState.offlineCount} minutes!`);
        prevState.offline = true;
      }
      prevState.behind = false;
      continue;
    } else {
      if (prevState.offline) {
        await sendAlert(`✅ [NODE ALERT]\n${r.node.name} is back ONLINE!`);
        prevState.offline = false;
      }
      prevState.offlineCount = 0;
    }

    // OUT OF SYNC ALERT: only if > 4 blocks behind
    if (r.height && maxHeight && (maxHeight - r.height > 4)) {
      if (!prevState.behind) {
        await sendAlert(`🚨 [NODE ALERT]\n${r.node.name} is OUT OF SYNC by ${maxHeight - r.height} blocks (Current: ${r.height}, Highest: ${maxHeight})!`);
        prevState.behind = true;
      }
    } else {
      if (prevState.behind) {
        await sendAlert(`✅ [NODE ALERT]\n${r.node.name} is now back IN SYNC. (Height: ${r.height})`);
        prevState.behind = false;
      }
    }
  }
};