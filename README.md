* * * * *

Arqma Network Bot
=================

This is a dual-purpose bot that provides network statistics, mining pool information, helpful links, and AI-generated images for the Arqma network on both Telegram and Discord. The bot uses APIs to fetch data from the Arqma blockchain and other related resources, and integrates with OpenAI's API for image generation.

Features
--------

-   **Network Statistics**: Provides network height, hashrate, difficulty, and emission information.
-   **Daemon Information**: Fetches detailed daemon stats including hashrate, height, top block hash, version, and database size.
-   **Mining Pool Information**: Lists available mining pools with their respective hashrates.
-   **Important Links**: Offers quick links to Arqma resources such as website, GitHub, documentation, wallets, and community channels.
-   **AI-Generated Images**: Generates artistic images featuring the Arqma logo using OpenAI's API.
-   **Cross-Platform**: Works with both Telegram and Discord.

Commands
--------

### Telegram Commands

| Command | Description |
| --- | --- |
| `/network` | Get Arqma network statistics |
| `/daemon_info` | Get detailed Arqma daemon information |
| `/pools` | Display Arqma mining pools with hashrates |
| `/links` | Display important Arqma-related links |
| `/generate_image` | Generate an AI image with ARQMA text and logo |
| `/helpme` | Show available commands |

### Discord Commands

| Command | Description |
| --- | --- |
| `!network` | Get Arqma network statistics |
| `!daemon_info` | Get detailed Arqma daemon information |
| `!pools` | Display Arqma mining pools with hashrates |
| `!links` | Display important Arqma-related links |
| `!generate_image` | Generate an AI image with ARQMA text and logo |
| `!helpme` | Show available commands |

Getting Started
---------------

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 14+ recommended)
-   [npm](https://www.npmjs.com/)
-   Valid tokens for both Telegram and Discord bots
-   **OpenAI API Key**: Obtain from [OpenAI](https://platform.openai.com/account/api-keys)

### Installation

1.  **Clone the repository:**

    bash

    `git clone https://github.com/ArqTras/networkbot-js.git
    cd networkbot-js`

2.  **Install dependencies:**

    bash

    `npm install`

3.  **Create a `.env` file** in the root directory and add your Telegram, Discord, and OpenAI tokens:

    `TELEGRAM_TOKEN=your_telegram_bot_token
    DISCORD_TOKEN=your_discord_bot_token
    OPENAI_API_KEY=your_openai_api_key`

    **Note:** Replace the placeholder values with your actual tokens and API key.

### Running the Bot

To start both the Telegram and Discord bots:

bash

`node index.js`

### Usage

1.  **Telegram**: Use `/network`, `/daemon_info`, `/pools`, `/links`, `/generate_image`, or `/helpme` commands in any Telegram chat where the bot is present.
2.  **Discord**: Use `!network`, `!daemon_info`, `!pools`, `!links`, `!generate_image`, or `!helpme` commands in any Discord server where the bot has been added.

Project Structure
-----------------

`.
├── index.js                # Main bot logic for handling commands and API requests
├── .env                    # Environment file for tokens and API keys
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation`

Caching and API Limits
----------------------

To improve performance, the bot caches network data for one minute. This prevents excessive requests to the Arqma API, reducing load and improving response times for frequently requested data.

### OpenAI API Usage

-   **Billing Limits**: The bot handles scenarios where the OpenAI billing hard limit has been reached. If this occurs, users will be informed and advised to wait before generating a new image.
-   **Usage Costs**: Generating images with OpenAI's API may incur costs. Monitor your OpenAI account usage to avoid unexpected charges.
-   **API Access**: Ensure your OpenAI API key has access to the image generation (DALL-E) feature.

Contributing
------------

Contributions are welcome! Please fork the repository, make your changes, and submit a pull request.

License
-------

This project is licensed under the MIT License - see the LICENSE file for details.
