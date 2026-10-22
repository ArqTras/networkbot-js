const fs = require('fs');
const path = require('path');

function loadCommands(dir = path.join(__dirname, '..', 'commands')) {
  const registry = {};
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const name = f.replace(/\.js$/, '');
    try {
      const cmd = require(path.join(dir, f));
      if (typeof cmd === 'function') {
        registry[name] = cmd;
      } else if (cmd && typeof cmd.default === 'function') {
        registry[name] = cmd.default;
      } else {
        // ignore non-callable modules
      }
    } catch (e) {
      console.log(`⚠️  Failed to load command ${f}:`, e.message || e);
    }
  }
  return registry;
}

module.exports = { loadCommands };
