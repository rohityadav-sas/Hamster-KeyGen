require('dotenv').config();
const { getKeys, getAllKeys } = require('./tokenGeneration');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', async (req, res) => {
    const response = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=https://hamster-keygen.onrender.com/`);
    res.send(response.data);
});

app.post(`/`, (req, res) => {
    console.log('received post request');
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


app.listen(process.env.PORT, () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT}`);
})

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);


async function sendKeys(msg, filePath, command) {
    let keys = JSON.parse(fs.readFileSync(filePath));
    if (keys.length === 0) {
        bot.sendMessage(msg.chat.id, `No ${command.replace('/', '')} keys available`);
        return;
    }
    let keysToSend = keys.slice(0, 4);
    keysToSend.forEach(key => bot.sendMessage(msg.chat.id, key));
    fs.writeFileSync(filePath, JSON.stringify(keys.slice(4), null, 2));
}

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
});


const commands = {
    '/bike': 'Bike_keys.json',
    '/cube': 'Cube_keys.json',
    '/clone': 'Clone_keys.json',
    '/train': 'Train_keys.json',
    '/merge': 'Merge_keys.json',
    '/twerk': 'Twerk_keys.json'
};

Object.entries(commands).forEach(([command, file]) => {
    bot.onText(new RegExp(command), async (msg) => {
        await sendKeys(msg, path.join(__dirname, 'Keys', file), command);
    });
});

Object.entries(commands).forEach(([game, file]) => {
    let command = `/generate${game.replace('/', '')}keys`;
    bot.onText(new RegExp(command), async (msg) => {
        bot.sendMessage(msg.chat.id, `Generating ${game.replace('/', '')} keys...`);
        try {
            await getKeys(game.replace('/', '').charAt(0).toUpperCase() + game.slice(2), 4);
            bot.sendMessage(msg.chat.id, `${game.replace('/', '').charAt(0).toUpperCase() + game.slice(2)} keys have been generated!`);
        }
        catch (error) {
            bot.sendMessage(msg.chat.id, `An error occurred while generating ${game.replace('/', '').charAt(0).toUpperCase() + game.slice(2)} keys`);
        }
    });
});

const keysFiles = ['Bike_keys.json', 'Cube_keys.json', 'Clone_keys.json', 'Train_keys.json', 'Merge_keys.json', 'Twerk_keys.json'];

bot.onText('/remaining', async (msg) => {
    const remaining = await Promise.all(keysFiles.map(async file => {
        const filePath = path.join(__dirname, 'Keys', file);
        const keys = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
        return `${file.replace('_keys.json', ' Keys')}: ${keys.length}`;
    }));
    bot.sendMessage(msg.chat.id, remaining.join('\n'));
});

bot.onText('/users', async (msg) => {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'Keys', 'Bot_Users.json')));
    const list = users.map(user =>
        `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}${user.username ? `: @${user.username}` : ''}`
    );
    bot.sendMessage(msg.chat.id, list.join('\n'));
});

bot.onText('/generatekeys', async (msg) => {
    bot.sendMessage(msg.chat.id, 'Generating Keys...');
    try {
        await getAllKeys();
        bot.sendMessage(msg.chat.id, 'Keys have been generated!');
    }
    catch (error) {
        bot.sendMessage(msg.chat.id, 'An error occurred while generating keys');
    }
})


