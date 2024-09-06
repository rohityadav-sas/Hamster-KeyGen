const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { getKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const app = express();
const { games, keysFiles } = require('./utils');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const lastGenerationFile = path.join(__dirname, '..', 'assets', 'lastGeneration.json');
const generationInterval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

app.listen(3000, () => {
    console.log('\x1b[32m%s\x1b[0m', `Server running on port 3000`);
})

bot.onText('/start', (msg) => {
    const welcomeMessage = 'Welcome to the Hamster Key Generator Bot!';
    const keyboardOptions = {
        reply_markup: {
            keyboard: [
                ['getAllKeys', 'generateAllKeys', 'Remaining']
            ],
            resize_keyboard: true
        }
    };

    bot.sendMessage(msg.chat.id, welcomeMessage, keyboardOptions);
});


bot.onText('Remaining', async (msg) => {
    const userId = msg.chat.id.toString();
    const keys = [];

    keysFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', 'assets', 'Keys', file);

        if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, '{}') }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const userKeys = data[userId];
        const keyCount = userKeys ? userKeys.length : 0;
        keys.push(`${file.replace('_keys.json', '')}: ${keyCount}`);
    });

    bot.sendMessage(msg.chat.id, keys.join('\n'));
});


bot.onText('generateAllKeys', async (msg) => {
    const userId = msg.chat.id.toString();
    const lastGeneration = getLastGenerationTime(userId);

    const now = Date.now();
    if (now - lastGeneration < generationInterval) {
        const remainingTime = ((generationInterval - (now - lastGeneration)) / (60 * 60 * 1000)).toFixed(2);
        await bot.sendMessage(msg.chat.id, `You can only generate keys once every 12 hours. Please wait ${remainingTime} hours.`);
        return;
    }

    updateLastGenerationTime(userId, now);

    await generateAllKeys(msg);
});

function getLastGenerationTime(userId) {
    if (!fs.existsSync(lastGenerationFile)) {
        fs.writeFileSync(lastGenerationFile, '{}');
    }

    const lastGenerationData = JSON.parse(fs.readFileSync(lastGenerationFile, 'utf-8'));
    return lastGenerationData[userId] || 0;
}

function updateLastGenerationTime(userId, timestamp) {
    let lastGenerationData = {};
    if (fs.existsSync(lastGenerationFile)) {
        lastGenerationData = JSON.parse(fs.readFileSync(lastGenerationFile, 'utf-8'));
    }

    lastGenerationData[userId] = timestamp;
    fs.writeFileSync(lastGenerationFile, JSON.stringify(lastGenerationData, null, 2));
}

async function generateAllKeys(msg) {
    const keyTypes = Object.keys(games);
    const messageIds = [];

    try {
        for (const keyType of keyTypes) {
            const message = await bot.sendMessage(msg.chat.id, `Generating ${keyType} keys...`);
            messageIds.push({
                keyType: keyType,
                messageId: message.message_id
            });
            await getKeys(keyType, 4, msg.chat.id);
            await bot.sendMessage(msg.chat.id, `${keyType} keys have been generated!`);
            const toDeleteMsg = messageIds.find(message => message.keyType === keyType);
            if (toDeleteMsg) {
                await bot.deleteMessage(msg.chat.id, toDeleteMsg.messageId);
            }
        }
    } catch (error) {
        console.error(error);
        await bot.sendMessage(msg.chat.id, 'Error generating keys: ' + error);
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
        await bot.sendMessage(msg.chat.id, noKeysMsg.join('\n\n'));
    }
});

async function sendKeys(msg, filePath, noKeysMsg) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}');
    }

    const keys = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const userId = msg.chat.id.toString();
    const userKeys = keys[userId] || [];
    const gameType = path.basename(filePath, '_keys.json');

    if (userKeys.length > 0) {
        const keysToSend = userKeys.slice(0, 4).map(key => `\`${key}\``);
        await bot.sendMessage(msg.chat.id, `Here are your ${gameType} keys:\n\n${keysToSend.join('\n\n')}`, {
            parse_mode: 'Markdown'
        });
        keys[userId] = userKeys.slice(4);
        fs.writeFileSync(filePath, JSON.stringify(keys, null, 2));
    } else {
        noKeysMsg.push(`No ${gameType} keys left!`);
    }
}
