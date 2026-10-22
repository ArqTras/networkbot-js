// Opcjonalny lokalny subscriber (nieużywany bezpośrednio przez komendy)
const zmq = require('zeromq');

const state = {
  height: 0,
  top_block_hash: null,
  difficulty: null,
  target: null,
  version: null,
  database_size: null,
  incoming_connections_count: 0,
  outgoing_connections_count: 0,
  lastUpdate: null
};

let started = false;

async function startZmqListener() {
  if (started) return;
  started = true;

  const sock = new zmq.Subscriber();
  sock.connect('tcp://127.0.0.1:19995');
  sock.subscribe('json_block');
  sock.subscribe('hashblock');

  console.log('📡 Local ZMQ subscriber connected to tcp://127.0.0.1:19995');

  (async () => {
    for await (const [topic, msg] of sock) {
      const t = topic.toString();
      if (t === 'json_block') {
        try {
          const parsed = JSON.parse(msg.toString());
          state.height = parsed.height ?? state.height;
          state.top_block_hash = parsed.hash ?? state.top_block_hash;
          state.difficulty = parsed.difficulty ?? state.difficulty;
          state.target = parsed.target ?? state.target;
          state.version = parsed.version ?? state.version;
          state.database_size = parsed.database_size ?? state.database_size;
          state.incoming_connections_count = parsed.incoming_connections_count ?? state.incoming_connections_count;
          state.outgoing_connections_count = parsed.outgoing_connections_count ?? state.outgoing_connections_count;
          state.lastUpdate = Date.now();
        } catch (e) {
          console.error('ZMQ json_block parse error:', e);
        }
      } else if (t === 'hashblock') {
        try {
          state.height = (state.height || 0) + 1;
          state.top_block_hash = msg.toString();
          state.lastUpdate = Date.now();
        } catch {}
      }
    }
  })();
}

function getDaemonState() {
  return { ...state };
}

module.exports = { startZmqListener, getDaemonState };
