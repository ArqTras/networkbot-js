const zmq = require('zeromq');

function numOrNull(v) { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return +v; return null; }
function pick(o, keys) { for (const k of keys) { if (o && o[k] != null) return o[k]; } return null; }
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
function isZeroHash(h) { return typeof h === 'string' && h.replace(/^0x/i,'').toLowerCase() === ZERO_HASH; }

function unifyGetInfo(obj) {
  if (!obj) return null;
  const res = (obj && typeof obj === 'object' ? obj.result || obj : null) || {};
  const root = (res && typeof res === 'object' && res.info && typeof res.info === 'object') ? res.info : res;

  const height       = numOrNull(pick(root, ['height','Height']));
  const targetHeight = numOrNull(pick(root, ['target_height','targetheight','TargetHeight']));
  const targetSec    = numOrNull(pick(root, ['target','Target']));
  const difficulty   = numOrNull(pick(root, ['difficulty','Difficulty']));
  const topBlockHash = pick(root, ['top_block_hash','topblockhash','top_hash','hash','TopBlockHash']);

  const inc = numOrNull(pick(root, ['incoming_connections_count','incomingconnectionscount','incoming','IncomingConnectionsCount']));
  const out = numOrNull(pick(root, ['outgoing_connections_count','outgoingconnectionscount','outgoing','OutgoingConnectionsCount']));
  const peers = (inc !== null || out !== null) ? (inc || 0) + (out || 0) : null;

  const version = pick(root, ['version','daemon_version','full_version']) || pick(res, ['version']);
  return { height, target_height: targetHeight, target: targetSec, difficulty, version, top_block_hash: topBlockHash, peers };
}

function extractHeaderFields(obj) {
  if (!obj) return {}; const res = obj.result || obj; const hdr = (res && (res.block_header || res.header)) || res;
  const hash = pick(hdr, ['hash','top_hash','top_block_hash']);
  const height = numOrNull(pick(hdr, ['height','block_height']));
  const difficulty = numOrNull(pick(hdr, ['difficulty']));
  return { hash, height, difficulty };
}

function normalizeVersionField(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') {
    if (v > 0xffff) { const major = v >>> 16; const minor = v & 0xffff; return minor ? (major + '.' + minor) : String(major); }
    return String(v);
  }
  return null;
}

function parseAnyJsonFromFrames(msg) {
  const frames = Array.isArray(msg) ? msg : [msg];
  for (const f of frames) {
    const s = Buffer.isBuffer(f) ? f.toString() : String(f || '');
    if (!s) continue; try { const j = JSON.parse(s); if (j && typeof j === 'object') return j; } catch {}
  }
  return null;
}

async function tryPattern(sock, payload) { try { await sock.send(payload); const msg = await sock.receive(); return parseAnyJsonFromFrames(msg); } catch { return null; } }

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

async function tryReqPatterns(endpoint, method, paramsObj, timeoutMs) {
  // Walidacja wejścia
  if (!endpoint || typeof endpoint !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.error('Invalid endpoint:', endpoint);
    }
    return { used: null, raw: null };
  }
  if (!method || typeof method !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.error('Invalid method:', method);
    }
    return { used: null, raw: null };
  }
  
  const sock = new zmq.Request(); sock.receiveHighWaterMark = 1000;
  const timer = setTimeout(() => { try { sock.close(); } catch {} }, timeoutMs);
  let used = null, raw = null;
  try {
    sock.connect(endpoint);
    const patterns = buildPatterns(method, paramsObj);
    for (const p of patterns) { const resp = await tryPattern(sock, p.payload); if (resp) { used = p.name; raw = resp; break; } }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ZMQ request error:', e.message || e);
    }
  }
  clearTimeout(timer); try { sock.close(); } catch {}
  return { used, raw };
}

async function getInfoZmq(host, port = 19995, timeoutMs = 4000) {
  const endpoint = 'tcp://' + host + ':' + port;

  const infoCall = await tryReqPatterns(endpoint, 'get_info', {}, timeoutMs);
  const unified = unifyGetInfo(infoCall.raw) || {};
  let used = infoCall.used || null;

  let headerRaw = null, headerUsed = null;
  if (!unified.top_block_hash || isZeroHash(unified.top_block_hash)) {
    const mlist = ['get_last_block_header', 'getlastblockheader'];
    for (const m of mlist) {
      const tryHdr = await tryReqPatterns(endpoint, m, {}, timeoutMs);
      if (tryHdr.raw) { headerRaw = tryHdr.raw; headerUsed = tryHdr.used; break; }
    }
    const h = extractHeaderFields(headerRaw);
    if (h.hash && !isZeroHash(h.hash)) unified.top_block_hash = h.hash;
    if (unified.height == null && h.height != null) unified.height = h.height;
    if (unified.difficulty == null && h.difficulty != null) unified.difficulty = h.difficulty;
    if (headerUsed) used = (used ? used + '; ' : '') + headerUsed;
  }

  if (!normalizeVersionField(unified.version)) {
    const vlist = ['get_version', 'getversion'];
    for (const m of vlist) {
      const tryVer = await tryReqPatterns(endpoint, m, {}, timeoutMs);
      if (tryVer.raw) {
        const r = tryVer.raw.result || tryVer.raw;
        const v = normalizeVersionField(pick(r, ['version','daemon_version','full_version','release']));
        if (v) { unified.version = v; used = (used ? used + '; ' : '') + tryVer.used; break; }
      }
    }
  }
  return { unified, raw: { get_info: infoCall.raw, header: headerRaw }, used };
}

// ZMQ get_service_nodes (for /sn)
async function getServiceNodesZmq(host, port = 19995, timeoutMs = 4000) {
  const endpoint = 'tcp://' + host + ':' + port;
  const resp = await tryReqPatterns(endpoint, 'get_service_nodes', {}, timeoutMs);
  if (!resp.raw) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ZMQ] No response for get_service_nodes from ${host}:${port}`);
    }
    return { used: null, body: null };
  }
  
  // Próbuj różne struktury odpowiedzi
  const root = resp.raw.result || resp.raw;
  let states = [];
  
  if (Array.isArray(root.service_node_states)) {
    states = root.service_node_states;
  } else if (Array.isArray(root.service_nodes)) {
    states = root.service_nodes;
  } else if (Array.isArray(root)) {
    states = root;
  } else if (root && typeof root === 'object') {
    // Sprawdź czy może być zagnieżdżone
    const nested = root.service_node_states || root.service_nodes || root.states;
    if (Array.isArray(nested)) {
      states = nested;
    }
  }
  
  if (process.env.NODE_ENV === 'development' && states.length === 0 && resp.raw) {
    console.log(`[ZMQ] get_service_nodes response structure:`, JSON.stringify(resp.raw).substring(0, 200));
  }
  
  return { used: resp.used || 'get_service_nodes', body: { service_node_states: states } };
}

module.exports = { getInfoZmq, getServiceNodesZmq, tryReqPatterns };