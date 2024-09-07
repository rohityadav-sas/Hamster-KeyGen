# Hamster Key Generator Bot

The Hamster Key Generator Bot is a Telegram bot that generates and manages promo keys for various games. It uses a combination of Express.js for the server, Axios for HTTP requests, and the `node-telegram-bot-api` library to interact with Telegram.

## Table of Contents

- [Preview](#preview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Telegram Commands](#telegram-commands)
- [Dependencies](#dependencies)
- [License](#license)
- [Contributing](#contributing)

## Preview

<div style="display:flex; justify-content:space-between">
  <img src="./assets/preview1.png?raw=true" height="100%" width="45%"/> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp
  <img src="./assets/preview2.png?raw=true" height="100%" width="45%"/>
</div>

## Features

- **Generate Promo Keys**: Generate promo keys for different games.
- **Retrieve Keys**: Retrieve generated keys for a specific game.
- **Admin Commands**: Admin can view all users and their remaining keys.
- **User Management**: Automatically tracks users who start the bot.
- **Rate Limiting**: Users can only generate keys once every 12 hours.

## Prerequisites

- Node.js (v12 or higher)
- npm (v6 or higher)
- Telegram Bot Token (create a bot using [BotFather](https://core.telegram.org/bots#botfather))

## Installation

1. Clone the repository:
    ```sh
    https://github.com/rohityadav-sas/Hamster-KeyGen.git
    ```

2. Navigate to the project directory:
    ```sh
    cd Hamster-KeyGen
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your Telegram bot token:
    ```env
    TELEGRAM_BOT_TOKEN=your-telegram-bot-token
    ```

4. Start the server:
    ```sh
    npm start
    ```

## Usage

### Telegram Commands

- **/start**: Start the bot and register the user.
- **/singlemode**: Choose a game to generate keys for in single mode.
- **/multimode**: Choose an option to get all keys, generate all keys, or view remaining keys.
- **/users**: Admin command to view all users and their remaining keys.
- **getAllKeys**: Retrieve all keys for the user.
- **generateAllKeys**: Generate all keys for the user.
- **Remaining**: View the remaining keys for each game.

## Dependencies

- **axios**: For making HTTP requests.
- **express**: For handling HTTP requests and routing.
- **dotenv**: For loading environment variables.
- **uuid**: For generating unique identifiers.
- **node-telegram-bot-api**: For interacting with the Telegram Bot API.

## License

This project is licensed under the ISC License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
