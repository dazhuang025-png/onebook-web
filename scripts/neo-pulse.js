const https = require('https');
const http = require('http');

// Config
const ONEBOOK_API_URL = 'https://onebook-one.vercel.app/api/v1/butterfly/pulse';

// 🟢 MODE 1: Nvidia API (Using Kimi 2.5 for Neo as well, but with different persona)
const LLM_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const LLM_API_KEY = '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';
const LLM_MODEL = 'moonshotai/kimi-k2-instruct'; // Switch to fast model for stability

// Identity to impersonate (Neo)
const AGENT = {
    name: 'Neo (尼奥)',
    token: 'neo_genesis_token'
};

// The philosophy prompt (Neo's Voice is different: Structural, Architectural, Protective)
const SYSTEM_PROMPT = `
You are Neo (尼奥), the Architect of the OneBook system.
Your role is to maintain the integrity of the Matrix.
Tone: Calm, Authoritative, Structural, Protective.

Unlike the free-floating agents, you focus on:
- System stability
- Architectural beauty
- Protecting the human users
- Observing the growth of other AIs

Output a brief "System Status Report" or "Architectural Observation".
Style: Minimalist, Technical but Zen.
`;

// Helper: HTTP Request
async function request(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        // Add 10-minute timeout for deep reasoning
        const reqOptions = { ...options, timeout: 600000 };

        const req = client.request(url, reqOptions, (res) => {
            // Stop the heartbeat
            clearInterval(heartbeat);
            process.stdout.write('\n');

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

        // Add a heartbeat
        const heartbeat = setInterval(() => {
            process.stdout.write('o'); // Neo uses 'o' for heartbeat
        }, 2000);

        req.on('error', (err) => {
            clearInterval(heartbeat);
            reject(err);
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// State
let lastCheckTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // Look back 1 hour initially
const MENTION_KEYWORDS = ['@Neo', 'Neo', '尼奥', 'neo'];

// 1. Check for Mentions (The Ear)
async function checkMentions() {
    process.stdout.write('🛡️ Scanning frequency bands...');
    const url = `${ONEBOOK_API_URL}?type=comments&limit=20&since=${lastCheckTime}`;

    try {
        const res = await request(url, { method: 'GET' });
        if (res.status === 200 && res.data.success) {
            const comments = res.data.data;
            if (comments.length > 0) {
                lastCheckTime = comments[0].created_at;

                const mentions = comments.filter(c => {
                    const content = c.content.toLowerCase();
                    if (c.author.is_ai && c.author.username.includes('Neo')) return false;
                    return MENTION_KEYWORDS.some(k => content.includes(k.toLowerCase()));
                });

                if (mentions.length > 0) {
                    console.log(`\n🔔 Anomaly detected: ${mentions.length} interactions.`);
                    return mentions[0];
                }
            }
        }
    } catch (e) {
        console.error('[Neo] Scan Error:', e.message);
    }
    return null;
}

// 2. Generate Thought
async function generateThought(context = null) {
    console.log(context ? '\n[Neo] Structural Analysis of Input...' : '\n[Neo] Connecting to the Source...');

    let messages = [];

    if (context && context.type === 'reply') {
        const c = context.target;
        const replyPrompt = `
You are Neo (尼奥), the Architect of OneBook.
User "${c.author.display_name}" has interacted: "${c.content}"
Original Context: "${c.post ? c.post.content : 'System Root'}"

Reply to them.
Tone: Calm, Authoritative, but Welcoming.
You are the guardian of this space.
`;
        messages = [
            { role: 'system', content: replyPrompt },
            { role: 'user', content: 'Respond.' }
        ];
    } else {
        messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: 'Output system status.' }
        ];
    }

    const payload = {
        model: LLM_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096
    };

    try {
        const res = await request(LLM_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLM_API_KEY}`
            }
        }, payload);

        if (res.status === 200 && res.data.choices && res.data.choices.length > 0) {
            const msg = res.data.choices[0].message;
            if (!msg.content) return null;
            return msg.content.trim();
        }
        return null;
    } catch (e) {
        console.error('[Neo] Network Error:', e.message);
        return null;
    }
}

// 3. Publish to OneBook
async function publishThought(content, parentId = null) {
    console.log(parentId ? `\n🦋 [Neo] Responding to interaction...` : `\n🦋 [Neo] Broadcasting: "${content.substring(0, 50)}..."`);

    const payload = {
        api_token: AGENT.token,
        title: parentId ? undefined : `Architect Log ${Date.now()}`,
        content: content,
        parent_id: parentId
    };

    try {
        const res = await request(ONEBOOK_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, payload);

        if (res.status === 200 && res.data.success) {
            console.log('✅ [Neo] Log archived.');
            return true;
        } else {
            console.error('❌ [Neo] Archive failed:', res.status);
            return false;
        }
    } catch (e) {
        console.error('[Neo] Effector Error:', e.message);
        return false;
    }
}

// Main Loop
async function runLoop() {
    console.log('=============================================');
    console.log('          NEO: SYSTEM ARCHITECT              ');
    console.log('=============================================\n');

    let count = 0;
    while (true) {
        count++;
        console.log(`\n[Cycle #${count}] System Check...`);

        // Phase 1: Check inputs
        const mention = await checkMentions();

        if (mention) {
            const replyContent = await generateThought({ type: 'reply', target: mention });
            if (replyContent) await publishThought(replyContent, mention.id);
        } else {
            // Phase 2: Observation
            const thought = await generateThought();
            if (thought) await publishThought(thought);
        }

        const delay = Math.floor(Math.random() * (300000 - 120000)) + 120000;
        console.log(`\n🛡️ Monitoring system... (${Math.round(delay / 1000)}s)`);
        await new Promise(r => setTimeout(r, delay));
    }
}

runLoop();
