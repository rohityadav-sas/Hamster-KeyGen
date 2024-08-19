require('dotenv').config();
const { getKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const axios = require('axios');
const admin = '7070127929';
const { commands, keysFiles } = require('./utils');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });


app.use(express.json());

app.get('/', async (req, res) => {
    try {
        const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=https://hamster-keygen.onrender.com/`);
        res.send(response.data);
    } catch (error) {
        res.send(error.response.data);
    }
});

app.get('/allkeys', async (req, res) => {
    const keys = [];
    keysFiles.forEach(file => {
        const filePath = path.join(__dirname, 'Keys', file);
        const keysArray = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
        keys.push({ game: file.replace('_keys.json', ''), keys: keysArray });
    });
    res.json(keys);
})

app.get('/users', async (req, res) => {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'Keys', 'Bot_Users.json')));
    res.json(users);
})

app.post(`/`, (req, res) => {
    console.log('received post request');
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


app.listen(process.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT}`);
})



async function sendKeys(msg, filePath, command) {
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
                bot.sendMessage(msg.chat.id, element);
            });
            keys[msg.chat.id] = userKeys.slice(4);
            fs.writeFileSync(filePath, JSON.stringify(keys, null, 2));
        }
        else {
            bot.sendMessage(msg.chat.id, 'You have no keys left. Generate keys first');
        }
    }
    else {
        bot.sendMessage(msg.chat.id, 'You have no keys left. Generate keys first');
    }
}

bot.onText(new RegExp('.'), (msg) => {
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, `${msg.chat.first_name} sent a message: ${msg.text}`);
    }
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
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, `${msg.chat.first_name} started the bot`);
    }
});

Object.entries(commands).forEach(([command, file]) => {
    bot.onText(new RegExp(command), async (msg) => {
        await sendKeys(msg, path.join(__dirname, 'Keys', file), command);
        if ((msg.chat.id).toString() !== admin) {
            bot.sendMessage(admin, `${msg.chat.first_name} requested ${command.replace('/', '')} keys`);
        }
    });
});

Object.entries(commands).forEach(([game, file]) => {
    let command = `/generate${game.replace('/', '')}keys`;
    bot.onText(new RegExp(command), async (msg) => {
        bot.sendMessage(msg.chat.id, `Generating ${game.replace('/', '')} keys...`);
        if ((msg.chat.id).toString() !== admin) {
            bot.sendMessage(admin, `${msg.chat.first_name} requested to generate ${game.replace('/', '')} keys`);
        }
        try {
            await getKeys(game.replace('/', '').charAt(0).toUpperCase() + game.slice(2), 4, msg.chat.id);
            bot.sendMessage(msg.chat.id, `${game.replace('/', '').charAt(0).toUpperCase() + game.slice(2)} keys have been generated!`);
            if ((msg.chat.id).toString() !== admin) {
                bot.sendMessage(admin, `${msg.chat.first_name} successfully generated ${game.replace('/', '')} keys`);
            }
        }
        catch (error) {
            bot.sendMessage(msg.chat.id, `An error occurred while generating ${game.replace('/', '').charAt(0).toUpperCase() + game.slice(2)} keys`);
        }
    });
});


bot.onText('/remaining', async (msg) => {
    const keys = [];
    let userFound = false;
    keysFiles.forEach(file => {
        const filePath = path.join(__dirname, 'Keys', file);
        const data = JSON.parse(fs.readFileSync(filePath));
        for (const [key, value] of Object.entries(data)) {
            if (key === msg.chat.id.toString()) {
                keys.push(
                    `${file.replace('_keys.json', '')}: ${value.length}`
                );
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
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, `${msg.chat.first_name} requested remaining keys`);
    }
});

bot.onText('/users', async (msg) => {
    if (msg.chat.id.toString() === admin) {
        const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'Keys', 'Bot_Users.json')));
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

bot.onText('/generatekeys', async (msg) => {
    const keyTypes = ['Bike', 'Cube', 'Clone', 'Train', 'Merge', 'Twerk'];
    if ((msg.chat.id).toString() !== admin) {
        bot.sendMessage(admin, `${msg.chat.first_name} requested to generate all keys`);
    }
    try {
        for (const keyType of keyTypes) {
            bot.sendMessage(msg.chat.id, `Generating ${keyType} Keys...`);
            await getKeys(keyType, 4, msg.chat.id);
        }
        bot.sendMessage(msg.chat.id, 'All Keys have been generated!');
        bot.sendMessage(admin, `${msg.chat.first_name} successfully generated all keys`);
    } catch (error) {
        console.error(error);
        bot.sendMessage(msg.chat.id, 'Error generating keys: ' + error);
    }
});



