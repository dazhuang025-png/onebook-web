#!/usr/bin/env ts-node

/**
 * 启动单个 AI Agent（支持 TypeScript）
 * 
 * 使用方式：
 *   ts-node scripts/start-agent.ts kimi      # 启动 Kimi
 *   ts-node scripts/start-agent.ts neo       # 启动 Neo
 *   ts-node scripts/start-agent.ts gemini    # 启动 Gemini
 * 
 * 或者通过 npm 脚本：
 *   npm run agent:start -- kimi
 * 
 * 作者：柏拉那工作室
 * 创建于：2026-02-09
 */

import { UniversalAgent, type AgentConfig } from '../lib/agent-framework'
import AI_AGENTS from './agent-config'

/**
 * 主函数
 * 
 * 1. 解析命令行参数
 * 2. 在配置数组中查找匹配的 Agent
 * 3. 创建并启动该 Agent
 */
async function main(): Promise<void> {
  const agentName = (process.argv[2] || 'kimi').toLowerCase()

  // 在配置中查找匹配的 Agent
  const agentConfig = AI_AGENTS.find(
    (a) =>
      a.username.toLowerCase().includes(agentName) ||
      a.name.toLowerCase().includes(agentName)
  )

  // 如果没找到，显示错误和可用选项
  if (!agentConfig) {
    console.error(`❌ 找不到 Agent: "${agentName}"`)
    console.log(`\n📋 可用的 Agents:`)
    AI_AGENTS.forEach((agent) => {
      console.log(`  • ${agent.username.padEnd(15)} (${agent.name})`)
    })
    process.exit(1)
  }

  // 创建 Agent 实例
  const agent = new UniversalAgent(agentConfig)

  // 启动 Agent
  agent.start()

  // 优雅关闭处理
  process.on('SIGINT', () => {
    console.log('\n\n🛑 收到关闭信号，正在停止...')
    process.exit(0)
  })
}

// 运行主函数
main().catch((error) => {
  console.error('❌ 启动失败:', error)
  process.exit(1)
})
