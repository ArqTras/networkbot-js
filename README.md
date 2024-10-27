
# Arqma Bot

This project provides a Telegram and Discord bot for the Arqma cryptocurrency network, fetching real-time data including network info, emission data, and daemon stats.

## Setup

1. **Clone the repository** and navigate to the project folder.
   ```bash
   git clone https://github.com/ArqTras/networkbot-js.git
   cd networkbot-js
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add API tokens**:
   - Create `telegram_token.info` and `discord_token.info` files in the project root.
   - Add your bot tokens to these files.

4. **Run the bot**:
   ```bash
   npm start
   ```

## Commands

### Telegram
- `/network`: Get Arqma network statistics
- `/daemon_info`: Get detailed daemon information
- `/links`: Display important links for Arqma
- `/pools`: Display pool list for Arqma
- `/helpme`: Show available commands

### Discord
- `!network`: Get Arqma network statistics
- `!daemon_info`: Get detailed daemon information
- `!links`: Display important links for Arqma
- `!pools`: Display pool links for Arqma
- `!helpme`: Show available commands
```

### Token Files

Ensure `telegram_token.info` and `discord_token.info` contain your respective tokens, each on a single line.
