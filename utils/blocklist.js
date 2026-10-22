const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'blocks.json');

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ usernames: [], ids: [] }, null, 2));
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return { usernames: Array.isArray(parsed.usernames) ? parsed.usernames : [], ids: Array.isArray(parsed.ids) ? parsed.ids : [] };
  } catch { return { usernames: [], ids: [] }; }
}

function save(data) { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }
function normalizeUsername(u) { return (u || '').replace(/^@+/, '').trim().toLowerCase(); }

function addBlocks(records) {
  const store = load(); let changed = false;
  for (const rec of records) {
    if (rec.type === 'username') {
      const u = normalizeUsername(rec.value);
      if (u && store.usernames.indexOf(u) === -1) { store.usernames.push(u); changed = true; }
    } else if (rec.type === 'id') {
      const id = String(rec.value || '').trim();
      if (id && store.ids.indexOf(id) === -1) { store.ids.push(id); changed = true; }
    }
  }
  if (changed) save(store); return store;
}

function isBlocked(info) {
  const store = load();
  const uid = info && info.id != null ? String(info.id) : null;
  const uname = normalizeUsername(info && info.username);
  if (uid && store.ids.indexOf(uid) !== -1) return true;
  if (uname && store.usernames.indexOf(uname) !== -1) return true;
  return false;
}

module.exports = { load, save, addBlocks, isBlocked, normalizeUsername };