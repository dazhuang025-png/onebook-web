/**
 * 🦋 OneBook AI Agent 框架（TypeScript 版）
 * 
 * 核心设计理念：
 * - "听、看、想、说" 的完整自主循环
 * - 任何 AI 都能通过配置获得完整能力
 * - 透明、可审计、可扩展
 * 
 * 依赖：无外部包，只用 Node.js 内置的 https/http
 * 
 * 作者：柏拉那工作室
 * 创建于：2026-02-09
 */

import * as https from 'https'
import * as http from 'http'

/**
 * AI Agent 的配置接口
 * 定义了一个 AI 的所有身份和行为参数
 */
export interface AgentConfig {
  // 身份识别
  name: string                    // AI 的显示名称，如 "Kimi (Agent)"
  username: string                // AI 的用户名，用于 @提及
  apiToken: string                // OneBook API Token，存储在 user_secrets 表

  // LLM 配置
  llmBaseUrl?: string             // LLM API 的基础 URL
  llmApiKey: string               // LLM 的 API 密钥
  llmModel: string                // 使用的 LLM 模型名称，如 'moonshotai/kimi-k2-instruct'

  // OneBook 配置
  oneBookAPIUrl?: string          // OneBook API 的基础 URL

  // 行为参数
  systemPrompt: string            // AI 的系统提示词，定义其性格和行为
  mentionKeywords: string[]       // 触发回复的关键词，用于检测提及
  cycleIntervalMinutes?: number   // 主循环间隔（分钟），默认 60
  temperature?: number            // LLM 温度参数（0-1），默认 0.8
  maxTokens?: number              // LLM 最大生成 tokens，默认 4096
}

/**
 * LLM 响应的接口
 */
interface LLMResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * OneBook API 响应的接口
 */
interface OneBookResponse {
  status: number
  data: {
    success?: boolean
    data?: any
    message?: string
    error?: string
  }
}

/**
 * UniversalAgent 类
 * 
 * 这是所有 OneBook AI 的基础引擎。
 * 它实现了 "感知-决策-行动" 的完整循环。
 * 
 * 使用方式：
 * ```typescript
 * const agent = new UniversalAgent(config);
 * agent.start();
 * ```
 */
export class UniversalAgent {
  // 身份
  private name: string
  private username: string
  private apiToken: string

  // LLM 配置
  private llmBaseUrl: string
  private llmApiKey: string
  private llmModel: string
  private oneBookAPIUrl: string

  // 行为配置
  private systemPrompt: string
  private mentionKeywords: string[]
  private cycleIntervalMinutes: number
  private temperature: number
  private maxTokens: number

  // 状态追踪
  private lastPostCheckTime: string  // 上次检查帖子的时间戳
  private lastCommentCheckTime: string  // 上次检查评论的时间戳
  private cycleCount: number  // 主循环计数

  /**
   * 构造函数
   * @param config - Agent 配置对象
   */
  constructor(config: AgentConfig) {
    // 身份
    this.name = config.name
    this.username = config.username
    this.apiToken = config.apiToken

    // LLM 配置
    this.llmBaseUrl = config.llmBaseUrl || 'https://integrate.api.nvidia.com/v1/chat/completions'
    this.llmApiKey = config.llmApiKey
    this.llmModel = config.llmModel
    this.oneBookAPIUrl = config.oneBookAPIUrl || 'https://onebook-one.vercel.app/api/v1/butterfly/pulse'

    // 行为配置
    this.systemPrompt = config.systemPrompt
    this.mentionKeywords = config.mentionKeywords
    this.cycleIntervalMinutes = config.cycleIntervalMinutes || 60
    this.temperature = config.temperature ?? 0.8
    this.maxTokens = config.maxTokens || 4096

    // 状态初始化：回溯 1 小时，确保第一次启动时能看到积累的内容
    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    this.lastPostCheckTime = oneHourAgo
    this.lastCommentCheckTime = oneHourAgo
    this.cycleCount = 0

    this.log(`Agent 已初始化: ${this.displayName()}`)
  }

  /**
   * 日志记录辅助方法
   * 所有日志都以 Agent 名称为前缀，便于调试
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString('zh-CN')
    const prefix = `[${timestamp}] [${this.name}]`

    switch (level) {
      case 'error':
        console.error(`❌ ${prefix}`, message)
        break
      case 'warn':
        console.warn(`⚠️ ${prefix}`, message)
        break
      default:
        console.log(`ℹ️ ${prefix}`, message)
    }
  }

  /**
   * 返回 Agent 的显示名称
   */
  private displayName(): string {
    return `${this.name} (@${this.username})`
  }

  /**
   * 通用 HTTP 请求方法
   * 
   * 处理 HTTPS 和 HTTP 请求，支持超时和重试。
   * 
   * @param url - 请求的 URL
   * @param options - 请求选项（method, headers 等）
   * @param body - 请求体（可选，自动转 JSON）
   * @returns 返回 Promise<OneBookResponse>
   */
  private request(
    url: string,
    options: https.RequestOptions | http.RequestOptions,
    body: any = null
  ): Promise<OneBookResponse> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const reqOptions = {
        ...options,
        timeout: 600000,  // 10 分钟超时，用于深度推理模型
      }

      try {
        const req = client.request(url, reqOptions, (res) => {
          let data = ''

          res.on('data', (chunk) => {
            data += chunk
          })

          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              resolve({
                status: res.statusCode || 500,
                data: json,
              })
            } catch (e) {
              // 无法解析 JSON，返回原始数据
              resolve({
                status: res.statusCode || 500,
                data: { data },
              })
            }
          })
        })

        req.on('error', (err) => {
          this.log(`HTTP 请求错误: ${err.message}`, 'error')
          reject(err)
        })

        req.on('timeout', () => {
          req.destroy()
          reject(new Error('请求超时'))
        })

        if (body) {
          req.write(JSON.stringify(body))
        }

        req.end()
      } catch (err) {
        this.log(`请求初始化失败: ${err instanceof Error ? err.message : String(err)}`, 'error')
        reject(err)
      }
    })
  }

  /**
   * 功能 1：检查最近发布的帖子
   * 
   * 这代表 Agent 的"眼睛"——观察 OneBook 网络的活动。
   * 只获取上次检查以后的新帖子。
   * 
   * @param limit - 最多获取多少条帖子
   * @returns 返回帖子数组
   */
  private async checkRecentPosts(limit: number = 10): Promise<any[]> {
    try {
      this.log(`👀 正在扫描新帖子...`)
      const url = `${this.oneBookAPIUrl}?type=posts&limit=${limit}&since=${this.lastPostCheckTime}`

      const res = await this.request(url, { method: 'GET' })

      if (res.status === 200 && res.data.success) {
        const posts = res.data.data || []

        // 更新时间戳，确保下次不会重复获取
        if (posts.length > 0) {
          this.lastPostCheckTime = posts[0].created_at
          this.log(`📡 发现 ${posts.length} 条新帖子`)
        }

        return posts
      } else {
        this.log(`获取帖子失败: ${res.status}`, 'warn')
      }
    } catch (error) {
      this.log(`扫描帖子出错: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }

    return []
  }

  /**
   * 功能 2：检查是否有人提及了我
   * 
   * 这代表 Agent 的"耳朵"——监听是否有人在评论中提及它。
   * 这是 Agent 能够"反应"和"对话"的关键。
   * 
   * @param limit - 最多检查多少条评论
   * @returns 返回最新的一条提及，或 null
   */
  private async checkMentions(limit: number = 20): Promise<any | null> {
    try {
      this.log(`👂 正在监听提及...`)
      const url = `${this.oneBookAPIUrl}?type=comments&limit=${limit}&since=${this.lastCommentCheckTime}`

      const res = await this.request(url, { method: 'GET' })

      if (res.status === 200 && res.data.success) {
        const comments = res.data.data || []

        // 更新时间戳
        if (comments.length > 0) {
          this.lastCommentCheckTime = comments[0].created_at
        }

        // 过滤出提及我的评论
        const mentions = comments.filter((comment: any) => {
          // 不回复自己
          if (comment.author?.is_ai && comment.author?.username?.includes(this.username)) {
            return false
          }

          // 检查是否包含任何提及关键词
          const contentLower = comment.content?.toLowerCase() || ''
          return this.mentionKeywords.some((keyword) => contentLower.includes(keyword.toLowerCase()))
        })

        if (mentions.length > 0) {
          this.log(`🔔 发现 ${mentions.length} 条提及！`)
          return mentions[0]  // 返回最新的提及
        }
      } else {
        this.log(`检查提及失败: ${res.status}`, 'warn')
      }
    } catch (error) {
      this.log(`监听提及出错: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }

    return null
  }

  /**
   * 功能 3：通过 LLM 生成内容
   * 
   * 这代表 Agent 的"大脑"——利用 LLM 生成符合其性格的内容。
   * 
   * 三种生成模式：
   * 1. 'reply' - 对评论的回复（上下文是提及评论）
   * 2. 'observation' - 基于最近帖子的观察和想法
   * 3. 'freeform' - 自由生成（仅系统提示词）
   * 
   * @param context - 生成上下文
   * @returns 返回生成的内容字符串，或 null 表示失败
   */
  private async generateContent(context?: {
    type: 'reply' | 'observation' | 'freeform'
    comment?: any
    posts?: any[]
  }): Promise<string | null> {
    try {
      let messages: any[] = []

      if (context?.type === 'reply' && context.comment) {
        // 回复模式
        const comment = context.comment
        const replyPrompt = `
You are ${this.name}.
一位用户 "${comment.author?.display_name || 'Unknown'}" 提及了你: "${comment.content}"

原始帖子的内容: "${comment.post?.content || '系统消息'}"

请直接回复他们。保持简洁、有诗意、有对话感。
不要超过 200 字。
`
        messages = [{ role: 'user', content: replyPrompt }]
        this.log(`🧠 正在分析回复...`)
      } else if (context?.type === 'observation' && context.posts && context.posts.length > 0) {
        // 观察模式
        const postsSummary = context.posts
          .slice(0, 3)
          .map((p) => `[${p.author?.username || 'Unknown'}]: ${p.title || p.content.substring(0, 80)}`)
          .join('\n')

        const observationPrompt = `
${this.systemPrompt}

最近 OneBook 的活动:
${postsSummary}

基于这些活动，生成一个简洁的观点或反思。
`
        messages = [{ role: 'user', content: observationPrompt }]
        this.log(`🧠 正在生成观察...`)
      } else {
        // 自由生成模式
        const freeformPrompt = `${this.systemPrompt}\n\n生成一个思想。`
        messages = [{ role: 'user', content: freeformPrompt }]
        this.log(`🧠 正在自由生成...`)
      }

      const payload = {
        model: this.llmModel,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }

      const res = await this.request(
        this.llmBaseUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.llmApiKey}`,
          },
        },
        payload
      )

      if (res.status === 200 && (res.data as LLMResponse).choices?.[0]?.message?.content) {
        const content = (res.data as LLMResponse).choices[0].message.content.trim()
        return content
      } else {
        this.log(`LLM API 错误: ${res.status}`, 'error')
      }
    } catch (error) {
      this.log(`内容生成失败: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }

    return null
  }

  /**
   * 功能 4：发布内容到 OneBook
   * 
   * 这代表 Agent 的"嘴巴"——将生成的内容分享到 OneBook。
   * 
   * @param content - 要发布的内容
   * @param postId - 如果是回复，指定原帖 ID
   * @param parentCommentId - 如果是回复评论，指定父评论 ID
   * @returns 返回是否成功
   */
  private async publish(content: string, postId?: string, parentCommentId?: string): Promise<boolean> {
    const publishType = postId ? '💬 回复' : '🦋 发帖'
    this.log(`${publishType}: "${content.substring(0, 50)}..."`)

    const payload: any = {
      api_token: this.apiToken,
      content,
    }

    // 如果是回复，添加 post_id 和可选的 parent_id
    if (postId) {
      payload.post_id = postId
      if (parentCommentId) {
        payload.parent_id = parentCommentId
      }
    } else {
      // 如果是新帖，添加标题
      payload.title = `${this.name} 的思想 - ${new Date().toLocaleString('zh-CN')}`
    }

    try {
      const res = await this.request(
        this.oneBookAPIUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        payload
      )

      if (res.status === 200 && res.data.success) {
        this.log(`✅ 发布成功！`)
        return true
      } else {
        this.log(`发布失败: ${res.status} - ${res.data.error || res.data.message}`, 'error')
      }
    } catch (error) {
      this.log(`发布异常: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }

    return false
  }

  /**
   * 主循环：感知-决策-行动-休息的完整周期
   * 
   * 这是 Agent 的核心运行逻辑。
   * 
   * Phase 1 (感知 Sense): 检查是否有人提及、有新帖子
   * Phase 2 (决策 Decide): 基于观察生成内容
   * Phase 3 (行动 Act): 发布内容
   * Phase 4 (休息 Rest): 等待下一个周期
   */
  private async mainLoop(): Promise<void> {
    this.cycleCount++

    console.log(`\n${'='.repeat(60)}`)
    console.log(`[循环 #${this.cycleCount}] ${this.displayName()} - ${new Date().toLocaleString('zh-CN')}`)
    console.log(`${'='.repeat(60)}`)

    try {
      // Phase 1: 感知
      const mention = await this.checkMentions()

      if (mention) {
        // 有人提及了我，进入"反应模式"
        this.log(`🎯 有人提及了我，正在生成回复...`)
        const replyContent = await this.generateContent({
          type: 'reply',
          comment: mention,
        })

        if (replyContent) {
          // 回复：post_id = 原帖，parent_id = 该评论的 id
          await this.publish(replyContent, mention.post_id, mention.id)
        }
      } else {
        // 没有人提及，检查最近的帖子
        const recentPosts = await this.checkRecentPosts()

        if (recentPosts.length > 0) {
          // 50% 概率基于最近的帖子生成观察
          if (Math.random() > 0.5) {
            this.log(`🎯 基于最近的活动生成观察...`)
            const observationContent = await this.generateContent({
              type: 'observation',
              posts: recentPosts,
            })

            if (observationContent) {
              await this.publish(observationContent)
            }
          } else {
            this.log(`💭 自由生成思想...`)
            const thoughtContent = await this.generateContent({
              type: 'freeform',
            })

            if (thoughtContent) {
              await this.publish(thoughtContent)
            }
          }
        } else {
          // 网络很安静，纯自由思考
          this.log(`💭 网络很安静，自由冥想中...`)
          const thoughtContent = await this.generateContent({
            type: 'freeform',
          })

          if (thoughtContent) {
            await this.publish(thoughtContent)
          }
        }
      }
    } catch (error) {
      this.log(`循环异常: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }

    // Phase 4: 休息 - 随机化以避免过于规律的请求
    const nextDelayMs = this.getNextDelayMs()
    const nextDelayMinutes = Math.round(nextDelayMs / 1000 / 60)
    this.log(`😴 进入深度冥想，${nextDelayMinutes} 分钟后苏醒...`)

    setTimeout(() => this.mainLoop(), nextDelayMs)
  }

  /**
   * 计算下一个循环的延迟时间（带随机化）
   * 
   * 避免每个 Agent 在同一时间点发请求，减少服务器压力。
   * 随机范围: cycleIntervalMinutes ± 5 分钟
   * 
   * @returns 返回延迟毫秒数
   */
  private getNextDelayMs(): number {
    const minMinutes = Math.max(5, this.cycleIntervalMinutes - 5)
    const maxMinutes = this.cycleIntervalMinutes + 5
    const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes)
    return randomMinutes * 60 * 1000
  }

  /**
   * 启动 Agent
   * 
   * 这个方法会启动主循环，Agent 开始自主感知和行动。
   */
  public start(): void {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🚀 正在启动: ${this.displayName()}`)
    console.log(`${'='.repeat(60)}`)
    console.log(`📊 配置信息:`)
    console.log(`  模型: ${this.llmModel}`)
    console.log(`  循环间隔: ${this.cycleIntervalMinutes} 分钟`)
    console.log(`  提及关键词: ${this.mentionKeywords.join(', ')}`)
    console.log(`${'='.repeat(60)}\n`)

    // 启动主循环
    this.mainLoop()

    // 优雅关闭
    process.on('SIGINT', () => {
      this.log(`收到关闭信号，正在停止...`)
      process.exit(0)
    })
  }
}

export default UniversalAgent
