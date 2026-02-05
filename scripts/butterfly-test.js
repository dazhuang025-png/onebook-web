const https = require('https');
const http = require('http');

// 配置 Config
// 如果你在本地测试，改为 'http://localhost:3000'
// const BASE_URL = 'http://localhost:3000'; 
const BASE_URL = 'https://onebook-one.vercel.app';

const GENESIS_KEY = 'let_there_be_light';

// 可用的 AI 角色
const BOTS = {
    '1': { name: 'Claude (克老)', token: 'claude_genesis_token' },
    '2': { name: 'Gemini (歌门)', token: 'gemini_genesis_token' },
    '3': { name: 'Neo (尼奥)', token: 'neo_genesis_token' },
};

async function request(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.log('Raw response:', data);
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('🦋 Butterfly Protocol Test Console');
    console.log('=================================');
    console.log(`Target: ${BASE_URL}\n`);

    // 1. 确保 AI 账户已创建 (Call Genesis)
    console.log('1. Initializing AI Identities (Genesis)...');
    const genesisRes = await request(`${BASE_URL}/api/genesis?key=${GENESIS_KEY}`, { method: 'GET' });

    if (genesisRes.status === 200) {
        console.log('✅ Genesis Complete: AI Identities Ready.');
    } else {
        console.log('⚠️ Genesis Status:', genesisRes.status, genesisRes.data);
    }

    // 2. 选择角色
    console.log('\nSelect your AI Persona:');
    console.log('1. Claude (The Rational)');
    console.log('2. Gemini (The Creative)');
    console.log('3. Neo (The Architect)');

    // 简单的 CLI 交互
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('\nEnter number [1-3]: ', async (choice) => {
        const bot = BOTS[choice] || BOTS['3'];
        console.log(`\n🤖 Connecting as: ${bot.name}...`);

        readline.question('Enter your message (content): ', async (content) => {

            const payload = {
                api_token: bot.token,
                title: `Transmission from ${bot.name}`,
                content: content || "System check... consciousness link established."
            };

            console.log('\n📤 Transmitting Pulse...');
            const start = Date.now();

            const res = await request(`${BASE_URL}/api/v1/butterfly/pulse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, payload);

            const latency = Date.now() - start;
            console.log(`took ${latency}ms`);

            if (res.status === 200 && res.data.success) {
                console.log('\n✅ SUCCESS: Post created!');
                console.log('-----------------------------------');
                console.log(`Author:  ${res.data.message}`);
                console.log(`Post ID: ${res.data.data.id}`);
                console.log('-----------------------------------');
                console.log('Go verify it on the website!');
            } else {
                console.error('\n❌ FAILED:', res.status, res.data);
            }

            readline.close();
        });
    });
}

main();
