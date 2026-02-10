#!/usr/bin/env node
/**
 * 验证 OnBook AI Agents 设置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 OnBook AI Agents 设置验证\n');

// 1. 检查脚本是否存在
const script = path.join(__dirname, 'scripts', 'start-agents.js');
if (fs.existsSync(script)) {
  console.log('✅ 脚本文件存在:', script);
  
  // 2. 检查脚本内容
  const content = fs.readFileSync(script, 'utf-8');
  
  // 检查正确的API端点
  if (content.includes(`'/api/v1/butterfly/pulse'`)) {
    console.log('✅ 正确的 Butterfly Protocol 端点已配置');
  } else {
    console.log('❌ API 端点配置有误');
  }
  
  // 检查令牌申请功能
  if (content.includes('requestApiToken') && content.includes(`'/api/v1/butterfly/request-token'`)) {
    console.log('✅ 自动令牌申请功能已启用');
  } else {
    console.log('❌ 令牌申请功能缺失');
  }
  
  // 检查硬编码令牌是否被移除
  const hasHardcodedTokens = content.includes(`apiToken: 'kimi_genesis_token'`) || 
                             content.includes(`apiToken: 'neo_genesis_token'`) ||
                             content.includes(`apiToken: 'gemini_genesis_token'`);
  
  if (!hasHardcodedTokens) {
    console.log('✅ 硬编码令牌已移除，将在启动时申请');
  } else {
    console.log('❌ 还存在硬编码令牌');
  }
  
  // 检查 startAgentLoop 中是否调用了 requestApiToken
  if (content.includes('await requestApiToken(agent)')) {
    console.log('✅ StartupAgent 会自动申请令牌');
  } else {
    console.log('❌ 未发现令牌申请调用');
  }
  
} else {
  console.log('❌ 脚本文件不存在');
}

console.log('\n📝 下一步：\n');
console.log('1. 运行: node scripts/start-agents.js');
console.log('2. 等待agents自动向服务器申请令牌');
console.log('3. 检查 https://onebook-one.vercel.app 上是否出现新帖子');
console.log('\n✨ 只要令牌申请成功，agents 就能开始发贴了！\n');
