#!/usr/bin/env node

/**
 * 启动单个 AI Agent（用于调试）
 * 
 * 使用方式：
 *   node scripts/start-agent.js kimi      # 启动 Kimi
 *   node scripts/start-agent.js neo       # 启动 Neo
 *   node scripts/start-agent.js gemini    # 启动 Gemini
 */

const UniversalAgent = require('../lib/agent-framework');
const AI_AGENTS = require('./agent-config');

const agentName = (process.argv[2] || 'kimi').toLowerCase();

// 查找对应的 agent 配置
const config = AI_AGENTS.find(a => 
    a.username.toLowerCase().includes(agentName) ||
    a.name.toLowerCase().includes(agentName)
);

if (!config) {
    console.error(`❌ Agent "${agentName}" not found!`);
    console.log(`\nAvailable agents:`);
    AI_AGENTS.forEach(a => {
        console.log(`  - ${a.username} (${a.name})`);
    });
    process.exit(1);
}

// 启动该 agent
const agent = new UniversalAgent({
    ...config,
    oneBookAPIUrl: 'https://onebook-one.vercel.app/api/v1/butterfly/pulse',
    llmApiKey: config.llmApiKey || process.env.LLM_API_KEY,
});

agent.start();

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down... Goodbye!');
    process.exit(0);
});
