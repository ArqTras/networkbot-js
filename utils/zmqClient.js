const zmq = require('zeromq');

function parseAnyJsonFromFrames(msg) {
  const frames = Array.isArray(msg) ? msg : [msg];
  for (const f of frames) {
    const s = Buffer.isBuffer(f) ? f.toString() : String(f || '');
    if (!s) continue;
    try { const j = JSON.parse(s); if (j && typeof j === 'object') return j; } catch {}
  }
  return null;
}

async function tryPattern(sock, payload) {
  try { await sock.send(payload); const msg = await sock.receive(); return parseAnyJsonFromFrames(msg); }
  catch { return null; }
}

function buildPatterns(method, paramsObj) {
  const body2 = JSON.stringify({ jsonrpc: '2.0', id: '0', method, params: paramsObj || {} });
  const bodyS = JSON.stringify({ method, params: paramsObj || {} });
  return [
    { name: `multipart:json_rpc:${method}:jsonrpc2`, payload: ['json_rpc', body2] },
    { name: `multipart:json_rpc:${method}:simple`,   payload: ['json_rpc', bodyS] },
    { name: `multipart:${method}:empty`,             payload: [method, ''] },
    { name: `multipart:${method}:emptyObj`,          payload: [method, '{}'] },
    { name: `single:${method}:jsonrpc2`,             payload: body2 },
    { name: `single:${method}:simple`,               payload: bodyS }
  ];
}

async function zmqCall(host, port, method, paramsObj={}, timeoutMs=4000) {
  const endpoint = `tcp://${host}:${port}`;
  const sock = new zmq.Request();
  sock.receiveHighWaterMark = 1000;
  let used = null, raw = null;
  const timer = setTimeout(() => { try { sock.close(); } catch {} }, timeoutMs);
  try {
    sock.connect(endpoint);
    const patterns = buildPatterns(method, paramsObj);
    for (const p of patterns) {
      const resp = await tryPattern(sock, p.payload);
      if (resp) { used = p.name; raw = resp; break; }
    }
  } catch {}
  clearTimeout(timer);
  try { sock.close(); } catch {}
  return { used, raw };
}

function extractIpsFromConnections(obj) {
  const ips = new Set();
  if (!obj) return [...ips];
  const res = obj.result || obj;
  const list = Array.isArray(res?.connections) ? res.connections : [];
  for (const c of list) {
    const addr = c?.address || c?.addr || '';
    const m = String(addr).match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
    if (m) ips.add(m[1]);
  }
  return [...ips];
}

async function getConnectionsZMQ(host, port=19995, timeoutMs=4000) {
  const { used, raw } = await zmqCall(host, port, 'get_connections', {}, timeoutMs);
  const ips = extractIpsFromConnections(raw);
  return { ips, used };
}

module.exports = { getConnectionsZMQ };
