const axios = require('axios');
const { getInfoZmq } = require('../utils/zmqRpc');
const nodeList = require('../config/nodeList');

module.exports = async () => {
  let height = null;
  let hashrate = null;
  let difficulty = null;
  
  // Try to get height from node1.arqma.com first (ZMQ or HTTP)
  const node1 = nodeList.find(n => n.host && n.host.includes('node1.arqma.com')) || nodeList[0];
  
  let targetSec = null;
  
  if (node1) {
    // Try ZMQ first
    if (node1.host) {
      try {
        const data = await getInfoZmq(node1.host, 19995, 4000);
        if (data && data.unified) {
          height = data.unified.height;
          difficulty = data.unified.difficulty;
          targetSec = data.unified.target;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Network] ZMQ error for ${node1.host}:`, e.message || e);
        }
      }
    }
    
    // Try HTTP if ZMQ failed
    if (height === null && node1.url) {
      try {
        let httpUrl = node1.url;
        if (httpUrl.includes('/get_info')) {
          httpUrl = httpUrl.replace('/get_info', '/json_rpc');
        } else if (httpUrl.includes(':19994') && !httpUrl.includes('/json_rpc')) {
          httpUrl = httpUrl.replace(/\/[^\/]*$/, '') + '/json_rpc';
        }
        
        const payload = { jsonrpc: '2.0', id: '0', method: 'get_info', params: {} };
        const res = await axios.post(httpUrl, payload, { timeout: 8000 });
        const data = res.data || {};
        if (data.result) {
          height = data.result.height;
          difficulty = data.result.difficulty;
          targetSec = data.result.target;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`[Network] HTTP error for ${node1.url}:`, e.message || e);
        }
      }
    }
  }
  
  // Calculate hashrate from difficulty and target (same logic as daemon_info.js)
  if (hashrate === null && difficulty !== null) {
    const BLOCK_TIME_SECONDS = 120;
    const t = (typeof targetSec === 'number' && targetSec > 0) ? targetSec : BLOCK_TIME_SECONDS;
    if (typeof difficulty === 'number' && difficulty > 0) {
      hashrate = (difficulty / t / 1e6).toFixed(2);
    }
  }
  
  // Try explorer for hashrate (if not calculated) and verify data
  if (hashrate === null || difficulty === null) {
    try {
      const response = await axios.get('https://explorer.arqma.com/api/networkinfo', { timeout: 8000 });
      const data = response && response.data && response.data.data;
      if (data) {
        if (height === null) height = data.height;
        if (difficulty === null) difficulty = data.difficulty;
        if (hashrate === null && data.hash_rate) {
          hashrate = ((data.hash_rate || 0) / 1e6).toFixed(2);
        }
      }
    } catch (e) {
      // Explorer API may not be available, continue with RPC data
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Network] Explorer error:`, e.message || e);
      }
    }
  }
  
  // If still no difficulty, try to get from latest block
  if (difficulty === null && height !== null) {
    try {
      const response = await axios.get(`https://explorer.arqma.com/api/block/${height}`, { timeout: 8000 });
      const data = response && response.data && response.data.data;
      if (data && data.difficulty) {
        difficulty = data.difficulty;
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return { height, hashrate, difficulty };
};