const axios = require('axios');
const { getServiceNodesZmq } = require('../utils/zmqRpc');
const nodeList = require('../config/nodeList');

async function getServiceNodesHttp(url) {
  try {
    let rpcUrl = url;
    if (rpcUrl.includes('/get_info')) {
      rpcUrl = rpcUrl.replace('/get_info', '/json_rpc');
    } else if (rpcUrl.includes(':19994') && !rpcUrl.includes('/json_rpc')) {
      rpcUrl = rpcUrl.replace(/\/[^\/]*$/, '') + '/json_rpc';
    }
    
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

module.exports = async () => {
  let states = [];
  
  // Try to get service nodes from node1.arqma.com first
  const node1 = nodeList.find(n => n.host && n.host.includes('node1.arqma.com')) || nodeList[0];
  
  if (node1) {
    // Try HTTP first
    if (node1.url) {
      try {
        states = await getServiceNodesHttp(node1.url) || [];
      } catch (e) {
        console.error(`[SN Data] HTTP error:`, e.message || e);
      }
    }
    
    // Try ZMQ if HTTP failed
    if (states.length === 0 && node1.host) {
      try {
        const data = await getServiceNodesZmq(node1.host, 19995, 4000);
        if (data && data.body && Array.isArray(data.body.service_node_states)) {
          states = data.body.service_node_states;
        }
      } catch (e) {
        console.error(`[SN Data] ZMQ error:`, e.message || e);
      }
    }
  }
  
  // Try explorer API as fallback
  if (states.length === 0) {
    try {
      const response = await axios.get('https://explorer.arqma.com/api/service_nodes', { timeout: 8000 });
      if (response.data && response.data.data) {
        states = Array.isArray(response.data.data) ? response.data.data : [];
      }
    } catch (e) {
      console.error(`[SN Data] Explorer API error:`, e.message || e);
    }
  }
  
  // Calculate active and awaiting nodes
  const activeNodes = states.filter(sn => sn.active === true || sn.state === 'active').length;
  const awaitingNodes = states.filter(sn => {
    if (sn.funded === true || sn.active === true) return false;
    const req = BigInt(sn.staking_requirement || 0);
    const res = BigInt(sn.total_reserved || 0);
    return req > res;
  }).length;
  
  return { activeNodes, awaitingNodes };
};