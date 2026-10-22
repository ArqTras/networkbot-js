// utils/restrictlist.js
const fs = require('fs');
const path = require('path');
const { normalizeUsername } = require('./blocklist');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JSON_FILE = path.join(DATA_DIR, 'restrict.json');
const TXT_FILE = path.join(DATA_DIR, 'restricted.txt');

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(JSON_FILE)) fs.writeFileSync(JSON_FILE, JSON.stringify({ usernames: {}, ids: {} }, null, 2));
  if (!fs.existsSync(TXT_FILE)) fs.writeFileSync(TXT_FILE, '');
}

function load() {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8') || '{}');
  } catch {
    return { usernames: {}, ids: {} };
  }
}

function save(data) {
  ensureFiles();
  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
}

function addRestricts(records, when = new Date()) {
  const store = load(); let changed = false;
  records.forEach(rec => {
    if (rec.type === 'username') {
      const u = normalizeUsername(rec.value);
      if (u) { store.usernames[u] = when.toISOString(); changed = true; }
    } else if (rec.type === 'id') {
      const id = String(rec.value || '').trim();
      if (id) { store.ids[id] = when.toISOString(); changed = true; }
    }
  });
  if (changed) {
    save(store);
    const line = records.map(r => r.type === 'username'
      ? ('username=' + normalizeUsername(r.value))
      : ('id=' + String(r.value).trim())
    ).join(', ');
    fs.appendFileSync(TXT_FILE, '[' + when.toISOString() + '] RESTRICT ' + line + '\n');
  }
  return { store, changed };
}

function removeRestricts(records, when = new Date()) {
  const store = load(); let changed = false;
  records.forEach(rec => {
    if (rec.type === 'username') {
      const u = normalizeUsername(rec.value);
      if (u && store.usernames[u]) { delete store.usernames[u]; changed = true; }
    } else if (rec.type === 'id') {
      const id = String(rec.value || '').trim();
      if (id && store.ids[id]) { delete store.ids[id]; changed = true; }
    }
  });
  if (changed) {
    save(store);
    const line = records.map(r => r.type === 'username'
      ? ('username=' + normalizeUsername(r.value))
      : ('id=' + String(r.value).trim())
    ).join(', ');
    fs.appendFileSync(TXT_FILE, '[' + when.toISOString() + '] UNRESTRICT ' + line + '\n');
  }
  return { store, changed };
}

function isRestricted(info, now = new Date()) {
  const store = load();
  const uid = info && info.id != null ? String(info.id) : null;
  const uname = normalizeUsername(info && info.username);
  const ts = (uid && store.ids[uid]) || (uname && store.usernames[uname]);
  if (!ts) return { restricted: false };
  const since = new Date(ts).getTime() || 0;
  const ms = now.getTime() - since;
  const day = 24 * 60 * 60 * 1000;
  if (ms < day) return { restricted: true, remainingMs: day - ms };
  if (uid && store.ids[uid]) delete store.ids[uid];
  if (uname && store.usernames[uname]) delete store.usernames[uname];
  save(store);
  return { restricted: false };
}

module.exports = { addRestricts, removeRestricts, isRestricted };