const axios = require('axios');
require('dotenv').config();
const DISCORD_ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;

module.exports = async (nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot) => {
  const results = await Promise.all(nodeList.map(async (node) => {
    try { const res = await axios.get(node.url, { timeout: 10000 }); const data = res.data || {}; return { online: true, height: data.height || 0, target_height: data.target_height || 0, node };
    } catch { return { online: false, height: null, target_height: null, node }; }
  }));

  const online = results.filter(r => r.online);
  const maxHeight = online.length ? Math.max(...online.map(r => r.height || 0)) : 0;

  async function sendAlert(text) {
    if (telegramBot && ALERT_USER_ID) { try { await telegramBot.sendMessage(ALERT_USER_ID, text, { disable_web_page_preview: true }); } catch {} }
    if (discordBot && discordBot.channels?.cache && DISCORD_ALERT_CHANNEL_ID) {
      const ch = discordBot.channels.cache.get(DISCORD_ALERT_CHANNEL_ID);
      if (ch) { try { await ch.send(text); } catch {} }
    }
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const st = nodeAlertState[i] || (nodeAlertState[i] = { offline:false, behind:false, offlineCount:0 });

    if (!r.online) {
      st.offlineCount++;
      if (!st.offline && st.offlineCount >= 4) { await sendAlert(`🚨 [NODE ALERT]\n${r.node.name} is OFFLINE for ${st.offlineCount} minutes!`); st.offline = true; }
      st.behind = false; continue;
    } else {
      if (st.offline) { await sendAlert(`✅ [NODE ALERT]\n${r.node.name} is back ONLINE!`); st.offline = false; }
      st.offlineCount = 0;
    }

    if (r.height && maxHeight && (maxHeight - r.height > 4)) {
      if (!st.behind) { await sendAlert(`🚨 [NODE ALERT]\n${r.node.name} is OUT OF SYNC by ${maxHeight - r.height} blocks (Current: ${r.height}, Highest: ${maxHeight})!`); st.behind = true; }
    } else {
      if (st.behind) { await sendAlert(`✅ [NODE ALERT]\n${r.node.name} is now back IN SYNC. (Height: ${r.height})`); st.behind = false; }
    }
  }
};
