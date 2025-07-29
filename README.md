# ArQmA Network Bot

A multi-platform bot for **ArQmA network monitoring** and notifications.  
Supports both **Telegram** and **Discord** for commands and node alerts.

---

## Features

- ⚡ Real-time **node status monitoring** (offline, out-of-sync, etc.)
- 📊 Get **network, pool, and daemon** stats via chat commands
- 🔔 Sends alerts to **Telegram user** (admin) and **Discord channel** (configurable)
- Same codebase runs both bots and shares logic

---

## Quickstart

### 1. Generate files

Save the generator script as `generate-structure.js` and run:

```bash
node generate-structure.js
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure .env

Edit your `.env` file with **your real tokens/IDs**:

```
TELEGRAM_TOKEN=...        # Get from BotFather
DISCORD_TOKEN=...         # Get from Discord Developer Portal
ALERT_USER_ID=...         # Your Telegram numeric user ID
DISCORD_ALERT_CHANNEL_ID=... # Discord channel ID for alerts
```

### 4. Run the bot

```bash
npm start
```

---

## Bot Commands

### Telegram

- `/helpme` — show all commands
- `/links` — important links
- `/pools` — mining pool stats
- `/daemon_info` — daemon info
- `/network` — network stats
- `/nodes` — node status

### Discord

- `!helpme` — show all commands
- `!links` — important links
- `!pools` — mining pool stats
- `!daemon_info` — daemon info
- `!network` — network stats
- `!nodes` — node status

---

## Alerts

- Alerts are sent to **Telegram** user (`ALERT_USER_ID`) and **Discord** channel (`DISCORD_ALERT_CHANNEL_ID`) if a node is offline, out-of-sync, or back online.

---

## Structure

- `handlers/` — bot integrations (telegram/discord)
- `commands/` — logic for each command
- `fetch/` — data fetching from APIs
- `alerts/` — alert logic
- `config/` — node list config
- `utils/` — helper functions

---

## License

MIT