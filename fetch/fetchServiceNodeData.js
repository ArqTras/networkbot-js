const axios = require('axios');
const { getServiceNodesZmq } = require('../utils/zmqRpc');
const nodeList = require('../config/nodeList');

function toJsonRpcUrl(url) {
  if (!url) return null;
  if (url.includes('/get_info')) return url.replace('/get_info', '/json_rpc');
  if (url.includes('/json_rpc')) return url;
  if (/:\d+/.test(url)) return url.replace(/\/[^/]*$/, '') + '/json_rpc';
  return url;
}

async function getServiceNodesHttp(url) {
  try {
    const rpcUrl = toJsonRpcUrl(url);
    if (!rpcUrl) return null;

    const payload = { jsonrpc: '2.0', id: '0', method: 'get_service_nodes', params: {} };
    const res = await axios.post(rpcUrl, payload, { timeout: 8000 });
    const data = res.data || {};
    if (data.error) return null;
    const result = data.result || {};
    const states = Array.isArray(result.service_node_states) ? result.service_node_states : [];
    return states;
  } catch {
    return null;
  }
}

function countFromStates(states) {
  const activeNodes = states.filter(sn => sn.active === true || sn.state === 'active').length;
  const awaitingNodes = states.filter(sn => {
    if (sn.funded === true || sn.active === true) return false;
    try {
      const req = BigInt(sn.staking_requirement || 0);
      const reserved = BigInt(sn.total_reserved || 0);
      return req > reserved;
    } catch {
      return false;
    }
  }).length;
  return { activeNodes, awaitingNodes };
}

async function scrapeExplorerCounts() {
  const response = await axios.get('https://explorer.arqma.com/service_nodes', {
    timeout: 10000,
    headers: { Accept: 'text/html' }
  });
  const html = typeof response.data === 'string' ? response.data : '';
  const activeMatch = html.match(/(\d+)\s+active service nodes/i);
  const awaitingMatch = html.match(/(\d+)\s+service nodes awaiting contributions/i);
  if (!activeMatch && !awaitingMatch) return null;
  return {
    activeNodes: activeMatch ? parseInt(activeMatch[1], 10) : 0,
    awaitingNodes: awaitingMatch ? parseInt(awaitingMatch[1], 10) : 0
  };
}

function preferredNodes() {
  const list = Array.isArray(nodeList) ? [...nodeList] : [];
  list.sort((a, b) => {
    const score = (n) => {
      const host = (n && n.host) || '';
      const url = (n && n.url) || '';
      if (host === '127.0.0.1' || host === 'localhost' || url.includes('127.0.0.1')) return 0;
      if (String(n.name || '').toLowerCase() === 'pool') return 1;
      if (url.includes(':19998')) return 2;
      return 3;
    };
    return score(a) - score(b);
  });
  return list;
}

module.exports = async () => {
  let states = [];

  for (const node of preferredNodes()) {
    if (states.length > 0) break;

    if (node.url) {
      try {
        states = await getServiceNodesHttp(node.url) || [];
      } catch (e) {
        console.error(`[SN Data] HTTP error for ${node.url}:`, e.message || e);
      }
    }

    if (states.length === 0 && node.host) {
      try {
        const data = await getServiceNodesZmq(node.host, 19995, 4000);
        if (data && data.body && Array.isArray(data.body.service_node_states)) {
          states = data.body.service_node_states;
        }
      } catch (e) {
        console.error(`[SN Data] ZMQ error for ${node.host}:`, e.message || e);
      }
    }
  }

  if (states.length > 0) {
    return countFromStates(states);
  }

  // Explorer has no /api/service_nodes; scrape the public HTML counts as last resort.
  try {
    const scraped = await scrapeExplorerCounts();
    if (scraped) return scraped;
  } catch (e) {
    console.error(`[SN Data] Explorer HTML scrape error:`, e.message || e);
  }

  return { activeNodes: 0, awaitingNodes: 0 };
};
