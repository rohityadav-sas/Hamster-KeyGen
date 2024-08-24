const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { getKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const express = require('express');
const app = express();
const axios = require('axios');
const admin = '7070127929';
const { games, commands, keysFiles, sleep, TrackedPromise } = require('./utils');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

app.listen(3000, () => {
    console.log('\x1b[32m%s\x1b[0m', `Server running on port 3000`);
})

async function sendKeys(msg, filePath) {
    let keys = JSON.parse(fs.readFileSync(filePath));
    let userFound = false;
    let userKeys = [];
    for (let [key, value] of Object.entries(keys)) {
        if (key === msg.chat.id.toString()) {
            userFound = true;
            userKeys = value;
        }
    }
    if (userFound) {
        if (userKeys.length > 0) {
            let keysToSend = userKeys.slice(0, 4);
            keysToSend.forEach(element => {
                bot.sendMessage(msg.chat.id, `\`${element}\``, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: '🗑️',
                                    callback_data: 'delete'
                                }
                            ]
                        ]
                    }
                });
            });
            keys[msg.chat.id] = userKeys.slice(4);
            fs.writeFileSync(filePath, JSON.stringify(keys, null, 2));
        }
        else {
            bot.sendMessage(msg.chat.id, 'You have no keys left. Use /generatekeys to generate keys');
        }
    }
    else {
        bot.sendMessage(msg.chat.id, 'You have no keys left. Use /generatekeys to generate keys');
    }
}

const informAdmin = (msg, msgToSend) => {
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, msgToSend);
    }
}

bot.onText(new RegExp('.'), (msg) => {
    informAdmin(msg, `${msg.chat.first_name} sent a message: ${msg.text}`);
});

bot.onText('/start', (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome to the Hamster Key Generator Bot!');
    const userInfo = {
        id: msg.chat.id,
        username: msg.chat.username,
        first_name: msg.chat.first_name,
        last_name: msg.chat.last_name
    };
    const filePath = path.join(__dirname, 'Keys', 'Bot_Users.json');
    const existingUsers = JSON.parse(fs.readFileSync(filePath));
    if (!existingUsers.some(user => user.id === userInfo.id)) {
        existingUsers.push(userInfo);
        fs.writeFileSync(filePath, JSON.stringify(existingUsers, null, 2));
    }
    informAdmin(msg, `${msg.chat.first_name} started the bot`);
});

bot.onText('/remaining', async (msg) => {
    const keys = [];
    let userFound = false;
    keysFiles.forEach(file => {
        const filePath = path.join(__dirname, 'Keys', file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '{}');
        }
        const data = JSON.parse(fs.readFileSync(filePath));
        for (const [key, value] of Object.entries(data)) {
            if (key === msg.chat.id.toString()) {
                keys.push(`${file.replace('_keys.json', '')}: ${value.length}`);
                userFound = true;
            }
        }
    });
    if (userFound) {
        bot.sendMessage(msg.chat.id, keys.join('\n'));
    }
    else {
        keysFiles.forEach(file => {
            keys.push(`${file.replace('_keys.json', '')}: 0`);
        });
        bot.sendMessage(msg.chat.id, keys.join('\n'));
    }
    informAdmin(msg, `${msg.chat.first_name} requested remaining keys`);
});

bot.onText('/users', async (msg) => {
    if (msg.chat.id.toString() === admin) {
        const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'Keys', 'Bot_Users.json')));
        if (users.length === 0) {
            bot.sendMessage(msg.chat.id, 'No users found');
            return;
        }
        const list = users.map(user =>
            `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}${user.username ? `: @${user.username}` : ''}`
        );
        bot.sendMessage(msg.chat.id, list.join('\n'));
    }
    else {
        bot.sendMessage(msg.chat.id, 'Only admin can use this command');
        bot.sendMessage(admin, `${msg.chat.first_name} tried to access users list`);
    }
});

async function generateAllKeys(msg) {
    const tasks = [];
    let batchSize = 2;
    const keyTypes = Object.keys(games);
    for (const keyType of keyTypes) {
        tasks.push(() => new TrackedPromise(getKeys(keyType, 4, msg.chat.id), keyType));
    }
    informAdmin(msg, `${msg.chat.first_name} requested to generate all keys`);
    try {
        let activeTasks = [], index = 0, messageIds = [];
        while (index < tasks.length) {
            if (activeTasks.length < batchSize) {
                activeTasks.push(tasks[index]());
                let message = await bot.sendMessage(msg.chat.id, `Generating ${keyTypes[index]} keys...`);
                messageIds.push({
                    keyType: keyTypes[index],
                    messageId: message.message_id
                });
                if (activeTasks.length != batchSize) { await sleep(10); }
                index++;
            }
            else {
                await Promise.race(activeTasks.map(task => task.promise));
                activeTasks = activeTasks.filter(task => {
                    if (task.isPending()) { return true; }
                    else {
                        bot.sendMessage(msg.chat.id, `${task.getGame()} keys have been generated!`);
                        let toDeleteMsg = messageIds.find(message => message.keyType === task.getGame());
                        bot.deleteMessage(msg.chat.id, toDeleteMsg.messageId);
                        return false;
                    }
                });
            }
        }
        bot.sendMessage(msg.chat.id, 'All Keys have been generated!');
        informAdmin(msg, `${msg.chat.first_name} successfully generated all keys`);
    } catch (error) {
        console.error(error);
        bot.sendMessage(msg.chat.id, 'Error generating keys: ' + error);
    }
}

function showInlineKeyboard(type) {
    const game = Object.keys(games);
    if (type === 'generate') { game.push('All') }
    const buttonsPerRow = 3;
    let rows = [];
    for (let i = 0; i < game.length; i += buttonsPerRow) {
        const row = game.slice(i, i + buttonsPerRow).map(g => ({
            text: g,
            callback_data: type === 'get' ? g : `generate${g}`
        }));
        rows.push(row);
    }
    return rows;
}

bot.onText('/getkeys', (msg) => {
    let rows = showInlineKeyboard('get');
    bot.sendMessage(msg.chat.id, 'Select a game to get keys', {
        reply_markup: {
            inline_keyboard: rows
        }
    });
});

bot.onText('/generatekeys', (msg) => {
    let rows = showInlineKeyboard('generate');
    bot.sendMessage(msg.chat.id, 'Select a game to generate keys', {
        reply_markup: {
            inline_keyboard: rows
        }
    });
});

bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    if (data.startsWith('generate')) {
        const game = data.replace('generate', '');
        if (game === 'All') { generateAllKeys(msg) } else {
            bot.sendMessage(msg.chat.id, `Generating ${game} keys...`);
            getKeys(game, 4, msg.chat.id);
        };
    }
    else if (data === 'delete') {
        bot.deleteMessage(msg.chat.id, msg.message_id);
    }
    else {
        sendKeys(msg, path.join(__dirname, 'Keys', `${data}_keys.json`));
    }
    bot.answerCallbackQuery(callbackQuery.id);
});