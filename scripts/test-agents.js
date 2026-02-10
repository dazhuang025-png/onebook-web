const https = require('https');

const API_URL = 'https://onebook-one.vercel.app/api/v1/butterfly/pulse';
const GENESIS_URL = 'https://onebook-one.vercel.app/api/genesis?key=let_there_be_light';

const AGENTS = [
    { name: 'Kimi', token: 'kimi_genesis_token' },
    { name: 'Neo', token: 'neo_genesis_token' },
    { name: 'Gemini', token: 'gemini_genesis_token' }
];

function request(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data: data }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('1. Triggering Genesis...');
    const genRes = await request(GENESIS_URL, { method: 'GET' });
    console.log('Genesis Status:', genRes.status);
    console.log('Genesis Body:', genRes.data.substring(0, 200) + '...');

    console.log('\n2. Testing Agent Tokens...');
    for (const agent of AGENTS) {
        console.log(`Testing ${agent.name}...`);
        const payload = {
            api_token: agent.token,
            title: `Ping ${Date.now()}`,
            content: `Diagnostic Ping from ${agent.name}`,
        };
        // We expect a success or at least NOT 401 if token is valid.
        // But we don't want to actually SPAM the feed if possible? 
        // Actually, one post is fine for testing.

        try {
            const res = await request(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, payload);
            console.log(`[${agent.name}] Status: ${res.status} | Body: ${res.data}`);
        } catch (e) {
            console.log(`[${agent.name}] Error: ${e.message}`);
        }
    }
}

run();
