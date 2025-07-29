
````markdown
# ArQmA Network Bot

A multi-platform bot for the ArQmA cryptocurrency network, running on both **Telegram** and **Discord**.  
It provides real-time network statistics, pool hashrates, monitored node statuses, and automated node alerts to the administrator.

---

## Features

- ArQmA network stats (height, difficulty, hashrate, emission, price, and more)
- Live mining pool list and total pool hashrate
- Status checks of multiple public nodes
- Automatic node health monitoring and Telegram alerts for admins
- Clean, modular codebase (commands/fetch/alerts/config)
- Easy deployment to your own servers

---

## Installation

1. **Clone this repository**
   ```bash
   git clone https://github.com/YOUR_USER/arqma-bot.git
   cd arqma-bot
````

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up your environment variables**
   Create a `.env` file in the root directory with:

   ```
   TELEGRAM_TOKEN=your_telegram_bot_token
   DISCORD_TOKEN=your_discord_bot_token
   ALERT_USER_ID=your_telegram_user_id
   ```

   * **TELEGRAM\_TOKEN** – Get it from [BotFather](https://t.me/BotFather)
   * **DISCORD\_TOKEN** – Get it from the Discord developer portal
   * **ALERT\_USER\_ID** – Your numeric Telegram user id (for receiving admin node alerts)

4. **Start the bot**

   ```bash
   npm start
   ```

   or simply:

   ```bash
   node bot.js
   ```

---

## Project Structure

```
/commands   # Each bot command as a separate file
/fetch      # Functions for fetching external data
/alerts     # Node monitoring and alerting logic
/config     # Configuration files (like nodeList.js)
bot.js      # Main bot entrypoint
.env        # Secrets and tokens (never commit to public repo!)
```

---

## Requirements

* Node.js 18.x or newer
* Telegram bot token
* Discord bot token
* Proper permissions for both bots

---

## Commands

**On Telegram:**

* `/helpme` — List all commands
* `/network` — Network stats
* `/pools` — Mining pools and hashrates
* `/links` — Useful links
* `/daemon_info` — Daemon statistics
* `/nodes` — Status of public nodes

**On Discord:**

* `!helpme` — List all commands
* `!network` — Network stats
* `!pools` — Mining pools and hashrates
* `!links` — Useful links
* `!daemon_info` — Daemon statistics
* `!nodes` — Status of public nodes

---

## Example Output

```
🌐 Total Pool Hashrate: 0.95 MH/s

⛏️ zergpool.com: 757.17 KH/s
⛏️ supportcryptonight.com: 170.17 KH/s
⛏️ fastpool.xyz: 26.46 KH/s
⛏️ skypool.org: 0 H/s
⛏️ walemo.cc: 0 H/s
⛏️ moneroocean.stream: 0 H/s
⛏️ gntl.uk: 0 H/s
⛏️ aikapool.com: 0 H/s
```

---

## License

MIT

---

## Credits

* [ArQmA Project](https://arqma.com/)
* [miningpoolstats.stream](https://miningpoolstats.stream/arqma)
* [TradeOgre](https://tradeogre.com)


