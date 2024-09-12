const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { games, urls, sleep, sleepDuration, ensureFileExists } = require('./utils');
const path = require('path');
const fs = require('fs').promises;

const createHeaders = (clientToken) => ({
    'Authorization': `Bearer ${clientToken}`,
    'Content-Type': 'application/json',
});

const loginClient = async (clientId, appToken) => {
    try {
        const payload = {
            appToken,
            clientId,
            clientOrigin: 'deviceid'
        };
        const response = await axios.post(urls.login, payload);
        return response.data.clientToken;
    } catch (error) {
        return error.response.data.error_message;
    }
}

const registerEvent = async (clientToken, promoId) => {
    try {
        const response = await axios.post(urls.register, {
            eventId: uuidv4(),
            eventOrigin: 'undefined',
            promoId
        }, { headers: createHeaders(clientToken) });
        return response.data.hasCode;
    } catch (error) {
        return error.response.data.error_code
    }
};

const createToken = async (clientToken, promoId) => {
    try {
        const response = await axios.post(urls.createToken, { promoId }, { headers: createHeaders(clientToken) });
        return response.data.promoCode;
    } catch (error) {
        console.error('Create token error:', error);
        throw new Error('Error generating Promo Code');
    }
};

async function getKeys(game, numberOfKeys, userID) {
    const filePath = path.join(__dirname, '..', 'assets', 'Keys', `${game}_keys.json`);
    await ensureFileExists(filePath);
    const generatedKeys = await generateKeys(game, (game === 'Fluff') ? 8 : numberOfKeys);
    let existingKeys = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    existingKeys[userID] = (existingKeys[userID] || []).concat(generatedKeys);
    await fs.writeFile(filePath, JSON.stringify(existingKeys, null, 2));
}

async function generateKeys(game, numberOfKeys) {
    const tasks = [];
    const generatedKeys = [];
    console.log(`Starting key generation for ${game}...`);
    for (let i = 0; i < numberOfKeys; i++) {
        let item = async () => {
            try {
                const clientToken = await loginClient(uuidv4(), games[game].appToken);
                console.log(`\x1b[33mGenerating ${i + 1}/${numberOfKeys} key for ${game}...${(i == 3) ? '\n' : ''}\x1b[0m`);
                let hasCode;
                do {
                    await sleep(sleepDuration);
                    console.error(`Retrying key ${i + 1}/${numberOfKeys} for ${game}...`);
                    hasCode = await registerEvent(clientToken, games[game].promoId);
                } while (hasCode === 'TooManyRegister' || !hasCode);
                const key = await createToken(clientToken, games[game].promoId);
                if (key !== 'Error generating Promo Code') {
                    generatedKeys.push(key);
                    console.log(`\x1b[32m${game} key ${i + 1}/${numberOfKeys} generated successfully.\x1b[0m`);
                } else {
                    throw new Error('Error generating Promo Code');
                }
            } catch (error) {
                console.error(`Error generating key ${i + 1}:`, error.message);
            }
        };
        await pushWithDelay(tasks, item, 2);
    }
    await Promise.all(tasks);
    console.log(`Key generation for ${game} completed. Total keys generated: ${generatedKeys.length}`);
    return generatedKeys;
}

async function pushWithDelay(tasks, item, delay) {
    tasks.push(item());
    await sleep(delay);
}



module.exports = { getKeys };