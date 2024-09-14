const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { getKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const express = require('express');
const app = express();
const { games, keysFiles, ensureFileExists, admin } = require('./utils');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const lastGenerationFile = path.join(__dirname, '..', 'assets', 'lastGeneration.json');
const userFile = path.join(__dirname, '..', 'assets', 'users.json');
const generationInterval = 12 * 60 * 60 * 1000;

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

bot.onText('/singlemode', async (msg) => {
    const gameOptions = Object.keys(games)
        .map((game, index) => (index % 3 === 0 ? Object.keys(games).slice(index, index + 3) : null))
        .filter(item => item);
    const keyboardOptions = {
        reply_markup: {
            keyboard: gameOptions,
            resize_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, 'Choose a game:', keyboardOptions);
});

bot.onText('/multimode', async (msg) => {
    const keyboardOptions = {
        reply_markup: {
            keyboard: [
                ['🔄 Get Keys', '🔄 Generate All Keys'],
                ['Remaining']
            ],
            resize_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, 'Choose an option:', keyboardOptions);
});

Object.keys(games).forEach(game => {
    bot.onText(`${game}`, async (msg) => {
        await bot.sendMessage(msg.chat.id, `Generating ${game} keys...`);
        await getKeys(game, 4, msg.chat.id);
        await bot.sendMessage(msg.chat.id, `${game} keys have been generated!`);
    });
});


bot.onText('/users', async (msg) => {
    if (msg.chat.id.toString() !== admin) {
        await bot.sendMessage(msg.chat.id, 'You are not authorized to view this command.');
        return;
    }
    await ensureFileExists(userFile);
    const users = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    const userList = Object.values(users).map(user => `${user.first_name} ${user.last_name ? user.last_name : ''} (@${user.username ? user.username : 'no username'})`).join('\n');
    await bot.sendMessage(msg.chat.id, userList);
});

bot.onText('/start', async (msg) => {
    const welcomeMessage = 'Welcome to the Hamster Key Generator Bot!';
    const keyboardOptions = {
        reply_markup: {
            keyboard: [
                ['🔄 Get Keys', '🔄 Generate All Keys'],
                ['Remaining']
            ],
            resize_keyboard: true
        }
    };
    const userData = {
        first_name: msg.chat.first_name,
        last_name: msg.chat.last_name,
        username: msg.chat.username
    }
    await ensureFileExists(userFile);
    const users = JSON.parse(await fs.readFile(userFile, 'utf-8'));
    let userId = msg.chat.id.toString();
    users[userId] = userData;
    await fs.writeFile(userFile, JSON.stringify(users, null, 2));
    bot.sendMessage(msg.chat.id, welcomeMessage, keyboardOptions);
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

bot.onText('🔄 Generate All Keys', async (msg) => {
    const userId = msg.chat.id.toString();
    const lastGeneration = await getLastGenerationTime(userId);
    const now = Date.now();
    if ((now - lastGeneration) < generationInterval) {
        const remainingTimeMs = generationInterval - (now - lastGeneration);
        const remainingHours = Math.floor(remainingTimeMs / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingTimeMs % (60 * 60 * 1000)) / (60 * 1000));
        await bot.sendMessage(
            msg.chat.id,
            `🚫 *Key Generation Limit Reached*\n\n` +
            `You can only generate keys every *12 hours*\\.\n\n` +
            `⏳ Time remaining: *${remainingHours}h ${remainingMinutes}m*\n\n` +
            `💡 *Tip*: Set a reminder to check back once the cooldown is over\\!`
            , {
                parse_mode: 'MarkdownV2'
            });
        return;
    }
    await updateLastGenerationTime(userId, now);
    await generateAllKeys(msg);
});

async function getLastGenerationTime(userId) {
    await ensureFileExists(lastGenerationFile);
    const lastGenerationData = JSON.parse(await fs.readFile(lastGenerationFile, 'utf-8'));
    return lastGenerationData[userId] || 0;
}

async function updateLastGenerationTime(userId, timestamp) {
    await ensureFileExists(lastGenerationFile);
    let lastGenerationData = JSON.parse(await fs.readFile(lastGenerationFile, 'utf-8'));
    lastGenerationData[userId] = timestamp;
    await fs.writeFile(lastGenerationFile, JSON.stringify(lastGenerationData, null, 2));
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

bot.onText('🔄 Get Keys', async (msg) => {
    const noKeysMsg = [];

    const promises = keysFiles.map(file => {
        const filePath = path.join(__dirname, '..', 'assets', 'Keys', file);
        return sendKeys(msg, filePath, noKeysMsg);
    });

    await Promise.all(promises);

    if (noKeysMsg.length > 0) {
        await bot.sendMessage(
            msg.chat.id,
            `🚫 *Missing Game Keys*\n\n` +
            `It seems like you haven't generated the following game keys yet:\n\n` +
            `🔑 ${noKeysMsg.join('\n🔑 ')}` + // Add key emoji before each missing key
            `\n\n❗ *Please generate these keys first\\.*`,
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
        const numberOfKeysToSend = (gameType === 'Fluff') ? 8 : 4;
        const keysToSend = userKeys.slice(0, numberOfKeysToSend).map(key => `\`${key}\``);
        await bot.sendMessage(msg.chat.id, `*Here are your ${gameType} keys:*\n\n${keysToSend.join('\n\n')}`, {
            parse_mode: 'MarkdownV2'
        });
        keys[userId] = userKeys.slice(numberOfKeysToSend);
        await fs.writeFile(filePath, JSON.stringify(keys, null, 2));
    } else {
        noKeysMsg.push(`${gameType}`);
    }
}