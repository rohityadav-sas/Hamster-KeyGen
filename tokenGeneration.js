const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { games, urls, sleep } = require('./utils');
const path = require('path');
const fs = require('fs');

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
        console.log(error.response.statusText);
    }
}

const registerEvent = async (clientToken, promoId) => {
    try {
        const payload = {
            eventId: uuidv4(),
            eventOrigin: 'undefined',
            promoId
        };
        const headers = {
            'authorization': `Bearer ${clientToken}`,
            'content-type': 'application/json',
        };
        const response = await axios.post(urls.register, payload, { headers });
        return response.data.hasCode;
    } catch (error) {
        return error.response.data.error_code;
    }
}

const createToken = async (clientToken, promoId) => {
    try {
        const payload = {
            promoId
        };
        const headers = {
            'authorization': `Bearer ${clientToken}`,
            'content-type': 'application/json',
        };
        const response = await axios.post(urls.createToken, payload, { headers });
        return response.data.promoCode;
    } catch (error) {
        throw new Error("Error generating Promo Code");
    }
};

async function getKeys(game, numberOfKeys) {
    const tasks = [];
    let generatedKeys = [];
    for (let i = 0; i < numberOfKeys; i++) {
        tasks.push((async () => {
            const clientToken = await loginClient(uuidv4(), games[game].appToken);
            let hasCode = await registerEvent(clientToken, games[game].promoId);
            while (hasCode === 'TooManyRegister' || !hasCode) {
                console.error(`${game}: ${hasCode}. Retrying again in 20 seconds`);
                await sleep(20);
                hasCode = await registerEvent(clientToken, games[game].promoId);
            }
            if (hasCode) {
                const key = await createToken(clientToken, games[game].promoId);
                generatedKeys.push(key);
            }
        })());
    }
    await Promise.all(tasks);
    console.log(`${game} keys: `, generatedKeys);
    if (!fs.existsSync(path.join(__dirname, 'Keys', `${game}_keys.json`))) {
        fs.writeFileSync(path.join(__dirname, 'Keys', `${game}_keys.json`), JSON.stringify(generatedKeys, null, 2));
    }
    else {
        const existingKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'Keys', `${game}_keys.json`)))
        const updatedKeys = [...existingKeys, ...generatedKeys];
        fs.writeFileSync(path.join(__dirname, 'Keys', `${game}_keys.json`), JSON.stringify(updatedKeys, null, 2));
    }
}

module.exports = { getKeys };