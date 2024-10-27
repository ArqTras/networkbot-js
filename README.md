# Arqma Network Bot

This is a dual-purpose bot that provides network statistics, mining pool information, and helpful links for the Arqma network on both Telegram and Discord. The bot uses APIs to fetch data from the Arqma blockchain and other related resources.

## Features

- **Network Statistics**: Provides network height, hashrate, difficulty, and emission information.
- **Daemon Information**: Fetches detailed daemon stats including hashrate, height, top block hash, version, and database size.
- **Mining Pool Information**: Lists available mining pools with their respective hashrates.
- **Important Links**: Offers quick links to Arqma resources such as website, GitHub, documentation, wallets, and community channels.
- **Cross-Platform**: Works with both Telegram and Discord.

## Commands

### Telegram Commands
| Command           | Description                                       |
|-------------------|---------------------------------------------------|
| `/network`        | Get Arqma network statistics                      |
| `/daemon_info`    | Get detailed Arqma daemon information             |
| `/pools`          | Display Arqma mining pools with hashrates         |
| `/links`          | Display important Arqma-related links             |
| `/helpme`         | Show available commands                           |

### Discord Commands
| Command           | Description                                       |
|-------------------|---------------------------------------------------|
| `!network`        | Get Arqma network statistics                      |
| `!daemon_info`    | Get detailed Arqma daemon information             |
| `!pools`          | Display Arqma mining pools with hashrates         |
| `!links`          | Display important Arqma-related links             |
| `!helpme`         | Show available commands                           |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14+ recommended)
- [npm](https://www.npmjs.com/)
- Valid tokens for both Telegram and Discord bots

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ArqTras/networkbot-js.git
   cd networkbot-js
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Telegram and Discord tokens:
   ```plaintext
   TELEGRAM_TOKEN=your_telegram_bot_token
   DISCORD_TOKEN=your_discord_bot_token
   ```

### Running the Bot

To start both the Telegram and Discord bots:
```bash
node bot.js
```

### Usage

1. **Telegram**: Use `/network`, `/daemon_info`, `/pools`, `/links`, or `/helpme` commands in any Telegram chat where the bot is present.
2. **Discord**: Use `!network`, `!daemon_info`, `!pools`, `!links`, or `!helpme` commands in any Discord server where the bot has been added.

## Project Structure

```plaintext
.
├── bot.js                  # Main bot logic for handling commands and API requests
├── .env                    # Environment file for tokens
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation
```

## Caching and API Limits

To improve performance, the bot caches network data for one minute. This prevents excessive requests to the Arqma API, reducing load and improving response times for frequently requested data.

## Contributing

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Enjoy using the Arqma Network Bot! For issues or questions, please open an issue on GitHub.
```
