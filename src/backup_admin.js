const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { getKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const express = require('express');
const app = express();
const admin = '7070127929';
// const admin = '5548580608';
const { games, keysFiles, ensureFileExists } = require('./utils');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

app.listen(3000, () => {
    console.log('\x1b[32m%s\x1b[0m', `Server running on port 3000`);
})

const informAdmin = (msg, msgToSend) => {
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, msgToSend);
    }
}

bot.onText(new RegExp('.'), (msg) => {
    informAdmin(msg, `${msg.chat.first_name} sent a message: ${msg.text}`);
});

bot.onText('/start', (msg) => {
    const welcomeMessage = 'Welcome to the Hamster Key Generator Bot!';
    const keyboardOptions = {
        reply_markup: {
            keyboard: [
                ['getAllKeys', 'generateAllKeys'],
                ['Remaining']
            ],
            resize_keyboard: true
        }
    };

    bot.sendMessage(msg.chat.id, welcomeMessage, keyboardOptions);

    informAdmin(msg, `${msg.chat.first_name} started the bot`);
});




bot.onText('Remaining', async (msg) => {
    const userId = msg.chat.id.toString();
    const keys = [];

    const fileProcessingPromises = keysFiles.map(async (file) => {
        const filePath = path.join(__dirname, '..', 'assets', 'Keys', file);
        await ensureFileExists(filePath);
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        const userKeys = data[userId] || [];
        const keyCount = userKeys.length;
        keys.push(`${file.replace('_keys.json', '')}: ${keyCount}`);
    });

    await Promise.all(fileProcessingPromises);

    await bot.sendMessage(msg.chat.id, keys.join('\n'));
});



bot.onText('generateAllKeys', generateAllKeys);

async function generateAllKeys(msg) {
    const keyTypes = Object.keys(games);

    try {
        for (const keyType of keyTypes) {
            const { message_id: messageId } = await bot.sendMessage(msg.chat.id, `Generating ${keyType} keys...`);

            await getKeys(keyType, 4, msg.chat.id);

            await bot.sendMessage(msg.chat.id, `${keyType} keys have been generated!`);

            await bot.deleteMessage(msg.chat.id, messageId);
        }
    } catch (error) {
        console.error(error);
        await bot.sendMessage(msg.chat.id, `Error generating keys: ${error.message}`);
    }
}


bot.onText('getAllKeys', async (msg) => {
    const noKeysMsg = [];

    const promises = keysFiles.map(file => {
        const filePath = path.join(__dirname, '..', 'assets', 'Keys', file);
        return sendKeys(msg, filePath, noKeysMsg);
    });

    await Promise.all(promises);

    if (noKeysMsg.length > 0) {
        await bot.sendMessage(msg.chat.id,
            `🚫 *You don't have these game keys\\. Generate them first\\:*\n\n${noKeysMsg.join('\n')}`,
            { parse_mode: 'MarkdownV2' }
        );
    }
});

async function sendKeys(msg, filePath, noKeysMsg) {
    await ensureFileExists(filePath);
    const keys = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const userId = msg.chat.id.toString();
    const userKeys = keys[userId] || [];
    const gameType = path.basename(filePath, '_keys.json');

    if (userKeys.length > 0) {
        const keysToSend = userKeys.slice(0, 4).map(key => `\`${key}\``);
        await bot.sendMessage(msg.chat.id, `*Here are your ${gameType} keys:*\n\n${keysToSend.join('\n\n')}`, {
            parse_mode: 'MarkdownV2'
        });
        keys[userId] = userKeys.slice(4);
        await fs.writeFile(filePath, JSON.stringify(keys, null, 2));
    } else {
        noKeysMsg.push(`${gameType}`);
    }
}