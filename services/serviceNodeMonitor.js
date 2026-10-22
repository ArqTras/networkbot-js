/**
 * Monitor service nodes i wysyłaj powiadomienia o nowych otwartych service nodes
 */
const fs = require('fs');
const path = require('path');
const nodeList = require('../config/nodeList');
const { getServiceNodesZmq } = require('../utils/zmqRpc');
const axios = require('axios');
const constants = require('../config/constants');

const ATOMIC_PER_COIN = 10**9;
const STATE_FILE = path.join(__dirname, '..', 'data', 'service-nodes-state.json');
const CHECK_INTERVAL_MS = parseInt(process.env.SN_CHECK_INTERVAL_MS) || 600000; // 10 minut domyślnie

// Helper functions z commands/sn.js
function feePct(portions) {
  if (typeof portions === 'string') portions = BigInt(portions);
  if (typeof portions === 'number') portions = BigInt(portions);
  if (typeof portions !== 'bigint') return 0;
  const U64_MAX_PLUS1 = BigInt(2**64);
  return (Number(portions) / Number(U64_MAX_PLUS1)) * 100.0;
}

function computeOpenNodes(states) {
  const out = [];
  for (const sn of states) {
    if (sn.funded) continue;
    
    const req = BigInt(sn.staking_requirement || 0);
    const res = BigInt(sn.total_reserved || 0);
    const missing = req - res;
    
    if (missing <= 0) continue;
    
    out.push({
      pubkey: sn.service_node_pubkey || '',
      fee: feePct(sn.portions_for_operator || 0),
      missing: Number(missing / BigInt(ATOMIC_PER_COIN))
    });
  }
  return out;
}

// Try HTTP fallback
async function getServiceNodesHttp(url) {
  try {
    let rpcUrl = url;
    if (rpcUrl.includes('/get_info')) {
      rpcUrl = rpcUrl.replace('/get_info', '/json_rpc');
    } else if (rpcUrl.includes(':19994') && !rpcUrl.includes('/json_rpc')) {
      rpcUrl = rpcUrl.replace(':19994', ':19994/json_rpc').replace(/\/[^\/]*$/, '/json_rpc');
    }
    
    const payload = { jsonrpc: '2.0', id: '0', method: 'get_service_nodes', params: {} };
    const res = await axios.post(rpcUrl, payload, { timeout: 8000 });
    const data = res.data || {};
    if (data.error) return null;
    const result = data.result || {};
    const states = Array.isArray(result.service_node_states) ? result.service_node_states : [];
    return { service_node_states: states };
  } catch {
    return null;
  }
}

async function fetchServiceNodes() {
  // Walidacja nodeList
  if (!Array.isArray(nodeList) || nodeList.length === 0) {
    return null;
  }
  
  // Try node1.arqma.com first (most reliable)
  const node1 = nodeList.find(n => n.host && n.host.includes('node1.arqma.com')) || nodeList[0];
  
  if (node1) {
    // Try HTTP first
    if (node1.url && typeof node1.url === 'string') {
      try {
        const data = await getServiceNodesHttp(node1.url);
        if (data && Array.isArray(data.service_node_states) && data.service_node_states.length > 0) {
          return data.service_node_states;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[SN Monitor] HTTP error for', node1.url, ':', e.message || e);
        }
      }
    }
    
    // Try ZMQ if HTTP failed
    if (node1.host && typeof node1.host === 'string') {
      try {
        const data = await getServiceNodesZmq(node1.host, 19995, 4000);
        if (data && data.body && Array.isArray(data.body.service_node_states)) {
          return data.body.service_node_states;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[SN Monitor] ZMQ error for', node1.host, ':', e.message || e);
        }
      }
    }
  }
  
  // Fallback to other nodes
  for (const node of nodeList) {
    if (node === node1) continue; // Skip already tried
    if (!node || typeof node !== 'object') continue;
    
    if (node.host && typeof node.host === 'string') {
      try {
        const data = await getServiceNodesZmq(node.host, 19995, 4000);
        if (data && data.body && Array.isArray(data.body.service_node_states)) {
          return data.body.service_node_states;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[SN Monitor] ZMQ error for', node.host, ':', e.message || e);
        }
      }
    }
    
    if (node.url && typeof node.url === 'string') {
      try {
        const data = await getServiceNodesHttp(node.url);
        if (data && Array.isArray(data.service_node_states)) {
          return data.service_node_states;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[SN Monitor] HTTP error for', node.url, ':', e.message || e);
        }
      }
    }
  }
  
  return null;
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(data);
      return {
        knownOpen: Array.isArray(state.knownOpen) ? new Set(state.knownOpen) : new Set(),
        lastCheck: state.lastCheck || null
      };
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error loading service nodes state:', e.message || e);
    }
  }
  return {
    knownOpen: new Set(),
    lastCheck: null
  };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      knownOpen: Array.from(state.knownOpen),
      lastCheck: state.lastCheck
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error saving service nodes state:', e.message || e);
    }
  }
}

function formatNotification(openNodes) {
  const lines = ['🚨 **New OPEN Service Node(s) Found**\n'];
  for (const node of openNodes) {
    lines.push(`\n**${node.pubkey}**`);
    lines.push(`  Fee: ${node.fee.toFixed(2)}%`);
    lines.push(`  Missing: ${node.missing} ARQ`);
  }
  return lines.join('\n');
}

/**
 * Wysyła powiadomienia o nowych otwartych service nodes
 * @param {TelegramBot} telegramBot - Instancja bota Telegram (opcjonalne)
 * @param {string[]} telegramChatIds - Lista ID kanałów/grup Telegram (opcjonalne)
 * @param {Client} discordBot - Instancja bota Discord (opcjonalne)
 * @param {string[]} discordChannelIds - Lista ID kanałów Discord (opcjonalne)
 */
async function sendNotifications(telegramBot, telegramChatIds, discordBot, discordChannelIds) {
  const state = loadState();
  const states = await fetchServiceNodes();
  
  if (!states || !Array.isArray(states)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SN Monitor] Failed to fetch service nodes');
    }
    return;
  }
  
  const openNodes = computeOpenNodes(states);
  const knownSet = state.knownOpen;
  const newNodes = openNodes.filter(node => !knownSet.has(node.pubkey));
  
  if (newNodes.length === 0) {
    // Zaktualizuj tylko timestamp
    state.lastCheck = new Date().toISOString();
    saveState(state);
    return;
  }
  
  // Zaktualizuj znane otwarte nodes
  for (const node of openNodes) {
    knownSet.add(node.pubkey);
  }
  state.knownOpen = knownSet;
  state.lastCheck = new Date().toISOString();
  saveState(state);
  
  // Format message
  const message = formatNotification(newNodes);
  const plainMessage = message.replace(/\*\*/g, ''); // Plain text version for Discord
  
  // Wyślij powiadomienia na Telegram
  if (telegramBot && Array.isArray(telegramChatIds) && telegramChatIds.length > 0) {
    for (const chatId of telegramChatIds) {
      try {
        await telegramBot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        console.log(`✅ [SN Monitor] Telegram notification sent to chat ${chatId}`);
      } catch (e) {
        // Try plain text if Markdown fails
        try {
          await telegramBot.sendMessage(chatId, plainMessage, {
            disable_web_page_preview: true
          });
          console.log(`✅ [SN Monitor] Telegram notification sent (plain text) to chat ${chatId}`);
        } catch (e2) {
          console.error(`❌ [SN Monitor] Error sending Telegram notification to chat ${chatId}:`, e2.message || e2);
        }
      }
    }
  }
  
  // Wyślij powiadomienia na Discord
  if (discordBot && Array.isArray(discordChannelIds) && discordChannelIds.length > 0) {
    for (const channelId of discordChannelIds) {
      try {
        const channel = await discordBot.channels.fetch(channelId);
        if (channel && channel.send) {
          await channel.send(plainMessage);
          console.log(`✅ [SN Monitor] Discord notification sent to channel ${channelId}`);
        }
      } catch (e) {
        console.error(`❌ [SN Monitor] Error sending Discord notification to channel ${channelId}:`, e.message || e);
      }
    }
  }
}

/**
 * Uruchamia monitorowanie service nodes
 * @param {TelegramBot} telegramBot - Instancja bota Telegram (opcjonalne)
 * @param {string[]} telegramChatIds - Lista ID kanałów/grup Telegram (opcjonalne)
 * @param {Client} discordBot - Instancja bota Discord (opcjonalne)
 * @param {string[]} discordChannelIds - Lista ID kanałów Discord (opcjonalne)
 */
function startMonitoring(telegramBot, telegramChatIds, discordBot, discordChannelIds) {
  const hasTelegram = telegramBot && Array.isArray(telegramChatIds) && telegramChatIds.length > 0;
  const hasDiscord = discordBot && Array.isArray(discordChannelIds) && discordChannelIds.length > 0;
  
  if (!hasTelegram && !hasDiscord) {
    console.log('ℹ️ Service node monitor: No channels/groups configured');
    console.log('   Set TELEGRAM_SN_CHAT_IDS and/or DISCORD_SN_CHANNEL_IDS to enable monitoring');
    return;
  }
  
  console.log(`✅ Service node monitor started (checking every ${CHECK_INTERVAL_MS / 1000}s)`);
  if (hasTelegram) {
    console.log(`   Monitoring ${telegramChatIds.length} Telegram channel(s)/group(s)`);
  }
  if (hasDiscord) {
    console.log(`   Monitoring ${discordChannelIds.length} Discord channel(s)`);
  }
  
  // Pierwsze sprawdzenie po starcie (po 30 sekundach)
  setTimeout(() => {
    sendNotifications(telegramBot, telegramChatIds, discordBot, discordChannelIds).catch(e => {
      console.error('[SN Monitor] Error:', e.message || e);
    });
  }, 30000);
  
  // Następne sprawdzenia w interwałach
  setInterval(() => {
    sendNotifications(telegramBot, telegramChatIds, discordBot, discordChannelIds).catch(e => {
      console.error('[SN Monitor] Error:', e.message || e);
    });
  }, CHECK_INTERVAL_MS);
}

module.exports = { startMonitoring, sendNotifications };
