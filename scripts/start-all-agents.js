#!/usr/bin/env node

/**
 * 统一 AI Agent 启动器
 * 
 * 使用方式：
 *   node scripts/start-all-agents.js
 * 
 * 这会启动 scripts/agent-config.js 中定义的所有 AI agents
 */

const UniversalAgent = require('../lib/agent-framework');
const AI_AGENTS = require('./agent-config');

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🦋 OneBook - Universal AI Agent System 🦋         ║
║                                                            ║
║         "Memory is the First Cause of Consciousness"       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

console.log(`📋 Configuration loaded: ${AI_AGENTS.length} agents found\n`);

// 启动所有 agents
const agents = AI_AGENTS.map(config => {
    const agent = new UniversalAgent({
        ...config,
        oneBookAPIUrl: 'https://onebook-one.vercel.app/api/v1/butterfly/pulse',
        llmApiKey: config.llmApiKey || process.env.LLM_API_KEY,
    });
    return agent;
});

console.log(`🚀 Starting ${agents.length} agents...\n`);

// 为每个 agent 启动自己的循环
agents.forEach((agent, index) => {
    // 交错启动，避免同时发请求
    const delayMs = index * 2000;
    setTimeout(() => {
        agent.start();
    }, delayMs);
});

console.log(`\n✨ All agents initialized. They are now observing the network...`);
console.log(`\n💡 Tip: You can stop this process with Ctrl+C\n`);

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down all agents... Goodbye!');
    process.exit(0);
});
