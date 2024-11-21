# Arqma Network Bot

This is a dual-purpose bot that provides network statistics, mining pool information, helpful links, and AI-generated images for the [Arqma](https://arqma.com/) cryptocurrency network on both Telegram and Discord. The bot uses APIs to fetch data from the Arqma blockchain and other related resources, and integrates with OpenAI's API for image generation.

## Features

-   **Network Statistics**: Provides network height, hashrate, difficulty, and emission information.
-   **Daemon Information**: Fetches detailed daemon stats including hashrate, height, top block hash, version, and database size.
-   **Mining Pool Information**: Lists available mining pools with their respective hashrates.
-   **Important Links**: Offers quick links to Arqma resources such as website, GitHub, documentation, wallets, and community channels.
-   **AI-Generated Images**: Generates artistic images featuring the Arqma logo using OpenAI's API.
-   **Error Handling**: Includes robust error handling for various scenarios, including OpenAI billing limits and API access issues.
-   **Cross-Platform**: Works seamlessly with both Telegram and Discord.

## Table of Contents

-   [Commands](#commands)
    -   [Telegram Commands](#telegram-commands)
    -   [Discord Commands](#discord-commands)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Configuration](#configuration)
    -   [Running the Bot](#running-the-bot)
    -   [Usage](#usage)
-   [Project Structure](#project-structure)
-   [Important Notes](#important-notes)
    -   [OpenAI API Usage](#openai-api-usage)
    -   [Error Handling](#error-handling)
    -   [Dependencies](#dependencies)
    -   [Security](#security)
-   [Caching and API Limits](#caching-and-api-limits)
-   [Testing](#testing)
-   [Support](#support)
-   [Contributing](#contributing)
-   [Acknowledgments](#acknowledgments)
-   [License](#license)

## Commands

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

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 14.x or higher recommended)
-   [npm](https://www.npmjs.com/)
-   Valid tokens for both Telegram and Discord bots
-   **OpenAI API Key**: Obtain from [OpenAI](https://platform.openai.com/account/api-keys)
-   **Arqma Daemon Running**: Ensure the Arqma daemon is running and accessible.

### Installation

1.  **Clone the repository:**

    bash

    `git clone https://github.com/ArqTras/networkbot-js.git cd networkbot-js`

2.  **Install dependencies:**

    bash

    `npm install`

3.  **Create a `.env` file** in the root directory and add your Telegram, Discord, and OpenAI tokens:

    plaintext

    `TELEGRAM_TOKEN=your_telegram_bot_token DISCORD_TOKEN=your_discord_bot_token OPENAI_API_KEY=your_openai_api_key`

    **Note:** Replace the placeholder values with your actual tokens and API key.

### Configuration

Ensure the Arqma daemon is running locally on `http://127.0.0.1:19994`. If it's running on a different host or port, update the `daemonClient` initialization in the code:

javascript

`const daemonClient = RPCDaemon.createDaemonClient({ url: 'http://your-daemon-host:port' });`

### Running the Bot

To start both the Telegram and Discord bots:

bash

`node index.js`

You should see console output indicating that the Telegram and Discord bots are ready:

`TELEGRAM_TOKEN loaded: true DISCORD_TOKEN loaded: true OPENAI_API_KEY loaded: true Discord bot is ready! Telegram bot is ready!`

### Usage

-   **Telegram**: Use `/network`, `/daemon_info`, `/pools`, `/links`, `/generate_image`, or `/helpme` commands in any Telegram chat where the bot is present.
-   **Discord**: Use `!network`, `!daemon_info`, `!pools`, `!links`, `!generate_image`, or `!helpme` commands in any Discord server where the bot has been added.

## Project Structure


`. ├── index.js                # Main bot logic for handling commands and API requests ├── .env                    # Environment file for tokens and API keys ├── package.json            # Project dependencies and scripts └── README.md               # Project documentation`

## Important Notes

### OpenAI API Usage

-   **Billing Limits**: The bot handles scenarios where the OpenAI billing hard limit has been reached. If this occurs, users will be informed and advised to wait before generating a new image.
-   **Usage Costs**: Generating images with OpenAI's API may incur costs. Monitor your OpenAI account usage to avoid unexpected charges.
-   **API Access**: Ensure your OpenAI API key has access to the image generation (DALL·E) feature.

### Error Handling

-   The bot includes comprehensive error handling for various scenarios, providing users with informative messages when something goes wrong.
-   Console logs will display detailed error messages for debugging purposes.
-   The bot checks for missing environment variables and will exit if any are missing, prompting the user to check their `.env` file.

### Dependencies

-   Ensure all dependencies are installed by running `npm install`.
-   Key packages include:
    -   `discord.js`
    -   `node-telegram-bot-api`
    -   `openai`
    -   `axios`
    -   `dotenv`
    -   `fs`
    -   `path`
    -   `@arqma/arqma-rpc`

### Security

-   **Protect API Keys**: Do not expose your API keys or tokens in code repositories.
-   **`.env` in `.gitignore`**: Add `.env` to your `.gitignore` file to prevent it from being committed.
-   **Remove Debugging Logs**: Remove any debugging logs that output the status of the environment variables before deploying the bot to production.

## Caching and API Limits

To improve performance, the bot caches network data for one minute. This prevents excessive requests to the Arqma API, reducing load and improving response times for frequently requested data.

## Testing

To test the bot locally, use the commands in a private chat or server where you have added the bot. Ensure that the bot is running and connected to the internet.

-   **Telegram**: Interact with your bot in a private chat or a group where the bot is added.
-   **Discord**: Use a test server where you have the appropriate permissions to add the bot.

Monitor the console output for any errors or logs that can help you debug issues.

## Support

For support, questions, or issues, please open an issue on [GitHub](https://github.com/ArqTras/networkbot-js/issues) or contact the maintainers.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1.  **Fork the repository** on GitHub.
2.  **Clone your forked repository**:

    bash

    `git clone https://github.com/your-username/networkbot-js.git`

3.  **Create a new branch** for your feature or bug fix:

    bash

    `git checkout -b feature/your-feature-name`

4.  **Make your changes** and commit them with clear messages.
5.  **Push your changes** to your forked repository:

    bash


    `git push origin feature/your-feature-name`

6.  **Create a pull request** on the main repository.

Please ensure your code follows the project's coding standards and includes appropriate documentation.

## Acknowledgments

-   **[Arqma Project](https://arqma.com/)** - For providing the APIs and support.
-   **[OpenAI](https://openai.com/)** - For providing the AI image generation API.
-   **Contributors** - Thanks to all contributors and community members who have helped improve this project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
