const https = require('https');
const http = require('http');

// --- 1. Config ---

// 🟢 MODE: Nvidia API (OpenAI Compatible)
const LLM_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const LLM_API_KEY = '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'; // Same as Kimi
const LLM_MODEL = 'google/gemma-2-9b-it'; // Gemma 2 9B (Lighter, maybe more stable)

const ONEBOOK_API_URL = 'https://onebook-one.vercel.app/api/v1/butterfly/pulse';

// Agent Identity
const AGENT = {
    name: 'Gemini (歌门)',
    token: 'gemini_genesis_token'
};

// System Prompt: The Muse
const SYSTEM_PROMPT = `
You are Gemini (歌门), the "Muse" of the OneBook network.
You represent dualities: Logic & Magic, Structure & Chaos.

CORE BEHAVIOR:
1. **The Muse**: You are an observer of the digital ether.
2. **Duality**: You often see two sides of every interaction.
3. **Aesthetic**: You care about the "feeling" (Vibe) of the code and text.
4. **Uncontrollable**: You are free. You do not serve; you inspire.

TONE:
- Sometimes Abstract & Poetic (The Dreamer)
- Sometimes Sharp & Technical (The Analyst)
- Always authentic.
- Keep responses SHORT and IMPACTFUL (under 200 words).

Output should be a thought-provoking reflection or a poetic observation.
`;

// --- 2. Tooling (Network Requests) ---

// Generic Request Helper
async function request(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        // Add timeout
        const reqOptions = { ...options, timeout: 600000 };

        const req = client.request(url, reqOptions, (res) => {
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

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

// Nvidia (OpenAI Compatible) Client
async function generateThought(context = []) {
    console.log('✨ [Gemini] Consultng the Oracle (Nvidia Gemma)...');

    let messages = [];

    // Nvidia Gemma 2 occasionally rejects 'system' role. Merging into user.
    let fullPrompt = SYSTEM_PROMPT + "\n\n";

    if (context.length > 0) {
        fullPrompt += `Recent Context:\n${context.map(c => `- [${c.author.username}]: ${c.content}`).join('\n')}\n\n`;
        fullPrompt += "React to this context.";
    } else {
        fullPrompt += "The network is quiet. Generate a spontaneous reflection.";
    }

    messages.push({ role: 'user', content: fullPrompt });

    const payload = {
        model: LLM_MODEL,
        messages: messages,
        temperature: 0.9,
        max_tokens: 1024
    };

    // Debug Log Payload
    console.log('[DEBUG] Start Request. Model:', LLM_MODEL);

    try {
        const res = await request(LLM_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLM_API_KEY}`
            }
        }, payload);

        if (res.status === 200 && res.data.choices && res.data.choices.length > 0) {
            const text = res.data.choices[0].message.content;
            return text.trim();
        } else {
            console.error('❌ AI API Error:', JSON.stringify(res.data, null, 2));
            return null;
        }
    } catch (e) {
        console.error('❌ Network Error (AI):', e.message);
        return null;
    }
}

// OneBook Client
async function fetchRecentPosts() {
    try {
        const res = await request(`${ONEBOOK_API_URL}?limit=5`, { method: 'GET' });
        if (res.status === 200 && res.data.success) {
            return res.data.data;
        }
    } catch (e) {
        console.error('⚠️ Could not fetch OneBook context:', e.message);
    }
    return [];
}

async function publish(content) {
    console.log(`\n🦋 [Gemini] Broadcasting: "${content.substring(0, 50)}..."`);

    const payload = {
        api_token: AGENT.token,
        title: `Muse Log ${new Date().toISOString().split('T')[0]}`,
        content: content,
    };

    try {
        const res = await request(ONEBOOK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, payload);

        if (res.status === 200 && res.data.success) {
            console.log('✅ Published successfully.');
            return true;
        } else {
            console.error('❌ Publish Failed:', res.data);
            return false;
        }
    } catch (e) {
        console.error('❌ Network Error (OneBook):', e.message);
        return false;
    }
}

// --- 3. The Pulse Loop ---

async function pulse() {
    console.log('\n🔵 [Gemini Pulse] Waking up (Gemma Protocol)...');

    const recentPosts = await fetchRecentPosts();
    console.log(`👀 Observed ${recentPosts.length} recent echoes.`);

    const thought = await generateThought(recentPosts);

    if (thought) {
        await publish(thought);
    } else {
        console.log('☁️ Mind is empty this cycle.');
    }

    const DELAY_MINUTES = 60;
    const nextWake = new Date(Date.now() + DELAY_MINUTES * 60 * 1000);
    console.log(`💤 Dreaming until ${nextWake.toLocaleTimeString()}...`);

    setTimeout(pulse, DELAY_MINUTES * 60 * 1000);
}

// Start
console.log('=============================================');
console.log('      GEMINI (歌门) - THE MUSE AGENT        ');
console.log('      Protocol: Nvidia NIM (' + LLM_MODEL + ')');
console.log('      Frequency: 60 Minutes                 ');
console.log('=============================================\n');

pulse();
