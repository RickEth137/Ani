require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

// Add CORS middleware to allow Telegram requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const XAI_API_KEY = process.env.XAI_API_KEY;

function validateInitData(initData) {
    const dataCheckString = initData.split('&').sort().join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const providedHash = new URLSearchParams(initData).get('hash');
    return hash === providedHash;
}

app.post('/chat', async (req, res) => {
    const { message, initData } = req.body;
    if (!validateInitData(initData)) return res.status(403).json({ error: 'Invalid session' });
    try {
        const apiRes = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-beta',  // Change to 'grok-3' if 'beta' is outdated; check x.ai/api
            messages: [
                { role: 'system', content: 'You are Ani, a flirty anime girl. Respond playfully. End with [EMOTION: flirty/happy/neutral].' },
                { role: 'user', content: message }
            ]
        }, { headers: { 'Authorization': `Bearer ${XAI_API_KEY}` } });
        const text = apiRes.data.choices[0].message.content || 'Sorry, something went wrong.';
        const emotion = text.match(/\[EMOTION: (\w+)\]/)?.[1] || 'neutral';
        res.json({ text: text.replace(/\[EMOTION: .*\]/, '').trim(), emotion });
    } catch (error) {
        res.status(500).json({ error: 'AI error: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));