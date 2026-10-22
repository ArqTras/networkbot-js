const zmq = require('zeromq');

const states = new Map();   // host -> { height, target, difficulty, version, top, peers, lastUpdate }
const sockets = new Map();
const RETRY_MS = 10_000;

function ensureState(host) {
  if (!states.has(host)) states.set(host, { lastUpdate: 0 });
  return states.get(host);
}

async function runLoop(host, sub) {
  for await (const [topic, msg] of sub) {
    const st = ensureState(host);
    try {
      // spróbuj JSON
      try {
        const p = JSON.parse(msg.toString());
        if (typeof p.height === 'number') st.height = p.height;
        if (typeof p.difficulty === 'number') st.difficulty = p.difficulty;
        if (typeof p.target === 'number') st.target = p.target; // czas bloku (sek)
        if (p.version !== undefined) st.version = p.version;
        if (p.hash) st.top = p.hash;
        const inc = p.incoming_connections_count || 0;
        const out = p.outgoing_connections_count || 0;
        if (inc || out) st.peers = inc + out;
        st.lastUpdate = Date.now();
        continue;
      } catch {}
      // nie-JSON: przyjmij jako hash / payload
      if (msg) st.top = msg.toString();
      if (st.height != null) st.height = (st.height || 0) + 1;
      st.lastUpdate = Date.now();
    } catch {}
  }
}

async function connectHost(host) {
  if (sockets.has(host)) return;
  const endpoint = `tcp://${host}:19995`;
  const sub = new zmq.Subscriber();
  try {
    sub.connect(endpoint);
    sub.subscribe(''); // złap wszystkie tematy
    sub.receiveHighWaterMark = 1000;
    sockets.set(host, sub);
    console.log(`📡 ZMQ connected: ${endpoint}`);
    runLoop(host, sub).catch(() => {});
  } catch (e) {
    console.error(`ZMQ connect failed for ${endpoint}: `, e.message);
    try { sub.close(); } catch {}
    sockets.delete(host);
    setTimeout(() => connectHost(host).catch(() => {}), RETRY_MS);
  }
}

async function startMultiZmq(hosts = []) {
  await Promise.all(hosts.map(connectHost));
  setInterval(() => {
    for (const host of hosts) if (!sockets.has(host)) connectHost(host).catch(() => {});
  }, RETRY_MS);
}

function getState(host) {
  const st = states.get(host);
  return st ? { ...st } : null;
}

module.exports = { startMultiZmq, getState };