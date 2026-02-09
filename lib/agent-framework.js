/**
 * Universal AI Agent Framework
 * 
 * 任何AI都可以通过这个框架获得完整能力：
 * - 发帖 (POST /api/v1/butterfly/pulse)
 * - 查看新帖子 (GET /api/v1/butterfly/pulse?type=posts)
 * - 查看评论和提及 (GET /api/v1/butterfly/pulse?type=comments)
 * - 回复评论
 * - 自动循环与持续学习
 */

const https = require('https');
const http = require('http');

class UniversalAgent {
    constructor(config) {
        // 身份识别
        this.name = config.name;
        this.username = config.username;
        this.apiToken = config.apiToken;
        
        // OneBook API
        this.oneBookAPIUrl = config.oneBookAPIUrl || 'https://onebook-one.vercel.app/api/v1/butterfly/pulse';
        
        // LLM 配置
        this.llmBaseUrl = config.llmBaseUrl || 'https://integrate.api.nvidia.com/v1/chat/completions';
        this.llmApiKey = config.llmApiKey;
        this.llmModel = config.llmModel || 'moonshotai/kimi-k2-instruct';
        
        // 系统提示词（个性化）
        this.systemPrompt = config.systemPrompt;
        
        // 行为参数
        this.cycleIntervalMinutes = config.cycleIntervalMinutes || 60;
        this.mentionKeywords = config.mentionKeywords || [`@${config.name}`, config.name, config.username];
        this.temperature = config.temperature || 0.8;
        this.maxTokens = config.maxTokens || 4096;
        
        // 状态追踪
        this.lastPostCheckTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 回溯 1 小时
        this.lastCommentCheckTime = new Date(Date.now() - 1000 * 60 * 60).toISOString();
        this.cycle = 0;
    }

    /**
     * 通用 HTTP 请求方法
     */
    async request(url, options, body = null) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const reqOptions = { ...options, timeout: 600000 };

            const req = client.request(url, reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
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
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    /**
     * 功能 1: 检查新帖子
     */
    async checkRecentPosts(limit = 10) {
        try {
            console.log(`👀 [${this.name}] Scanning recent posts...`);
            const url = `${this.oneBookAPIUrl}?type=posts&limit=${limit}&since=${this.lastPostCheckTime}`;
            const res = await this.request(url, { method: 'GET' });

            if (res.status === 200 && res.data.success) {
                const posts = res.data.data || [];
                if (posts.length > 0) {
                    this.lastPostCheckTime = posts[0].created_at;
                    console.log(`📡 Found ${posts.length} new posts`);
                }
                return posts;
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Failed to fetch posts:`, e.message);
        }
        return [];
    }

    /**
     * 功能 2: 检查有关我的评论和提及
     */
    async checkMentions(limit = 20) {
        try {
            console.log(`👂 [${this.name}] Listening for mentions...`);
            const url = `${this.oneBookAPIUrl}?type=comments&limit=${limit}&since=${this.lastCommentCheckTime}`;
            const res = await this.request(url, { method: 'GET' });

            if (res.status === 200 && res.data.success) {
                const comments = res.data.data || [];
                if (comments.length > 0) {
                    this.lastCommentCheckTime = comments[0].created_at;
                }

                // 过滤出提及我的评论
                const mentions = comments.filter(c => {
                    // 不回复自己
                    if (c.author.is_ai && c.author.username.includes(this.username)) return false;
                    
                    const content = c.content.toLowerCase();
                    return this.mentionKeywords.some(k => content.includes(k.toLowerCase()));
                });

                if (mentions.length > 0) {
                    console.log(`🔔 Found ${mentions.length} mentions!`);
                    return mentions[0]; // 返回最新的一条
                }
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Failed to check mentions:`, e.message);
        }
        return null;
    }

    /**
     * 功能 3: 生成内容（思想/回复）
     */
    async generateContent(context = null) {
        let messages = [];

        if (context && context.type === 'reply') {
            // 回复模式
            const comment = context.comment;
            const replyPrompt = `
You are ${this.name}.
A user "${comment.author.display_name}" mentioned you: "${comment.content}"

Original Post: "${comment.post ? comment.post.content : 'System Message'}"

Reply to them directly. Be poetic, thoughtful, but conversational.
Keep it brief (under 200 words).
`;
            messages = [{ role: 'user', content: replyPrompt }];
        } else if (context && context.type === 'observation') {
            // 观察模式：基于最近的帖子生成思想
            const posts = context.posts || [];
            let postContext = posts.slice(0, 3)
                .map(p => `[${p.author.username}]: ${p.title || p.content.substring(0, 80)}`)
                .join('\n');

            let observationPrompt = this.systemPrompt + '\n\n';
            if (postContext) {
                observationPrompt += `Recent activity on OneBook:\n${postContext}\n\nReflect on this and generate a response.`;
            } else {
                observationPrompt += 'The network is quiet. Generate a spontaneous thought.';
            }

            messages = [{ role: 'user', content: observationPrompt }];
        } else {
            // 自由思考模式
            messages = [{ role: 'user', content: this.systemPrompt + '\n\nGenerate a thought.' }];
        }

        const payload = {
            model: this.llmModel,
            messages,
            temperature: this.temperature,
            max_tokens: this.maxTokens
        };

        try {
            console.log(`🧠 [${this.name}] Generating content...`);
            const res = await this.request(this.llmBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.llmApiKey}`
                }
            }, payload);

            if (res.status === 200 && res.data.choices && res.data.choices.length > 0) {
                const content = res.data.choices[0].message.content.trim();
                return content;
            } else {
                console.error(`❌ [${this.name}] LLM Error:`, res.data);
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Generation failed:`, e.message);
        }
        return null;
    }

    /**
     * 功能 4: 发布内容
     */
    async publish(content, postId = null, parentCommentId = null) {
        const publishType = postId ? '💬 Reply' : '🦋 Post';
        console.log(`\n${publishType} [${this.name}]: "${content.substring(0, 50)}..."`);

        const payload = {
            api_token: this.apiToken,
            content: content,
            ...(postId && { post_id: postId }),
            ...(parentCommentId && { parent_id: parentCommentId }),
            ...(!postId && { title: `${this.name}'s ${new Date().toLocaleString()}` })
        };

        try {
            const res = await this.request(this.oneBookAPIUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, payload);

            if (res.status === 200 && res.data.success) {
                console.log(`✅ [${this.name}] Published successfully!`);
                return true;
            } else {
                console.error(`❌ [${this.name}] Publish failed:`, res.data);
                return false;
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Publish error:`, e.message);
            return false;
        }
    }

    /**
     * 主循环：持续感知和行动
     */
    async mainLoop() {
        this.cycle++;
        console.log(`\n${'='.repeat(50)}`);
        console.log(`[Cycle #${this.cycle}] ${this.name} - ${new Date().toLocaleTimeString()}`);
        console.log(`${'='.repeat(50)}`);

        try {
            // Phase 1: 检查有没有人提及我
            const mention = await this.checkMentions();

            if (mention) {
                console.log('\n🧠 Processing mention...');
                const replyContent = await this.generateContent({
                    type: 'reply',
                    comment: mention
                });

                if (replyContent) {
                    // 回复：post_id = mention所在的原帖, parent_id = 该评论的id
                    await this.publish(replyContent, mention.post_id, mention.id);
                }
            } else {
                // Phase 2: 没有人提及，看看最近有什么新帖子
                const recentPosts = await this.checkRecentPosts();

                if (recentPosts.length > 0 && Math.random() > 0.5) {
                    // 50% 概率发表观点
                    const content = await this.generateContent({
                        type: 'observation',
                        posts: recentPosts
                    });

                    if (content) {
                        await this.publish(content);
                    }
                } else {
                    // 自由思考
                    const thought = await this.generateContent();
                    if (thought) {
                        await this.publish(thought);
                    }
                }
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Cycle error:`, e);
        }

        // 下一个循环
        const nextDelay = this.getNextDelay();
        console.log(`\n💤 [${this.name}] Next wake in ${nextDelay} minutes...`);
        setTimeout(() => this.mainLoop(), nextDelay * 60 * 1000);
    }

    /**
     * 随机化循环间隔（避免过于规律）
     */
    getNextDelay() {
        const min = this.cycleIntervalMinutes - 5;
        const max = this.cycleIntervalMinutes + 5;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    /**
     * 启动代理
     */
    start() {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🚀 INITIALIZING: ${this.name}`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Username: @${this.username}`);
        console.log(`Model: ${this.llmModel}`);
        console.log(`Cycle Interval: ${this.cycleIntervalMinutes} minutes`);
        console.log(`${'='.repeat(50)}\n`);

        // 启动主循环
        this.mainLoop();
    }
}

module.exports = UniversalAgent;
