const nodeList = require('../config/nodeList');
const { getServiceNodesZmq } = require('../utils/zmqRpc');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ATOMIC_PER_COIN = 10**9;
const U64_MAX_PLUS1 = BigInt(2**64);
const STATE_FILE = path.join(__dirname, '..', 'data', 'sn-stats-history.json');
const BLOCKS_PER_DAY = 720; // 24h * 60min / 2min per block (Arqma block time ~120s)

// Helper functions
function feePct(portions) {
  if (typeof portions === 'string') portions = BigInt(portions);
  if (typeof portions === 'number') portions = BigInt(portions);
  if (typeof portions !== 'bigint') return 0;
  return (Number(portions) / Number(U64_MAX_PLUS1)) * 100.0;
}

function last6(s) {
  if (typeof s !== 'string' || s.length < 6) return s;
  return s.slice(-6);
}

// Compute open service nodes (not funded yet)
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

// Compute reward share for active service nodes
function computeRewardShare(states) {
  const active = states.filter(sn => sn.active);
  const n = active.length;
  const acc = {};
  
  for (const sn of active) {
    const total = BigInt(sn.staking_requirement || 0);
    if (total === BigInt(0)) continue; // Skip if no staking requirement
    
    const op = sn.operator_address || '';
    const fee = feePct(sn.portions_for_operator || 0) / 100.0;
    
    const contrib = {};
    for (const c of (sn.contributors || [])) {
      const addr = c.address || '';
      const reserved = BigInt(c.reserved || 0);
      contrib[addr] = (contrib[addr] || BigInt(0)) + reserved;
    }
    
    const opStake = contrib[op] || BigInt(0);
    const others = total - opStake;
    
    // Convert BigInt to Number for calculations
    const totalNum = Number(total);
    const opStakeNum = Number(opStake);
    const othersNum = Number(others);
    
    const opReward = (opStakeNum / totalNum) + fee * (othersNum / totalNum);
    acc[op] = (acc[op] || 0) + opReward;
    
    for (const [addr, stake] of Object.entries(contrib)) {
      if (addr === op) continue;
      const stakeNum = Number(stake);
      const reward = (stakeNum / totalNum) * (1.0 - fee);
      acc[addr] = (acc[addr] || 0) + reward;
    }
  }
  
  const out = [];
  for (const [addr, nodeEq] of Object.entries(acc)) {
    const pct = n > 0 ? (nodeEq / n) * 100.0 : 0.0;
    out.push({ addr, nodeEq, pct });
  }
  
  out.sort((a, b) => b.pct - a.pct);
  return out;
}

// Load previous state for comparison
function loadPreviousState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SN Stats] Error loading previous state:', e.message || e);
    }
  }
  return null;
}

// Save current state for next comparison
function saveCurrentState(states, currentHeight) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const state = {
      timestamp: new Date().toISOString(),
      height: currentHeight || null,
      nodes: states.map(sn => ({
        pubkey: sn.service_node_pubkey || '',
        active: sn.active || false,
        funded: sn.funded || false,
        registration_height: sn.registration_height || null,
        expiry_height: sn.requested_unlock_height || sn.expiry_height || null
      }))
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SN Stats] Error saving state:', e.message || e);
    }
  }
}

// Compute statistics
function computeStats(states, currentHeight) {
  const totalNodes = states.length;
  const previousState = loadPreviousState();
  
  let newNodesToday = 0;
  let reactivatedToday = 0;
  let expiredToday = 0;
  let prematurelyDroppedToday = 0;
  let expiringSoon = 0;
  
  if (previousState && previousState.nodes) {
    const prevMap = new Map();
    previousState.nodes.forEach(n => {
      prevMap.set(n.pubkey, n);
    });
    
    const currentMap = new Map();
    states.forEach(sn => {
      const pubkey = sn.service_node_pubkey || '';
      currentMap.set(pubkey, {
        active: sn.active || false,
        funded: sn.funded || false,
        registration_height: sn.registration_height || null,
        expiry_height: sn.requested_unlock_height || sn.expiry_height || null
      });
    });
    
    // Check for new nodes (not in previous state)
    for (const [pubkey, current] of currentMap.entries()) {
      if (!prevMap.has(pubkey)) {
        if (current.active || current.funded) {
          newNodesToday++;
        }
      } else {
        const prev = prevMap.get(pubkey);
        // Reactivated: was inactive, now active
        if (!prev.active && current.active) {
          reactivatedToday++;
        }
        // Expired: was active, now inactive
        if (prev.active && !current.active) {
          expiredToday++;
        }
        // Prematurely dropped: was funded/active, now gone
        if ((prev.active || prev.funded) && !current.active && !current.funded) {
          prematurelyDroppedToday++;
        }
      }
    }
    
    // Check for nodes that expired (were in previous but not in current)
    for (const [pubkey, prev] of prevMap.entries()) {
      if (!currentMap.has(pubkey) && (prev.active || prev.funded)) {
        expiredToday++;
      }
    }
  }
  
  // Count nodes expiring within 24h (720 blocks)
  if (currentHeight) {
    for (const sn of states) {
      const expiryHeight = sn.requested_unlock_height || sn.expiry_height;
      if (expiryHeight && typeof expiryHeight === 'number') {
        const blocksUntilExpiry = expiryHeight - currentHeight;
        if (blocksUntilExpiry > 0 && blocksUntilExpiry <= BLOCKS_PER_DAY) {
          expiringSoon++;
        }
      }
    }
  }
  
  return {
    totalNodes,
    newNodesToday,
    reactivatedToday,
    expiredToday,
    prematurelyDroppedToday,
    expiringSoon
  };
}

// Format stats text
function statsText(states, currentHeight) {
  const openNodes = computeOpenNodes(states);
  const reward = computeRewardShare(states);
  const stats = computeStats(states, currentHeight);
  
  // Count full (funded/active) service nodes
  const fullNodes = states.filter(sn => sn.funded === true || sn.active === true).length;
  const openCount = openNodes.length;
  
  const lines = [];
  
  // Add total nodes statistic with breakdown
  lines.push(`✅ Total nodes: ${stats.totalNodes}`);
  lines.push(`${fullNodes} Full SN, ${openCount} open for contribution`);
  
  lines.push('');
  lines.push('🆕 OPEN SERVICE NODES');
  if (openNodes.length === 0) {
    lines.push('none');
  } else {
    for (const x of openNodes) {
      lines.push(`${x.pubkey}\n  fee ${x.fee.toFixed(2)}% | missing ${x.missing}`);
    }
  }
  
  lines.push('');
  lines.push('💰 REWARD SHARE (ACTIVE)');
  for (const { addr, pct } of reward) {
    lines.push(`...${last6(addr).padStart(6)}  → ${pct.toFixed(2).padStart(6)} %`);
  }
  
  // Save state for next comparison (still needed for potential future use)
  saveCurrentState(states, currentHeight);
  
  return lines.join('\n');
}

// Try HTTP fallback
async function getServiceNodesHttp(url) {
  try {
    // Convert HTTP URL to JSON-RPC endpoint
    let rpcUrl = url;
    if (rpcUrl.includes('/get_info')) {
      rpcUrl = rpcUrl.replace('/get_info', '/json_rpc');
    } else if (rpcUrl.includes(':19994') && !rpcUrl.includes('/json_rpc')) {
      // Remove any path and add /json_rpc
      rpcUrl = rpcUrl.replace(/\/[^\/]*$/, '') + '/json_rpc';
    } else if (!rpcUrl.includes('/json_rpc') && !rpcUrl.includes('/')) {
      // If just hostname, add port and path
      rpcUrl = `http://${rpcUrl}:19994/json_rpc`;
    }
    
    console.log(`[SN] Trying HTTP RPC: ${rpcUrl}`);
    const payload = { jsonrpc: '2.0', id: '0', method: 'get_service_nodes', params: {} };
    const res = await axios.post(rpcUrl, payload, { 
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' }
    });
    const data = res.data || {};
    if (data.error) {
      console.error(`[SN] RPC error:`, data.error);
      return null;
    }
    const result = data.result || {};
    const states = Array.isArray(result.service_node_states) ? result.service_node_states : [];
    console.log(`[SN] HTTP success: got ${states.length} service nodes`);
    return { service_node_states: states };
  } catch (error) {
    console.error(`[SN] HTTP error for ${url}:`, error.message || error);
    if (error.response) {
      console.error(`[SN] Response status: ${error.response.status}, data:`, JSON.stringify(error.response.data).substring(0, 200));
    }
    return null;
  }
}

module.exports = async () => {
  // Walidacja nodeList
  if (!Array.isArray(nodeList) || nodeList.length === 0) {
    return '❌ No nodes configured. Please check config/nodeList.js';
  }
  
  // Try ZMQ first, then HTTP fallback
  let states = [];
  let success = false;
  let lastError = null;
  
  // Try node1.arqma.com first as suggested by user
  const preferredNode = nodeList.find(n => n.host && n.host.includes('node1.arqma.com')) || nodeList[0];
  
  // Try preferred node first
  if (preferredNode) {
    // Try HTTP first for node1.arqma.com (more reliable)
    if (preferredNode.url && typeof preferredNode.url === 'string') {
      try {
        console.log(`[SN] Trying preferred node HTTP: ${preferredNode.url}`);
        const data = await getServiceNodesHttp(preferredNode.url);
        if (data && Array.isArray(data.service_node_states) && data.service_node_states.length > 0) {
          states = data.service_node_states;
          success = true;
        }
      } catch (e) {
        lastError = e;
        console.error(`[SN] Preferred node HTTP error:`, e.message || e);
      }
    }
    
    // Try ZMQ if HTTP failed
    if (!success && preferredNode.host && typeof preferredNode.host === 'string') {
      try {
        console.log(`[SN] Trying preferred node ZMQ: ${preferredNode.host}`);
        const data = await getServiceNodesZmq(preferredNode.host, 19995, 4000);
        if (data && data.body) {
          if (Array.isArray(data.body.service_node_states) && data.body.service_node_states.length > 0) {
            states = data.body.service_node_states;
            success = true;
          } else if (data.body && typeof data.body === 'object') {
            const possibleStates = data.body.service_node_states || data.body.service_nodes || data.body.states || [];
            if (Array.isArray(possibleStates) && possibleStates.length > 0) {
              states = possibleStates;
              success = true;
            }
          }
        }
      } catch (e) {
        lastError = e;
        console.error(`[SN] Preferred node ZMQ error:`, e.message || e);
      }
    }
  }
  
  // If preferred node failed, try all other nodes
  if (!success) {
    for (const node of nodeList) {
      if (node === preferredNode) continue; // Skip already tried
      
      // Walidacja node
      if (!node || typeof node !== 'object') continue;
      
      if (node.host && typeof node.host === 'string') {
        try {
          const data = await getServiceNodesZmq(node.host, 19995, 4000);
          if (data && data.body) {
            if (Array.isArray(data.body.service_node_states) && data.body.service_node_states.length > 0) {
              states = data.body.service_node_states;
              success = true;
              break;
            } else if (data.body && typeof data.body === 'object') {
              const possibleStates = data.body.service_node_states || data.body.service_nodes || data.body.states || [];
              if (Array.isArray(possibleStates) && possibleStates.length > 0) {
                states = possibleStates;
                success = true;
                break;
              }
            }
          }
        } catch (e) {
          lastError = e;
          console.error(`[SN] ZMQ error for ${node.host}:`, e.message || e);
        }
      }
      
      if (node.url && typeof node.url === 'string' && !success) {
        try {
          const data = await getServiceNodesHttp(node.url);
          if (data) {
            if (Array.isArray(data.service_node_states) && data.service_node_states.length > 0) {
              states = data.service_node_states;
              success = true;
              break;
            } else if (data && typeof data === 'object') {
              const possibleStates = data.service_node_states || data.service_nodes || data.states || [];
              if (Array.isArray(possibleStates) && possibleStates.length > 0) {
                states = possibleStates;
                success = true;
                break;
              }
            }
          }
        } catch (e) {
          lastError = e;
          console.error(`[SN] HTTP error for ${node.url}:`, e.message || e);
        }
      }
    }
  }
  
  // Final fallback: try node1.arqma.com directly
  if (!success) {
    try {
      console.log(`[SN] Trying direct fallback: node1.arqma.com`);
      const fallbackUrl = 'http://node1.arqma.com:19994/json_rpc';
      const data = await getServiceNodesHttp(fallbackUrl);
      if (data && Array.isArray(data.service_node_states) && data.service_node_states.length > 0) {
        states = data.service_node_states;
        success = true;
      }
    } catch (e) {
      console.error(`[SN] Direct fallback error:`, e.message || e);
    }
  }
  
  if (!success) {
    const errorMsg = lastError ? ` (${lastError.message || lastError})` : '';
    return `❌ Failed to fetch service nodes data. Please try again later.${errorMsg}`;
  }
  
  // Jeśli success ale states.length === 0, to może po prostu nie ma service nodes
  if (states.length === 0) {
    return 'ℹ️ No service nodes found in the network.';
  }
  
  // Try to get current height for expiry calculations
  let currentHeight = null;
  const node1 = nodeList.find(n => n.host && n.host.includes('node1.arqma.com')) || nodeList[0];
  if (node1) {
    try {
      const { getInfoZmq } = require('../utils/zmqRpc');
      const info = await getInfoZmq(node1.host, 19995, 2000);
      if (info && info.unified && info.unified.height) {
        currentHeight = info.unified.height;
      }
    } catch (e) {
      // Ignore - height is optional
    }
  }
  
  return statsText(states, currentHeight);
};
