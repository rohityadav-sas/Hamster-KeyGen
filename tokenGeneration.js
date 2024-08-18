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

async function getKeys(game, numberOfKeys, userID) {
    const filePath = path.join(__dirname, 'Keys', `${game}_keys.json`);
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
    console.log('\x1b[32m%s\x1b[0m', `${game} keys generated`);
    let existingKeys = JSON.parse(fs.readFileSync(filePath));
    let userFound = false;
    for (let [key, value] of Object.entries(existingKeys)) {
        if (key === userID) {
            existingKeys[key] = [...value, ...generatedKeys];
            fs.writeFileSync(filePath, JSON.stringify(existingKeys, null, 2));
            userFound = true;
            break;
        }
    }

    if (!userFound) {
        existingKeys[userID] = generatedKeys;
        fs.writeFileSync(filePath, JSON.stringify(existingKeys, null, 2));
    }

}

module.exports = { getKeys };