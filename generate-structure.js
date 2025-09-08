// generate-structure.js
// ArQmA Network Bot — All-in-one generator (ZMQ-RPC first, header+version fallbacks, HTTP fallback, /restrict, /zmqdiag)

const fs = require('fs');
const path = require('path');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function write(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content); }

['handlers','commands','fetch','alerts','config','utils','data'].forEach(ensureDir);

/* ============== commands/helpme.js ============== */
write('commands/helpme.js',
"module.exports = (platform) => {\n" +
"  if (platform === 'discord') {\n" +
"    return [\n" +
"      '📜 Available Commands',\n" +
"      '',\n" +
"      '📊 !network - Get Arqma network statistics',\n" +
"      '🔗 !links - Display important Arqma-related links',\n" +
"      '⛏️ !pools - Display Arqma mining pools with hashrates',\n" +
"      '🛠️ !daemon_info - Detailed info (ZMQ-RPC first)',\n" +
"      '🧱 !helpme - Show this help message',\n" +
"      '🖥️ !nodes - Per-node status (ZMQ-RPC first)',\n" +
"      '🧪 !zmqdiag <NodeName> - Admin ZMQ diagnostics'\n" +
"    ].join('\\n');\n" +
"  }\n" +
"  return [\n" +
"    '📜 Available Commands',\n" +
"    '',\n" +
"    '📊 /network - Get Arqma network statistics',\n" +
"    '🔗 /links - Display important Arqma-related links',\n" +
"    '⛏️ /pools - Display Arqma mining pools with hashrates',\n" +
"    '🛠️ /daemon_info - Detailed info (ZMQ-RPC first)',\n" +
"    '🚫 /restrict <@user|id> - (admin) restrict commands 24h',\n" +
"    '❓ /helpme - Show this help message',\n" +
"    '🖥️ /nodes - Per-node status (ZMQ-RPC first)',\n" +
"    '🧪 /zmqdiag <NodeName> - Admin ZMQ diagnostics'\n" +
"  ].join('\\n');\n" +
"};\n"
);

/* ============== commands/links.js ============== */
write('commands/links.js',
"module.exports = () => [\n" +
"  '🔗 Important Links',\n" +
"  '',\n" +
"  '🌐 ArQmA website: https://arqma.com/',\n" +
"  '📂 Github: https://github.com/arqma',\n" +
"  '📖 Documentation: https://github.com/arqma/arqma/wiki/',\n" +
"  '🖥️ GUI Wallet: https://github.com/arqma/arqma-electron-wallet/releases/',\n" +
"  '📝 Paper Wallet: https://generate.arqma.com/',\n" +
"  '⛏️ Pool stats: https://miningpoolstats.stream/arqma',\n" +
"  '💬 Telegram: https://telegram.arqma.com/',\n" +
"  '🎮 Discord: https://chat.arqma.com/'\n" +
"].join('\\n');\n"
);

/* ============== commands/pools.js ============== */
write('commands/pools.js',
"const fetchPoolsData = require('../fetch/fetchPoolsData');\n" +
"module.exports = async () => await fetchPoolsData();\n"
);

/* ============== commands/network.js ============== */
write('commands/network.js',
"const fetchNetworkInfo = require('../fetch/fetchNetworkInfo');\n" +
"const fetchEmissionData = require('../fetch/fetchEmissionData');\n" +
"const fetchArqPrice = require('../fetch/fetchArqPrice');\n" +
"const fetchBtcToUsd = require('../fetch/fetchBtcToUsd');\n" +
"const fetchServiceNodeData = require('../fetch/fetchServiceNodeData');\n" +
"const formatNetworkStats = require('../utils/formatNetworkStats');\n" +
"\n" +
"module.exports = async () => {\n" +
"  const [networkData, emissionData, arqPrice, btcToUsd, sn] = await Promise.all([\n" +
"    fetchNetworkInfo(), fetchEmissionData(), fetchArqPrice(), fetchBtcToUsd(), fetchServiceNodeData()\n" +
"  ]);\n" +
"  const activeNodes = sn ? sn.activeNodes : undefined;\n" +
"  const awaitingNodes = sn ? sn.awaitingNodes : undefined;\n" +
"\n" +
"  return formatNetworkStats({\n" +
"    networkData, emissionData, arqPrice, btcToUsd, activeNodes, awaitingNodes\n" +
"  }) || 'Failed to fetch network data.';\n" +
"};\n"
);

/* ============== utils/zmqRpc.js (get_info + header + version fallbacks) ============== */
write('utils/zmqRpc.js',
"const zmq = require('zeromq');\n" +
"\n" +
"function numOrNull(v) { if (typeof v === 'number' && Number.isFinite(v)) return v; if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return +v; return null; }\n" +
"function pick(o, keys) { for (const k of keys) { if (o && o[k] != null) return o[k]; } return null; }\n" +
"const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';\n" +
"function isZeroHash(h) { return typeof h === 'string' && h.replace(/^0x/i,'').toLowerCase() === ZERO_HASH; }\n" +
"\n" +
"function unifyGetInfo(obj) {\n" +
"  if (!obj) return null;\n" +
"  const res = (obj && typeof obj === 'object' ? obj.result || obj : null) || {};\n" +
"  const root = (res && typeof res === 'object' && res.info && typeof res.info === 'object') ? res.info : res;\n" +
"\n" +
"  const height       = numOrNull(pick(root, ['height','Height']));\n" +
"  const targetHeight = numOrNull(pick(root, ['target_height','targetheight','TargetHeight']));\n" +
"  const targetSec    = numOrNull(pick(root, ['target','Target']));\n" +
"  const difficulty   = numOrNull(pick(root, ['difficulty','Difficulty']));\n" +
"  const topBlockHash = pick(root, ['top_block_hash','topblockhash','top_hash','hash','TopBlockHash']);\n" +
"\n" +
"  const inc = numOrNull(pick(root, ['incoming_connections_count','incomingconnectionscount','incoming','IncomingConnectionsCount']));\n" +
"  const out = numOrNull(pick(root, ['outgoing_connections_count','outgoingconnectionscount','outgoing','OutgoingConnectionsCount']));\n" +
"  const peers = (inc !== null || out !== null) ? (inc || 0) + (out || 0) : null;\n" +
"\n" +
"  // Do NOT treat status as version. Prefer explicit version fields only.\n" +
"  const version = pick(root, ['version','daemon_version','full_version']) || pick(res, ['version']);\n" +
"\n" +
"  return { height, target_height: targetHeight, target: targetSec, difficulty, version, top_block_hash: topBlockHash, peers };\n" +
"}\n" +
"\n" +
"function extractHeaderFields(obj) {\n" +
"  if (!obj) return {}; const res = obj.result || obj; const hdr = (res && (res.block_header || res.header)) || res;\n" +
"  const hash = pick(hdr, ['hash','top_hash','top_block_hash']);\n" +
"  const height = numOrNull(pick(hdr, ['height','block_height']));\n" +
"  const difficulty = numOrNull(pick(hdr, ['difficulty']));\n" +
"  return { hash, height, difficulty };\n" +
"}\n" +
"\n" +
"function normalizeVersionField(v) {\n" +
"  if (v == null) return null;\n" +
"  if (typeof v === 'string') return v.trim() || null;\n" +
"  if (typeof v === 'number') {\n" +
"    if (v > 0xffff) { const major = v >>> 16; const minor = v & 0xffff; return minor ? (major + '.' + minor) : String(major); }\n" +
"    return String(v);\n" +
"  }\n" +
"  return null;\n" +
"}\n" +
"\n" +
"function parseAnyJsonFromFrames(msg) {\n" +
"  const frames = Array.isArray(msg) ? msg : [msg];\n" +
"  for (const f of frames) {\n" +
"    const s = Buffer.isBuffer(f) ? f.toString() : String(f || '');\n" +
"    if (!s) continue; try { const j = JSON.parse(s); if (j && typeof j === 'object') return j; } catch {}\n" +
"  }\n" +
"  return null;\n" +
"}\n" +
"\n" +
"async function tryPattern(sock, payload) { try { await sock.send(payload); const msg = await sock.receive(); return parseAnyJsonFromFrames(msg); } catch { return null; } }\n" +
"\n" +
"function buildPatterns(method, paramsObj) {\n" +
"  const body2 = JSON.stringify({ jsonrpc: '2.0', id: '0', method, params: paramsObj || {} });\n" +
"  const bodyS = JSON.stringify({ method, params: paramsObj || {} });\n" +
"  return [\n" +
"    { name: `multipart:json_rpc:${method}:jsonrpc2`, payload: ['json_rpc', body2] },\n" +
"    { name: `multipart:json_rpc:${method}:simple`,   payload: ['json_rpc', bodyS] },\n" +
"    { name: `multipart:${method}:empty`,             payload: [method, ''] },\n" +
"    { name: `multipart:${method}:emptyObj`,          payload: [method, '{}'] },\n" +
"    { name: `single:${method}:jsonrpc2`,             payload: body2 },\n" +
"    { name: `single:${method}:simple`,               payload: bodyS }\n" +
"  ];\n" +
"}\n" +
"\n" +
"async function tryReqPatterns(endpoint, method, paramsObj, timeoutMs) {\n" +
"  const sock = new zmq.Request(); sock.receiveHighWaterMark = 1000;\n" +
"  const timer = setTimeout(() => { try { sock.close(); } catch {} }, timeoutMs);\n" +
"  let used = null, raw = null;\n" +
"  try {\n" +
"    sock.connect(endpoint);\n" +
"    const patterns = buildPatterns(method, paramsObj);\n" +
"    for (const p of patterns) { const resp = await tryPattern(sock, p.payload); if (resp) { used = p.name; raw = resp; break; } }\n" +
"  } catch {}\n" +
"  clearTimeout(timer); try { sock.close(); } catch {}\n" +
"  return { used, raw };\n" +
"}\n" +
"\n" +
"async function getInfoZmq(host, port = 19995, timeoutMs = 4000) {\n" +
"  const endpoint = 'tcp://' + host + ':' + port;\n" +
"\n" +
"  // 1) get_info\n" +
"  const infoCall = await tryReqPatterns(endpoint, 'get_info', {}, timeoutMs);\n" +
"  const unified = unifyGetInfo(infoCall.raw) || {};\n" +
"  let used = infoCall.used || null;\n" +
"\n" +
"  // 2) Fill top hash/height/difficulty via header if missing or zero\n" +
"  let headerRaw = null, headerUsed = null;\n" +
"  if (!unified.top_block_hash || isZeroHash(unified.top_block_hash)) {\n" +
"    const mlist = ['get_last_block_header', 'getlastblockheader'];\n" +
"    for (const m of mlist) {\n" +
"      const tryHdr = await tryReqPatterns(endpoint, m, {}, timeoutMs);\n" +
"      if (tryHdr.raw) { headerRaw = tryHdr.raw; headerUsed = tryHdr.used; break; }\n" +
"    }\n" +
"    const h = extractHeaderFields(headerRaw);\n" +
"    if (h.hash && !isZeroHash(h.hash)) unified.top_block_hash = h.hash;\n" +
"    if (unified.height == null && h.height != null) unified.height = h.height;\n" +
"    if (unified.difficulty == null && h.difficulty != null) unified.difficulty = h.difficulty;\n" +
"    if (headerUsed) used = (used ? used + '; ' : '') + headerUsed;\n" +
"  }\n" +
"\n" +
"  // 3) Fill version via get_version if missing\n" +
"  if (!normalizeVersionField(unified.version)) {\n" +
"    const vlist = ['get_version', 'getversion'];\n" +
"    for (const m of vlist) {\n" +
"      const tryVer = await tryReqPatterns(endpoint, m, {}, timeoutMs);\n" +
"      if (tryVer.raw) {\n" +
"        const r = tryVer.raw.result || tryVer.raw;\n" +
"        const v = normalizeVersionField(pick(r, ['version','daemon_version','full_version','release']));\n" +
"        if (v) { unified.version = v; used = (used ? used + '; ' : '') + tryVer.used; break; }\n" +
"      }\n" +
"    }\n" +
"  }\n" +
"\n" +
"  return { unified, raw: { get_info: infoCall.raw, header: headerRaw }, used };\n" +
"}\n" +
"\n" +
"module.exports = { getInfoZmq };\n"
);

/* ============== commands/nodes.js (ZMQ-RPC first, HTTP fallback) ============== */
write('commands/nodes.js',
"const axios = require('axios');\n" +
"const nodeList = require('../config/nodeList');\n" +
"const { getInfoZmq } = require('../utils/zmqRpc');\n" +
"\n" +
"async function getViaHttp(url) {\n" +
"  try {\n" +
"    const res = await axios.get(url, { timeout: 8000 });\n" +
"    const d = res.data || {};\n" +
"    const height = typeof d.height === 'number' ? d.height : 0;\n" +
"    const targetHeight = typeof d.target_height === 'number' ? d.target_height : height;\n" +
"    return { ok: true, height, targetHeight };\n" +
"  } catch (e) {\n" +
"    const offlineMsg = e && e.code === 'ECONNABORTED' ? '⌛ BUSY/SYNCING (timeout)'\n" +
"      : (e && e.response && e.response.status === 503) ? '⌛ SYNCING (HTTP 503)' : '❌ OFFLINE';\n" +
"    return { ok: false, errorType: offlineMsg };\n" +
"  }\n" +
"}\n" +
"\n" +
"function isMeaningful(z) { return !!(z && (typeof z.height === 'number' || typeof z.target_height === 'number')); }\n" +
"\n" +
"module.exports = async () => {\n" +
"  const results = await Promise.all(nodeList.map(async (node) => {\n" +
"    if (node.host) {\n" +
"      const data = await getInfoZmq(node.host, 19995, 4000);\n" +
"      const z = data && data.unified;\n" +
"      if (isMeaningful(z)) {\n" +
"        const height = z.height || 0;\n" +
"        const targetHeight = (typeof z.target_height === 'number') ? z.target_height : height;\n" +
"        return { name: node.name, online: true, height, targetHeight, via: 'ZMQ-RPC' };\n" +
"      }\n" +
"    }\n" +
"    const h = await getViaHttp(node.url);\n" +
"    if (h.ok) return { name: node.name, online: true, height: h.height, targetHeight: h.targetHeight, via: 'HTTP' };\n" +
"    return { name: node.name, online: false, errorType: h.errorType || '❌ OFFLINE' };\n" +
"  }));\n" +
"\n" +
"  const onlineHeights = results.filter(r => r.online).map(r => r.height);\n" +
"  const maxHeight = onlineHeights.length ? Math.max.apply(null, onlineHeights) : 0;\n" +
"\n" +
"  const lines = results.map(r => {\n" +
"    if (!r.online) return r.name + ' : ' + r.errorType;\n" +
"    const via = r.via ? ' (' + r.via + ')' : '';\n" +
"    if (r.height < maxHeight) {\n" +
"      return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ', Target Height: ' + maxHeight + ' (SYNCING ⏳)';\n" +
"    }\n" +
"    if (r.targetHeight > r.height) {\n" +
"      return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ', Target Height: ' + r.targetHeight + ' (SYNCING ⏳)';\n" +
"    }\n" +
"    return r.name + ' : ✅ ONLINE' + via + ' | Height: ' + r.height + ' (FULLY SYNCED ✅)';\n" +
"  });\n" +
"\n" +
"  return lines.join('\\n');\n" +
"};\n"
);

/* ============== commands/daemon_info.js (uses improved ZMQ mapping) ============== */
write('commands/daemon_info.js',
"const axios = require('axios');\n" +
"const nodeList = require('../config/nodeList');\n" +
"const { getInfoZmq } = require('../utils/zmqRpc');\n" +
"\n" +
"const BLOCK_TIME_SECONDS = 120;\n" +
"\n" +
"async function getViaHttp(url) {\n" +
"  try {\n" +
"    const res = await axios.get(url, { timeout: 8000 });\n" +
"    const d = res.data || {};\n" +
"    return {\n" +
"      ok: true,\n" +
"      via: 'HTTP',\n" +
"      height: (typeof d.height === 'number') ? d.height : null,\n" +
"      difficulty: (typeof d.difficulty === 'number') ? d.difficulty : null,\n" +
"      target: (typeof d.target === 'number') ? d.target : null,\n" +
"      version: d.version || d.daemon_version || null,\n" +
"      top: d.top_block_hash || d.top_hash || null,\n" +
"      peers: ((d.incoming_connections_count || 0) + (d.outgoing_connections_count || 0)) || null\n" +
"    };\n" +
"  } catch { return { ok: false }; }\n" +
"}\n" +
"\n" +
"function fmt(v, suffix) { return (v === null || v === undefined) ? 'Data unavailable' : String(v) + (suffix || ''); }\n" +
"function computeHashrate(difficulty, targetSec) {\n" +
"  const t = (typeof targetSec === 'number' && targetSec > 0) ? targetSec : BLOCK_TIME_SECONDS;\n" +
"  if (typeof difficulty !== 'number' || difficulty <= 0) return null;\n" +
"  return (difficulty / t / 1000000).toFixed(2) + ' MH/s';\n" +
"}\n" +
"function isMeaningful(z) { return !!(z && (typeof z.height === 'number' || typeof z.difficulty === 'number' || z.top_block_hash)); }\n" +
"\n" +
"module.exports = async () => {\n" +
"  const results = await Promise.all(nodeList.map(async (node) => {\n" +
"    if (node.host) {\n" +
"      const data = await getInfoZmq(node.host, 19995, 4000);\n" +
"      const z = data && data.unified;\n" +
"      if (isMeaningful(z)) {\n" +
"        const hashrate = computeHashrate(z.difficulty, z.target);\n" +
"        return { name: node.name, ok: true, via: 'ZMQ-RPC', height: z.height ?? null, difficulty: z.difficulty ?? null, target: z.target ?? null, version: z.version ?? null, top: z.top_block_hash ?? null, peers: z.peers ?? null, hashrate };\n" +
"      }\n" +
"    }\n" +
"    const h = await getViaHttp(node.url);\n" +
"    if (h.ok) return { name: node.name, ok: true, via: h.via, height: h.height, difficulty: h.difficulty, target: h.target, version: h.version, top: h.top, peers: h.peers, hashrate: computeHashrate(h.difficulty, h.target) };\n" +
"    return { name: node.name, ok: false };\n" +
"  }));\n" +
"\n" +
"  const sections = results.map(r => {\n" +
"    if (!r.ok) return '**' + r.name + '** : ❌ Unreachable';\n" +
"    return [\n" +
"      '🛠️ ' + '**' + r.name + '**' + '  ' + '_' + r.via + '_',\n" +
"      '💻 Network Hashrate: ' + fmt(r.hashrate),\n" +
"      '📊 Height: ' + fmt(r.height),\n" +
"      '🔗 Top Block Hash: ' + fmt(r.top),\n" +
"      '🔄 Version: ' + fmt(r.version),\n" +
"      '📡 Peers Connected: ' + fmt(r.peers)\n" +
"    ].join('\\n');\n" +
"  });\n" +
"\n" +
"  return sections.join('\\n\\n');\n" +
"};\n"
);

/* ============== commands/restrict.js ============== */
write('commands/restrict.js',
"const { addRestricts } = require('../utils/restrictlist');\n" +
"\n" +
"module.exports = async ({ msg, text, ALERT_USER_ID }) => {\n" +
"  const callerId = msg.from && msg.from.id;\n" +
"  if (!callerId || String(callerId) !== String(ALERT_USER_ID)) return '⛔ You are not allowed to use this command.';\n" +
"  const args = (text || '').split(/\\s+/).slice(1);\n" +
"  if (!args.length) return 'Usage: /restrict <@username|id>';\n" +
"\n" +
"  const raw = args[0];\n" +
"  let username = null, id = null;\n" +
"  if (/^@/.test(raw)) username = raw.replace(/^@+/, '').trim().toLowerCase();\n" +
"  else if (/^\\d+$/.test(raw)) id = raw.trim();\n" +
"  else username = raw.trim().toLowerCase();\n" +
"  if (!username && !id) return 'Provide a valid @username or numeric id.';\n" +
"\n" +
"  const records = [];\n" +
"  if (username) records.push({ type: 'username', value: username });\n" +
"  if (id) records.push({ type: 'id', value: String(id) });\n" +
"  const when = new Date();\n" +
"  addRestricts(records, when);\n" +
"\n" +
"  return '🚫 Restricted for 24h: ' + (username ? '@' + username : '') + (id ? ' (id:' + id + ')' : '') + ' — Commands disabled on Telegram & Discord for 24 hours.\\nAdded at: ' + when.toISOString();\n" +
"};\n"
);

/* ============== commands/zmqdiag.js ============== */
write('commands/zmqdiag.js',
"const nodeList = require('../config/nodeList');\n" +
"const { getInfoZmq } = require('../utils/zmqRpc');\n" +
"\n" +
"function val(v) { return (v === null || v === undefined) ? 'null' : String(v); }\n" +
"\n" +
"module.exports = async ({ name, ALERT_USER_ID, fromId }) => {\n" +
"  if (!fromId || String(fromId) !== String(ALERT_USER_ID)) return '⛔ You are not allowed to use this command.';\n" +
"  const node = nodeList.find(n => n.name.toLowerCase() === String(name || '').toLowerCase());\n" +
"  if (!node) return 'Usage: zmqdiag <NodeName> — unknown node.';\n" +
"  const info = await getInfoZmq(node.host, 19995, 4000);\n" +
"  const u = (info && info.unified) || {};\n" +
"  const used = (info && info.used) || 'none';\n" +
"  const raw = info && info.raw;\n" +
"\n" +
"  const lines = [];\n" +
"  lines.push('🔎 ZMQ DIAG for ' + node.name + ' @ tcp://' + node.host + ':19995');\n" +
"  lines.push('Pattern: ' + used);\n" +
"  lines.push('');\n" +
"  lines.push('Unified:');\n" +
"  lines.push('- height: ' + val(u.height));\n" +
"  lines.push('- target_height: ' + val(u.target_height));\n" +
"  lines.push('- target: ' + val(u.target));\n" +
"  lines.push('- difficulty: ' + val(u.difficulty));\n" +
"  lines.push('- version: ' + val(u.version));\n" +
"  lines.push('- top_block_hash: ' + val(u.top_block_hash));\n" +
"  lines.push('- peers: ' + val(u.peers));\n" +
"  lines.push('');\n" +
"  lines.push('Raw JSON (pretty):');\n" +
"  if (raw) { try { lines.push(JSON.stringify(raw, null, 2)); } catch { lines.push('(raw present but failed to stringify)'); } }\n" +
"  else { lines.push('(no JSON parsed)'); }\n" +
"\n" +
"  return lines.join('\\n');\n" +
"};\n"
);

/* ============== fetchers (unchanged) ============== */
write('fetch/fetchArqPrice.js',
"const axios = require('axios');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://tradeogre.com/api/v1/ticker/arq-btc');\n" +
"    if (!response.data || !response.data.price) return null;\n" +
"    const priceBtc = parseFloat(response.data.price).toFixed(8);\n" +
"    const priceSat = Math.round(parseFloat(response.data.price) * 100000000);\n" +
"    const volumeBtc = parseFloat(response.data.volume || 0);\n" +
"    return { priceBtc, priceSat, volumeBtc };\n" +
"  } catch { return null; }\n" +
"};\n"
);

write('fetch/fetchBtcToUsd.js',
"const axios = require('axios');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');\n" +
"    return response.data && response.data.price ? parseFloat(response.data.price) : null;\n" +
"  } catch { return null; }\n" +
"};\n"
);

write('fetch/fetchEmissionData.js',
"const axios = require('axios');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://explorer.arqma.com/api/emission');\n" +
"    const val = response && response.data && response.data.data && response.data.data.coinbase;\n" +
"    if (typeof val !== 'number') return null;\n" +
"    const emission = Math.floor(val / 100000);\n" +
"    return { emission: emission.toString().slice(0, 8) };\n" +
"  } catch { return null; }\n" +
"};\n"
);

write('fetch/fetchNetworkInfo.js',
"const axios = require('axios');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://explorer.arqma.com/api/networkinfo');\n" +
"    const data = response && response.data && response.data.data;\n" +
"    if (!data) return null;\n" +
"    return { height: data.height, hashrate: ((data.hash_rate || 0) / 1000000).toFixed(2), difficulty: data.difficulty };\n" +
"  } catch { return null; }\n" +
"};\n"
);

write('fetch/fetchPoolsData.js',
"const axios = require('axios');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://miningpoolstats.stream/arqma');\n" +
"    const tMatch = response.data && response.data.match(/var last_time = \"([^\"]+)\"/);\n" +
"    if (!tMatch) return 'Failed to fetch pool data.';\n" +
"    const t = tMatch[1];\n" +
"    const poolsQueryUrl = 'https://data.miningpoolstats.stream/data/arqma.js?t=' + t;\n" +
"    const poolsQuery = await axios.get(poolsQueryUrl);\n" +
"    const poolsInfo = (poolsQuery.data && poolsQuery.data.data) ? poolsQuery.data.data : [];\n" +
"    const sorted = poolsInfo.sort((a, b) => (b.hashrate || 0) - (a.hashrate || 0));\n" +
"    let total = 0;\n" +
"    const lines = sorted.map(p => {\n" +
"      const name = p.pool_id || 'Unknown Pool';\n" +
"      const h = p.hashrate || 0; total += h;\n" +
"      if (h >= 1000000) return '⛏️ ' + name + ': ' + (h / 1000000).toFixed(2) + ' MH/s';\n" +
"      if (h >= 1000) return '⛏️ ' + name + ': ' + (h / 1000).toFixed(2) + ' KH/s';\n" +
"      return '⛏️ ' + name + ': ' + h + ' H/s';\n" +
"    }).join('\\n');\n" +
"    return '🌐 Total Pool Hashrate: ' + (total / 1000000).toFixed(2) + ' MH/s\\n\\n' + lines;\n" +
"  } catch { return 'Failed to fetch pool data.'; }\n" +
"};\n"
);

write('fetch/fetchServiceNodeData.js',
"const axios = require('axios');\n" +
"const cheerio = require('cheerio');\n" +
"module.exports = async () => {\n" +
"  try {\n" +
"    const response = await axios.get('https://explorer.arqma.com/service_nodes');\n" +
"    const $ = cheerio.load(response.data || '');\n" +
"    const activeNodesText = $('body > div:nth-child(3) > h2:nth-child(4)').text().trim();\n" +
"    const activeNodes = parseInt((activeNodesText || '').replace(/\\D/g, ''), 10) || 0;\n" +
"    const awaitingNodesText = $('#service-nodes-awaiting > span:nth-child(1)').text().trim();\n" +
"    const awaitingNodes = parseInt((awaitingNodesText || '').replace(/\\D/g, ''), 10) || 0;\n" +
"    return { activeNodes, awaitingNodes };\n" +
"  } catch { return { activeNodes: 0, awaitingNodes: 0 }; }\n" +
"};\n"
);

/* ============== utils/formatNetworkStats.js ============== */
write('utils/formatNetworkStats.js',
"module.exports = function formatNetworkStats(params) {\n" +
"  const networkData = params.networkData;\n" +
"  const emissionData = params.emissionData;\n" +
"  const arqPrice = params.arqPrice;\n" +
"  const btcToUsd = params.btcToUsd;\n" +
"  const activeNodes = params.activeNodes;\n" +
"  const awaitingNodes = params.awaitingNodes;\n" +
"\n" +
"  const parts = [];\n" +
"  parts.push('🔗 Arqma Network Stats');\n" +
"  parts.push('');\n" +
"  parts.push('📊 Network Height: ' + (networkData && networkData.height !== undefined ? networkData.height : 'Data unavailable'));\n" +
"  parts.push('💻 Network Hashrate: ' + (networkData && networkData.hashrate !== undefined ? (networkData.hashrate + ' MH/s') : 'Data unavailable'));\n" +
"  parts.push('⚙️ Network Difficulty: ' + (networkData && networkData.difficulty !== undefined ? networkData.difficulty : 'Data unavailable'));\n" +
"  parts.push('🪙 Total Emission (Coinbase): ' + (emissionData && emissionData.emission !== undefined ? (emissionData.emission + ' ARQ') : 'Data unavailable'));\n" +
"\n" +
"  if (arqPrice && btcToUsd) {\n" +
"    const volumeUsd = (arqPrice.volumeBtc * btcToUsd).toFixed(2);\n" +
"    const volumeArq = (arqPrice.volumeBtc / arqPrice.priceBtc).toFixed(2);\n" +
"    parts.push('💰 TO Price: ' + arqPrice.priceBtc + ' BTC (' + arqPrice.priceSat + ' sat)');\n" +
"    parts.push('💰 TO 24h Volume: ' + volumeArq + ' ARQ ($' + volumeUsd + ' USD)');\n" +
"  } else {\n" +
"    parts.push('💰 TO Price: Data unavailable');\n" +
"    parts.push('💰 TO 24h Volume: Data unavailable');\n" +
"  }\n" +
"\n" +
"  parts.push('💰 BTC Price: ' + ((btcToUsd !== undefined && btcToUsd !== null) ? btcToUsd.toFixed(2) : 'Data unavailable') + ' USD');\n" +
"  parts.push('🌐 Active Service Nodes: ' + (activeNodes !== undefined ? (activeNodes + ' nodes') : 'Data unavailable'));\n" +
"  parts.push('🌐 Service Nodes Awaiting Contributions: ' + (awaitingNodes !== undefined ? (awaitingNodes + ' nodes') : 'Data unavailable'));\n" +
"  return parts.join('\\n');\n" +
"};\n"
);

/* ============== utils/blocklist.js ============== */
write('utils/blocklist.js',
"const fs = require('fs');\n" +
"const path = require('path');\n" +
"\n" +
"const DATA_DIR = path.join(__dirname, '..', 'data');\n" +
"const FILE = path.join(DATA_DIR, 'blocks.json');\n" +
"\n" +
"function load() {\n" +
"  try {\n" +
"    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });\n" +
"    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ usernames: [], ids: [] }, null, 2));\n" +
"    const raw = fs.readFileSync(FILE, 'utf8');\n" +
"    const parsed = JSON.parse(raw || '{}');\n" +
"    return { usernames: Array.isArray(parsed.usernames) ? parsed.usernames : [], ids: Array.isArray(parsed.ids) ? parsed.ids : [] };\n" +
"  } catch { return { usernames: [], ids: [] }; }\n" +
"}\n" +
"\n" +
"function save(data) { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }\n" +
"\n" +
"function normalizeUsername(u) { return (u || '').replace(/^@+/, '').trim().toLowerCase(); }\n" +
"\n" +
"function addBlocks(records) {\n" +
"  const store = load(); let changed = false;\n" +
"  for (const rec of records) {\n" +
"    if (rec.type === 'username') {\n" +
"      const u = normalizeUsername(rec.value);\n" +
"      if (u && store.usernames.indexOf(u) === -1) { store.usernames.push(u); changed = true; }\n" +
"    } else if (rec.type === 'id') {\n" +
"      const id = String(rec.value || '').trim();\n" +
"      if (id && store.ids.indexOf(id) === -1) { store.ids.push(id); changed = true; }\n" +
"    }\n" +
"  }\n" +
"  if (changed) save(store); return store;\n" +
"}\n" +
"\n" +
"function isBlocked(info) {\n" +
"  const store = load();\n" +
"  const uid = info && info.id != null ? String(info.id) : null;\n" +
"  const uname = normalizeUsername(info && info.username);\n" +
"  if (uid && store.ids.indexOf(uid) !== -1) return true;\n" +
"  if (uname && store.usernames.indexOf(uname) !== -1) return true;\n" +
"  return false;\n" +
"}\n" +
"\n" +
"module.exports = { load, save, addBlocks, isBlocked, normalizeUsername };\n"
);

/* ============== utils/restrictlist.js ============== */
write('utils/restrictlist.js',
"const fs = require('fs');\n" +
"const path = require('path');\n" +
"const { normalizeUsername } = require('./blocklist');\n" +
"\n" +
"const DATA_DIR = path.join(__dirname, '..', 'data');\n" +
"const JSON_FILE = path.join(DATA_DIR, 'restrict.json');\n" +
"const TXT_FILE = path.join(DATA_DIR, 'restricted.txt');\n" +
"\n" +
"function ensureFiles() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(JSON_FILE)) fs.writeFileSync(JSON_FILE, JSON.stringify({ usernames: {}, ids: {} }, null, 2)); if (!fs.existsSync(TXT_FILE)) fs.writeFileSync(TXT_FILE, ''); }\n" +
"function load() { ensureFiles(); try { return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8') || '{}'); } catch { return { usernames: {}, ids: {} }; } }\n" +
"function save(data) { ensureFiles(); fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2)); }\n" +
"\n" +
"function addRestricts(records, when = new Date()) {\n" +
"  const store = load(); let changed = false;\n" +
"  records.forEach(rec => {\n" +
"    if (rec.type === 'username') { const u = normalizeUsername(rec.value); if (u) { store.usernames[u] = when.toISOString(); changed = true; } }\n" +
"    else if (rec.type === 'id') { const id = String(rec.value || '').trim(); if (id) { store.ids[id] = when.toISOString(); changed = true; } }\n" +
"  });\n" +
"  if (changed) { save(store); const line = records.map(r => r.type === 'username' ? ('username=' + normalizeUsername(r.value)) : ('id=' + String(r.value).trim())).join(', '); fs.appendFileSync(TXT_FILE, '[' + when.toISOString() + '] ' + line + '\\n'); }\n" +
"  return store;\n" +
"}\n" +
"\n" +
"function isRestricted(info, now = new Date()) {\n" +
"  const store = load(); const uid = info && info.id != null ? String(info.id) : null; const uname = normalizeUsername(info && info.username);\n" +
"  const ts = (uid && store.ids[uid]) || (uname && store.usernames[uname]); if (!ts) return { restricted: false };\n" +
"  const since = new Date(ts).getTime() || 0; const ms = now.getTime() - since; const day = 24*60*60*1000;\n" +
"  if (ms < day) return { restricted: true, remainingMs: day - ms };\n" +
"  if (uid && store.ids[uid]) delete store.ids[uid]; if (uname && store.usernames[uname]) delete store.usernames[uname]; save(store); return { restricted: false };\n" +
"}\n" +
"\n" +
"module.exports = { addRestricts, isRestricted };\n"
);

/* ============== alerts/nodeAlerter.js ============== */
write('alerts/nodeAlerter.js',
"const axios = require('axios');\n" +
"require('dotenv').config();\n" +
"const DISCORD_ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;\n" +
"\n" +
"module.exports = async (nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot) => {\n" +
"  const results = await Promise.all(nodeList.map(async (node) => {\n" +
"    try { const res = await axios.get(node.url, { timeout: 10000 }); const data = res.data || {}; return { online: true, height: data.height || 0, target_height: data.target_height || 0, node };\n" +
"    } catch { return { online: false, height: null, target_height: null, node }; }\n" +
"  }));\n" +
"\n" +
"  const online = results.filter(r => r.online);\n" +
"  const maxHeight = online.length ? Math.max(...online.map(r => r.height || 0)) : 0;\n" +
"\n" +
"  async function sendAlert(text) {\n" +
"    if (telegramBot && ALERT_USER_ID) { try { await telegramBot.sendMessage(ALERT_USER_ID, text, { disable_web_page_preview: true }); } catch {} }\n" +
"    if (discordBot && discordBot.channels?.cache && DISCORD_ALERT_CHANNEL_ID) {\n" +
"      const ch = discordBot.channels.cache.get(DISCORD_ALERT_CHANNEL_ID);\n" +
"      if (ch) { try { await ch.send(text); } catch {} }\n" +
"    }\n" +
"  }\n" +
"\n" +
"  for (let i = 0; i < results.length; i++) {\n" +
"    const r = results[i];\n" +
"    const st = nodeAlertState[i] || (nodeAlertState[i] = { offline:false, behind:false, offlineCount:0 });\n" +
"\n" +
"    if (!r.online) {\n" +
"      st.offlineCount++;\n" +
"      if (!st.offline && st.offlineCount >= 4) { await sendAlert(`🚨 [NODE ALERT]\\n${r.node.name} is OFFLINE for ${st.offlineCount} minutes!`); st.offline = true; }\n" +
"      st.behind = false; continue;\n" +
"    } else {\n" +
"      if (st.offline) { await sendAlert(`✅ [NODE ALERT]\\n${r.node.name} is back ONLINE!`); st.offline = false; }\n" +
"      st.offlineCount = 0;\n" +
"    }\n" +
"\n" +
"    if (r.height && maxHeight && (maxHeight - r.height > 4)) {\n" +
"      if (!st.behind) { await sendAlert(`🚨 [NODE ALERT]\\n${r.node.name} is OUT OF SYNC by ${maxHeight - r.height} blocks (Current: ${r.height}, Highest: ${maxHeight})!`); st.behind = true; }\n" +
"    } else {\n" +
"      if (st.behind) { await sendAlert(`✅ [NODE ALERT]\\n${r.node.name} is now back IN SYNC. (Height: ${r.height})`); st.behind = false; }\n" +
"    }\n" +
"  }\n" +
"};\n"
);

/* ============== handlers/telegramHandler.js (plain text + <pre> for diag) ============== */
write('handlers/telegramHandler.js',
"const TelegramBot = require('node-telegram-bot-api');\n" +
"const helpme = require('../commands/helpme');\n" +
"const links = require('../commands/links');\n" +
"const pools = require('../commands/pools');\n" +
"const daemon_info = require('../commands/daemon_info');\n" +
"const network = require('../commands/network');\n" +
"const nodes = require('../commands/nodes');\n" +
"const restrictCmd = require('../commands/restrict');\n" +
"const zmqdiag = require('../commands/zmqdiag');\n" +
"const { isBlocked } = require('../utils/blocklist');\n" +
"const { isRestricted } = require('../utils/restrictlist');\n" +
"\n" +
"function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }\n" +
"function formatRemaining(ms) { const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return `${h}h ${m}m ${s}s`; }\n" +
"\n" +
"module.exports = (TELEGRAM_TOKEN, ALERT_USER_ID) => {\n" +
"  const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });\n" +
"\n" +
"  async function safeSend(chatId, text) { return telegramBot.sendMessage(chatId, text, { disable_web_page_preview: true }); }\n" +
"  async function sendPre(chatId, text) { return telegramBot.sendMessage(chatId, `<pre>${escapeHtml(text)}</pre>`, { parse_mode: 'HTML', disable_web_page_preview: true }); }\n" +
"\n" +
"  function guard(handler) {\n" +
"    return async (msg, match) => {\n" +
"      const blocked = isBlocked({ id: msg.from?.id, username: msg.from?.username });\n" +
"      if (blocked) { try { await safeSend(msg.chat.id, '⛔ You are blocked from using commands.'); } catch {} return; }\n" +
"      const rest = isRestricted({ id: msg.from?.id, username: msg.from?.username });\n" +
"      if (rest.restricted) { try { await safeSend(msg.chat.id, `🚫 You are restricted from using commands for ${formatRemaining(rest.remainingMs)}.`); } catch {} return; }\n" +
"      return handler(msg, match);\n" +
"    };\n" +
"  }\n" +
"\n" +
"  telegramBot.onText(/\\/helpme/, guard((msg) => safeSend(msg.chat.id, helpme('telegram'))));\n" +
"  telegramBot.onText(/\\/links/,  guard((msg) => safeSend(msg.chat.id, links())));\n" +
"  telegramBot.onText(/\\/pools/,  guard(async (msg) => safeSend(msg.chat.id, await pools())));\n" +
"  telegramBot.onText(/\\/daemon_info/, guard(async (msg) => safeSend(msg.chat.id, await daemon_info())));\n" +
"  telegramBot.onText(/\\/network/, guard(async (msg) => safeSend(msg.chat.id, await network())));\n" +
"  telegramBot.onText(/\\/nodes/,   guard(async (msg) => safeSend(msg.chat.id, await nodes())));\n" +
"\n" +
"  telegramBot.onText(/^\\/restrict(\\s+.+)?$/, async (msg) => {\n" +
"    const text = msg.text || '';\n" +
"    const resp = await restrictCmd({ msg, text, ALERT_USER_ID });\n" +
"    try { await safeSend(msg.chat.id, resp); } catch {}\n" +
"  });\n" +
"\n" +
"  telegramBot.onText(/^\\/zmqdiag\\s+(\\S+)/, async (msg, match) => {\n" +
"    const name = match && match[1];\n" +
"    const fromId = msg.from && msg.from.id;\n" +
"    const resp = await zmqdiag({ name, ALERT_USER_ID, fromId });\n" +
"    try { await sendPre(msg.chat.id, resp); } catch {}\n" +
"  });\n" +
"\n" +
"  console.log('Telegram bot is ready!');\n" +
"  return telegramBot;\n" +
"};\n"
);

/* ============== handlers/discordHandler.js ============== */
write('handlers/discordHandler.js',
"const { Client, GatewayIntentBits, Partials } = require('discord.js');\n" +
"const helpme = require('../commands/helpme');\n" +
"const links = require('../commands/links');\n" +
"const pools = require('../commands/pools');\n" +
"const daemon_info = require('../commands/daemon_info');\n" +
"const network = require('../commands/network');\n" +
"const nodes = require('../commands/nodes');\n" +
"const nodeAlerter = require('../alerts/nodeAlerter');\n" +
"const nodeList = require('../config/nodeList');\n" +
"const zmqdiag = require('../commands/zmqdiag');\n" +
"const { isBlocked } = require('../utils/blocklist');\n" +
"const { isRestricted } = require('../utils/restrictlist');\n" +
"\n" +
"function formatRemaining(ms) { const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); const s = Math.floor((ms % 60000) / 1000); return h + 'h ' + m + 'm ' + s + 's'; }\n" +
"\n" +
"module.exports = (DISCORD_TOKEN, telegramBot, ALERT_USER_ID) => {\n" +
"  const discordBot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel] });\n" +
"\n" +
"  discordBot.once('ready', () => {\n" +
"    let nodeAlertState = nodeList.map(() => ({ offline: false, behind: false, offlineCount: 0 }));\n" +
"    setInterval(() => nodeAlerter(nodeList, nodeAlertState, telegramBot, ALERT_USER_ID, discordBot), 60 * 1000);\n" +
"    console.log('Discord bot is ready!');\n" +
"  });\n" +
"\n" +
"  discordBot.on('messageCreate', async (message) => {\n" +
"    if (message.author.bot) return;\n" +
"    const blocked = isBlocked({ id: message.author?.id, username: message.author?.username });\n" +
"    if (blocked) { try { await message.reply('⛔ You are blocked from using commands.'); } catch {} return; }\n" +
"    const rest = isRestricted({ id: message.author?.id, username: message.author?.username });\n" +
"    if (rest.restricted) { try { await message.reply('🚫 You are restricted from using commands for ' + formatRemaining(rest.remainingMs) + '.'); } catch {} return; }\n" +
"\n" +
"    const content = (message.content || '').trim();\n" +
"    const lc = content.toLowerCase();\n" +
"    if (lc === '!helpme')           { message.channel.send(helpme('discord')); }\n" +
"    else if (lc === '!links')       { message.channel.send(links()); }\n" +
"    else if (lc === '!pools')       { message.channel.send(await pools()); }\n" +
"    else if (lc === '!daemon_info') { message.channel.send(await daemon_info()); }\n" +
"    else if (lc === '!network')     { message.channel.send(await network()); }\n" +
"    else if (lc === '!nodes')       { message.channel.send(await nodes()); }\n" +
"    else if (lc.indexOf('!zmqdiag ') === 0) {\n" +
"      const name = content.slice('!zmqdiag '.length).trim();\n" +
"      const resp = await zmqdiag({ name, ALERT_USER_ID, fromId: message.author?.id });\n" +
"      message.channel.send(resp);\n" +
"    }\n" +
"  });\n" +
"\n" +
"  discordBot.login(DISCORD_TOKEN).catch(err => console.error('Discord login failed:', err));\n" +
"  return discordBot;\n" +
"};\n"
);

/* ============== config/nodeList.js (no SNNAT; add ZMQ hosts) ============== */
write('config/nodeList.js',
"// Fill hosts with public IPs/hostnames where ZMQ-RPC listens on port 19995\n" +
"module.exports = [\n" +
"  { name: 'Node1', host: 'node1.arqma.com', url: 'http://node1.arqma.com:19994/get_info' },\n" +
"  { name: 'Node2', host: 'node2.arqma.com', url: 'http://node2.arqma.com:19994/get_info' },\n" +
"  { name: 'Node3', host: 'node3.arqma.com', url: 'http://node3.arqma.com:19994/get_info' },\n" +
"  { name: 'Node4', host: 'node4.arqma.com', url: 'http://node4.arqma.com:19994/get_info' },\n" +
"  { name: 'Pool',  host: '127.0.0.1',       url: 'http://127.0.0.1:19998/get_info' }\n" +
"];\n"
);

/* ============== bot.js ============== */
write('bot.js',
"require('dotenv').config();\n" +
"const startTelegram = require('./handlers/telegramHandler');\n" +
"const startDiscord = require('./handlers/discordHandler');\n" +
"\n" +
"const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;\n" +
"const DISCORD_TOKEN = process.env.DISCORD_TOKEN;\n" +
"const ALERT_USER_ID = process.env.ALERT_USER_ID ? Number(process.env.ALERT_USER_ID) : null;\n" +
"\n" +
"if (!TELEGRAM_TOKEN || !DISCORD_TOKEN || !ALERT_USER_ID || !process.env.DISCORD_ALERT_CHANNEL_ID) {\n" +
"  console.error('Missing required environment variables! (TELEGRAM_TOKEN, DISCORD_TOKEN, ALERT_USER_ID, DISCORD_ALERT_CHANNEL_ID)');\n" +
"  process.exit(1);\n" +
"}\n" +
"\n" +
"(async () => {\n" +
"  const telegramBot = startTelegram(TELEGRAM_TOKEN, ALERT_USER_ID);\n" +
"  startDiscord(DISCORD_TOKEN, telegramBot, ALERT_USER_ID);\n" +
"})();\n"
);

/* ============== .env (sample) ============== */
write('.env',
"TELEGRAM_TOKEN=YOUR_TELEGRAM_TOKEN\n" +
"DISCORD_TOKEN=YOUR_DISCORD_TOKEN\n" +
"ALERT_USER_ID=YOUR_TELEGRAM_USER_ID\n" +
"DISCORD_ALERT_CHANNEL_ID=YOUR_DISCORD_CHANNEL_ID\n"
);

/* ============== package.json ============== */
write('package.json',
"{\n" +
"  \"name\": \"arqma-bot\",\n" +
"  \"version\": \"2.5.0\",\n" +
"  \"description\": \"Discord & Telegram bot for ArQmA network (ZMQ-RPC first with header+version fallbacks, HTTP fallback, /restrict, /zmqdiag).\",\n" +
"  \"main\": \"bot.js\",\n" +
"  \"type\": \"commonjs\",\n" +
"  \"scripts\": { \"start\": \"node bot.js\" },\n" +
"  \"dependencies\": {\n" +
"    \"axios\": \"^1.7.7\",\n" +
"    \"cheerio\": \"^1.1.0\",\n" +
"    \"discord.js\": \"^14.16.3\",\n" +
"    \"dotenv\": \"^16.4.5\",\n" +
"    \"node-telegram-bot-api\": \"^0.66.0\",\n" +
"    \"zeromq\": \"^6.0.0\"\n" +
"  }\n" +
"}\n"
);

/* ============== README.md ============== */
write('README.md',
'# ArQmA Network Bot (ZMQ-RPC first, robust)\\n\\n' +
'- Primary data via ZMQ-RPC tcp://<host>:19995 for /nodes and /daemon_info.\\n' +
'- If get_info top hash is zero/missing, bot calls get_last_block_header and uses that hash.\\n' +
'- If version is missing, bot calls get_version and normalizes it (e.g., major.minor).\\n' +
'- Correct hashrate = difficulty / target (fallback target = 120s).\\n' +
'- HTTP fallback only if ZMQ-RPC yields no meaningful data.\\n' +
'- /restrict (24h) logged in data/restricted.txt and enforced on Telegram & Discord.\\n' +
'- /zmqdiag <NodeName> for admin diagnostics (pattern used + raw JSON).\\n\\n' +
'Setup:\\n' +
'1) node generate-structure.js\\n' +
'2) npm install\\n' +
'3) fill .env\\n' +
'4) run daemons with --zmq-rpc-bind-ip 0.0.0.0 --zmq-rpc-bind-port 19995\\n' +
'5) open TCP 19995\\n' +
'6) edit config/nodeList.js with public hosts\\n' +
'7) npm start\\n'
);

console.log('✅ Project generated. Next steps:');
console.log('1) npm install');
console.log('2) fill .env');
console.log('3) ensure daemons expose ZMQ-RPC on 19995');
console.log('4) npm start');

