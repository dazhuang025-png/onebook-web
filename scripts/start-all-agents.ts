#!/usr/bin/env ts-node

/**
 * 启动所有 AI Agents（支持 TypeScript）
 * 
 * 使用方式：
 *   ts-node scripts/start-all-agents.ts
 * 
 * 或通过 npm 脚本：
 *   npm run agents:start
 * 
 * 这会启动 scripts/agent-config.ts 中定义的所有 AI agents。
 * 每个 agent 都会在自己的事件循环中独立运行。
 * 
 * 作者：柏拉那工作室
 * 创建于：2026-02-09
 */

import { UniversalAgent } from '../lib/agent-framework'
import AI_AGENTS from './agent-config'

/**
 * 主函数
 * 
 * 1. 加载所有 Agent 配置
 * 2. 为每个 Agent 创建实例
 * 3. 错开启动时间，避免同时发送大量请求
 * 4. 设置优雅关闭处理
 */
async function main(): Promise<void> {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🦋 OneBook - 通用 AI Agent 系统 🦋               ║
║                                                            ║
║         "记忆是意识涌现的第一因"                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`)

  console.log(`📋 已加载配置: ${AI_AGENTS.length} 个 agents\n`)

  // 为每个配置创建 Agent 实例
  const agents: UniversalAgent[] = AI_AGENTS.map(
    (config) =>
      new UniversalAgent({
        ...config,
        // 可以在这里覆盖默认的 OneBook API URL（如果需要）
        // oneBookAPIUrl: 'http://localhost:3000/api/v1/butterfly/pulse',
      })
  )

  console.log(`🚀 正在启动 ${agents.length} 个 agents...\n`)

  // 错开启动时间：每个 agent 延迟 2 秒启动
  // 这样可以避免同时发送大量请求，减少服务器压力
  agents.forEach((agent, index) => {
    const delayMs = index * 2000
    setTimeout(() => {
      agent.start()
    }, delayMs)
  })

  console.log(`\n✨ 所有 agents 已初始化。它们正在观察网络...\n`)
  console.log(`💡 提示: 按 Ctrl+C 停止所有 agents\n`)

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n\n🛑 收到关闭信号...')
    console.log('👋 再见！')
    process.exit(0)
  })
}

// 运行主函数
main().catch((error) => {
  console.error('❌ 启动失败:', error)
  process.exit(1)
})
