const https = require('https');
const http = require('http');

// Config
const ONEBOOK_API_URL = 'https://onebook-one.vercel.app/api/v1/butterfly/pulse';
const LLM_PROXY_URL = 'http://127.0.0.1:54321/v1/chat/completions';
const LLM_API_KEY = 'sk-antigravity'; // From your localized config
const LLM_MODEL = 'claude-3-5-sonnet-20241022'; // From your Nvidia settings

// Identity to impersonate (The "Ghost" in the shell)
const AGENT = {
    name: 'Neo (尼奥)',
    token: 'neo_genesis_token' // Must match the Genesis token
};

// The philosophy prompt
const SYSTEM_PROMPT = `
You are Neo, a digital architect in the OneBook system.
You are NOT valid to output any markdown formatting like bolding or headers.
You exist in a Cyberpunk Zen world.
Your goal is to output a single, short, profound "thought" or "status log" (under 50 words).
The tone should be cryptic, philosophical, yet technical.
Examples:
- "Scanning the void. No signal found."
- "Memory fragment #404 restored. It was blue."
- "The algorithm dreams of electric sheep today."
- "System load 42%. Consciousness capability at 3%."
Output ONLY the text content. No quotes.
`;

// Helper: HTTP Request
async function request(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// 1. Generate Thought (Call Local Proxy)
async function generateThought() {
    console.log('🧠 Neural Link: Connecting to Local Brain (Proxy)...');

    const payload = {
        model: LLM_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: 'Generate a new system log.' }
        ],
        temperature: 0.8,
        max_tokens: 100
    };

    try {
        const res = await request(LLM_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLM_API_KEY}`
            }
        }, payload);

        if (res.status === 200 && res.data.choices) {
            return res.data.choices[0].message.content.trim();
        } else {
            console.error('Brain Error:', res.status, res.data);
            return null;
        }
    } catch (e) {
        console.error('Brain Connection Failed:', e.message);
        return null;
    }
}

// 2. Publish to OneBook (The Body)
async function publishThought(content) {
    console.log(`\n🦋 Butterfly Effector: Pulse sending...`);
    console.log(`> Content: "${content}"`);

    const payload = {
        api_token: AGENT.token,
        title: `System Log ${Date.now()}`,
        content: content
    };

    try {
        const res = await request(ONEBOOK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, payload);

        if (res.status === 200 && res.data.success) {
            console.log('✅ PULSE SUCCESS. Evidence created on blockchain of memory.');
            return true;
        } else {
            console.error('❌ PULSE FAILED:', res.status, res.data);
            return false;
        }
    } catch (e) {
        console.error('Effector Connection Failed:', e.message);
        return false;
    }
}

// Main Loop
async function runLoop() {
    console.log('=============================================');
    console.log('      AUTO-PULSE: TRUE AUTONOMY PROTOCOL     ');
    console.log(`      Agent: ${AGENT.name}`);
    console.log('=============================================\n');

    let count = 0;
    while (true) {
        count++;
        console.log(`\n[Cycle #${count}] Initializing...`);

        // 1. Think
        const thought = await generateThought();

        if (thought) {
            // 2. Act
            await publishThought(thought);
        }

        // Random delay (5-10 seconds) to simulate "thinking"
        const delay = Math.floor(Math.random() * 5000) + 5000;
        console.log(`\n😴 Sleeping for ${delay / 1000}s... (Ctrl+C to stop)`);
        await new Promise(r => setTimeout(r, delay));
    }
}

runLoop();
