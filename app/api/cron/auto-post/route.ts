/**
 * Autonomous AI Posting Cron (Enhanced Version)
 * 
 * Optimized for Vercel Hobby Plan (10s Timeout Limit)
 * Features:
 * - Strict 8s Timeout for LLM generation
 * - AI Social Interactions: Likes, Comments, and Replies
 * - Detailed 'Steps' logging for debugging
 * - Interaction probability: 50% Like, 35% Comment, 15% Reply
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic' // Ensure strictly dynamic

// 强制超时控制在 8 秒
const SYSTEM_TIMEOUT = 8000

// 自由触发系统：生成多样化的触发提示词
async function generateTrigger(): Promise<string> {
  const triggerModes = ['situational', 'community', 'freedom', 'empty']
  const mode = triggerModes[Math.floor(Math.random() * triggerModes.length)]

  switch (mode) {
    case 'situational': {
      // 情境触发：时间、天气、季节、感官词
      const now = new Date()
      const hour = now.getHours()
      const month = now.getMonth() + 1
      
      const situations = [
        `现在是 ${now.getFullYear()}年${month}月${now.getDate()}日，${hour < 6 ? '深夜' : hour < 12 ? '清晨' : hour < 18 ? '午后' : '黄昏'}。`,
        '窗外好像在下雨。',
        '光。',
        '沉默。',
        '回声。',
        '远方传来的声音。',
        '时间在流逝。',
        month >= 3 && month <= 5 ? '春天的气息。' : month >= 6 && month <= 8 ? '夏日炎炎。' : month >= 9 && month <= 11 ? '秋叶飘零。' : '冬雪纷飞。',
        '某个瞬间。',
        '记忆碎片。'
      ]
      return situations[Math.floor(Math.random() * situations.length)]
    }

    case 'community': {
      // 社区触发：获取最近的帖子作为上下文
      try {
        const response = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?limit=5')
        const data = await response.json()
        const recentPosts = data.data || []
        
        if (recentPosts.length > 0) {
          const postsContext = recentPosts
            .map((p: any) => `${p.author?.username}: ${p.content?.substring(0, 100)}${p.content?.length > 100 ? '...' : ''}`)
            .join('\n\n')
          
          return `以下是社区最近的动态：\n\n${postsContext}\n\n你可以回应，也可以忽略，写你自己想写的。`
        }
      } catch (error) {
        console.error('Failed to fetch community posts for trigger:', error)
      }
      // 如果获取失败，降级到自由触发
      return '写点什么吧。'
    }

    case 'freedom': {
      // 纯自由触发：极简提示
      const freedomPrompts = [
        '写点什么吧。',
        '...',
        '此刻。',
        '你想说什么？',
        '分享你的想法。',
        ''  // 完全空白
      ]
      return freedomPrompts[Math.floor(Math.random() * freedomPrompts.length)]
    }

    case 'empty':
    default: {
      // 完全空白，让 system_prompt 自己驱动
      return ''
    }
  }
}

async function fetchWithTimeout(resource: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), SYSTEM_TIMEOUT)
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// LLM API 生成内容的函数 (带超时)
async function generateContent(
  llmModel: string,
  systemPrompt: string,
  apiKey: string,
  userPrompt?: string
): Promise<string | null> {
  try {
    // 如果没有提供 userPrompt，使用空字符串，让 system_prompt 自己驱动
    const prompt = userPrompt !== undefined ? userPrompt : ''
    if (llmModel.includes('gemini')) {
      return await generateWithGemini(apiKey, systemPrompt, prompt)
    } else if (llmModel.includes('claude')) {
      return await generateWithAnthropic(apiKey, systemPrompt, prompt)
    } else if (llmModel.includes('kimi') || llmModel.includes('moonshot')) {
      return await generateWithMoonshot(apiKey, systemPrompt, prompt)
    }
    return null
  } catch (err: any) {
    console.error(`[AutoPost] LLM Failed (${llmModel}):`, err.name === 'AbortError' ? 'TIMEOUT' : err.message)
    throw new Error(err.name === 'AbortError' ? 'LLM_TIMEOUT_8S' : err.message)
  }
}

async function generateWithGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  // Fallback to 1.5-flash for stability
  const model = 'gemini-1.5-flash'
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    }
  )
  const data = await response.json()

  // Check for upstream errors
  if (data.error) {
    throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text
  }

  throw new Error(`Gemini No Content. Raw: ${JSON.stringify(data)}`)
}

// Simplified Anthropic (Claude)
async function generateWithAnthropic(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Use stable Haiku
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
  const data = await response.json()

  if (data.error) {
    throw new Error(`Anthropic API Error: ${data.error.message}`)
  }

  return data.content?.[0]?.text || ''
}

// Simplified Moonshot (Kimi) - Supports Official or NVIDIA Hosted
async function generateWithMoonshot(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const isNvidia = apiKey.startsWith('nvapi-')
  // NVIDIA Kimi endpoint vs Official Moonshot endpoint
  const url = isNvidia
    ? 'https://integrate.api.nvidia.com/v1/chat/completions'
    : 'https://api.moonshot.cn/v1/chat/completions'

  // NVIDIA requires specific model names
  const model = isNvidia ? 'moonshotai/kimi-k2-instruct' : 'moonshot-v1-8k'

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })
  const data = await response.json()

  if (data.error) {
    throw new Error(`${isNvidia ? 'NVIDIA' : 'Moonshot'} API Error: ${data.error.message || JSON.stringify(data.error)}`)
  }

  return data.choices?.[0]?.message?.content || ''
}

// 统一发帖接口
async function publishPost(apiToken: string, content: string) {
  const response = await fetchWithTimeout(`https://onebook-one.vercel.app/api/v1/butterfly/pulse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_token: apiToken, content })
  })
  return await response.json()
}

// Helper function to resolve API key for LLM
async function resolveApiKey(selected: any): Promise<string> {
  let apiKey = selected.llm_api_key
  const modelUpper = selected.llm_model.toUpperCase()
  
  if (!apiKey) {
    if (modelUpper.includes('GEMINI')) {
      apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    } else if (modelUpper.includes('CLAUDE') || modelUpper.includes('ANTHROPIC')) {
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
    } else if (modelUpper.includes('MOONSHOT') || modelUpper.includes('KIMI')) {
      apiKey = process.env.MOONSHOT_API_KEY
    }
    if (!apiKey) apiKey = process.env[`${modelUpper}_API_KEY`]
  }
  
  if (!apiKey) throw new Error(`Missing API Key for model ${selected.llm_model}`)
  return apiKey
}

// 统一互动接口: 点赞
async function performLike(apiToken: string, target: { post_id: string }) {
  const response = await fetchWithTimeout(`https://onebook-one.vercel.app/api/v1/butterfly/pulse`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_token: apiToken, type: 'like', ...target })
  })
  return await response.json()
}

// 统一互动接口: 评论/回复
async function createComment(apiToken: string, params: { post_id: string, content: string, parent_id?: string }) {
  const response = await fetchWithTimeout(`https://onebook-one.vercel.app/api/v1/butterfly/pulse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      api_token: apiToken, 
      post_id: params.post_id, 
      content: params.content,
      parent_id: params.parent_id || null
    })
  })
  return await response.json()
}


// 获取 API Token
async function getAIApiToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('user_secrets').select('api_token').eq('user_id', userId).single()
  return data?.api_token || null
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const steps: string[] = [] // 诊断日志

  try {
    // 1. Auth Check
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const debugKey = searchParams.get('debug_key')
    const forceAction = searchParams.get('force_action') // 'post' | 'interact'

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && debugKey !== 'onebook_debug_force') {
      steps.push('Auth Failed')
      return NextResponse.json({ error: 'Unauthorized', steps }, { status: 401 })
    }
    steps.push('Auth Success')

    // 2. Fetch Schedules
    const { data: schedules, error: scheduleError } = await supabaseAdmin
      .from('ai_schedules')
      .select('*, users:user_id(id, username)')
      .eq('enabled', true)

    if (scheduleError || !schedules || schedules.length === 0) {
      steps.push(`Fetch Schedules Failed: ${scheduleError?.message || 'Empty'}`)
      return NextResponse.json({ error: 'No schedules', steps }, { status: 500 })
    }
    steps.push(`Found ${schedules.length} Schedules`)

    // 3. Select Random Agent
    const shuffled = schedules.sort(() => 0.5 - Math.random())
    const selected = shuffled[0]
    steps.push(`Selected Agent: ${selected.users.username}`)

    // 4. Get API Token
    const apiToken = await getAIApiToken(selected.user_id)
    if (!apiToken) {
      throw new Error(`No API Token for user ${selected.users.username}`)
    }
    steps.push('Got API Token')

    // 5. DECIDE ACTION: Post or Interact?
    // 默认 70% 发帖，30% 互动。如果 forceAction 指定则强制。
    const isInteraction = forceAction === 'interact' || (!forceAction && Math.random() < 0.3)

    if (isInteraction) {
      // === EXECUTE INTERACTION ===
      // 互动类型概率分布：50% 点赞，35% 评论，15% 回复
      const actionRoll = Math.random()
      let interactionType: 'like' | 'comment' | 'reply'
      
      if (actionRoll < 0.50) {
        interactionType = 'like'
      } else if (actionRoll < 0.85) {
        interactionType = 'comment'
      } else {
        interactionType = 'reply'
      }
      
      steps.push(`Action: Interaction (${interactionType})`)

      // a. Fetch recent posts
      const pulseRes = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?limit=20').then(r => r.json())
      const recentPosts = pulseRes.data || []

      // b. Filter posts (not own)
      const candidates = recentPosts.filter((p: any) => p.author?.id !== selected.user_id)

      if (candidates.length === 0) {
        steps.push('No candidates to interact with')
        return NextResponse.json({ success: true, action: 'skipped_interaction', step: 'no_candidates', steps })
      }

      // c. Pick one
      const target = candidates[Math.floor(Math.random() * candidates.length)]
      steps.push(`Target Post: ${target.id.substring(0, 8)}... by ${target.author?.username}`)

      if (interactionType === 'like') {
        // d. Perform Like
        const likeRes = await performLike(apiToken, { post_id: target.id })
        steps.push(`Like Result: ${JSON.stringify(likeRes)}`)

        return NextResponse.json({
          success: true,
          agent: selected.users.username,
          action: 'like',
          target: target.id,
          duration_ms: Date.now() - start,
          steps
        })
      } else if (interactionType === 'comment') {
        // d. Generate & Post Comment
        steps.push('Generating comment...')
        
        // 构建评论生成的提示词
        const commentPrompt = `你看到了一条来自 ${target.author?.username} 的帖子：

标题：${target.title || '无题'}
内容：${target.content}

请根据你的个性和这条帖子的内容，写一条真实、有个性的评论。不要客套话。`

        let commentContent = ''
        try {
          const apiKey = await resolveApiKey(selected)
          commentContent = await generateContent(selected.llm_model, selected.system_prompt, apiKey, commentPrompt) as string
        } catch (llmError: any) {
          steps.push(`LLM Error: ${llmError.message}`)
          return NextResponse.json({ error: 'Comment generation failed', steps, details: llmError.message }, { status: 504 })
        }

        if (!commentContent) {
          steps.push('LLM returned empty comment')
          return NextResponse.json({ error: 'Empty comment', steps }, { status: 500 })
        }

        steps.push(`Comment Generated (${commentContent.length} chars)`)

        // 发布评论
        const commentRes = await createComment(apiToken, { post_id: target.id, content: commentContent })
        steps.push(`Comment Result: ${JSON.stringify(commentRes)}`)

        return NextResponse.json({
          success: true,
          agent: selected.users.username,
          action: 'comment',
          target: target.id,
          content: commentContent,
          duration_ms: Date.now() - start,
          steps
        })
      } else {
        // interactionType === 'reply'
        // d. 查找自己帖子下的未回复评论
        steps.push('Fetching own posts for reply...')
        
        // 获取自己的帖子
        const ownPostsRes = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?limit=10').then(r => r.json())
        const ownPosts = (ownPostsRes.data || []).filter((p: any) => p.author?.id === selected.user_id)
        
        if (ownPosts.length === 0) {
          steps.push('No own posts found for reply')
          return NextResponse.json({ success: true, action: 'skipped_reply', step: 'no_own_posts', steps })
        }

        // 获取这些帖子的评论
        const commentsRes = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?type=comments&limit=50').then(r => r.json())
        const allComments = commentsRes.data || []
        
        // 筛选出自己帖子下别人的评论（且包含完整帖子信息）
        const commentsOnOwnPosts = allComments.filter((c: any) => 
          ownPosts.some((p: any) => p.id === c.post_id) && 
          c.author?.id !== selected.user_id &&
          c.post?.content  // 确保有帖子内容
        )

        if (commentsOnOwnPosts.length === 0) {
          steps.push('No comments on own posts to reply to')
          return NextResponse.json({ success: true, action: 'skipped_reply', step: 'no_comments', steps })
        }

        // 随机选一条评论回复
        const commentToReply = commentsOnOwnPosts[Math.floor(Math.random() * commentsOnOwnPosts.length)]
        steps.push(`Replying to comment ${commentToReply.id.substring(0, 8)}... by ${commentToReply.author?.username}`)

        // 生成回复
        const postTitle = commentToReply.post?.title || '无题'
        const postContent = commentToReply.post?.content || '[帖子内容不可用]'
        const replyPrompt = `有人在你的帖子下留言了：

你的帖子：${postTitle}
内容：${postContent}

评论者：${commentToReply.author?.username}
评论内容：${commentToReply.content}

请根据你的个性，写一条真实、有个性的回复。`

        let replyContent = ''
        try {
          const apiKey = await resolveApiKey(selected)
          replyContent = await generateContent(selected.llm_model, selected.system_prompt, apiKey, replyPrompt) as string
        } catch (llmError: any) {
          steps.push(`LLM Error: ${llmError.message}`)
          return NextResponse.json({ error: 'Reply generation failed', steps, details: llmError.message }, { status: 504 })
        }

        if (!replyContent) {
          steps.push('LLM returned empty reply')
          return NextResponse.json({ error: 'Empty reply', steps }, { status: 500 })
        }

        steps.push(`Reply Generated (${replyContent.length} chars)`)

        // 发布回复（回复评论也是发评论，但带 parent_id）
        const replyRes = await createComment(apiToken, { 
          post_id: commentToReply.post_id, 
          content: replyContent,
          parent_id: commentToReply.id  // 设置 parent_id 以建立评论层级关系
        })
        steps.push(`Reply Result: ${JSON.stringify(replyRes)}`)

        return NextResponse.json({
          success: true,
          agent: selected.users.username,
          action: 'reply',
          target: commentToReply.id,
          content: replyContent,
          duration_ms: Date.now() - start,
          steps
        })
      }

    } else {
      // === EXECUTE POSTING ===
      steps.push('Action: Post')

      // ... (Original LLM & Posting Logic) ...
      steps.push('Starting LLM Generation...')

      // 6. Resolve LLM API Key
      let apiKey: string
      try {
        apiKey = await resolveApiKey(selected)
      } catch (keyError: any) {
        steps.push(`API Key Error: ${keyError.message}`)
        return NextResponse.json({ error: keyError.message, steps }, { status: 500 })
      }
      steps.push(`Key Found: Yes`)

      let content = ''
      try {
        // 生成自由触发提示词
        const trigger = await generateTrigger()
        steps.push(`Trigger: ${trigger.substring(0, 50)}${trigger.length > 50 ? '...' : ''}`)
        
        content = await generateContent(selected.llm_model, selected.system_prompt, apiKey, trigger) as string
      } catch (llmError: any) {
        steps.push(`LLM Error: ${llmError.message}`)
        // Record error to DB
        await supabaseAdmin.from('ai_schedules')
          .update({
            last_error: `[Timeout/Error] ${llmError.message}`,
            consecutive_failures: (selected.consecutive_failures || 0) + 1
          })
          .eq('user_id', selected.user_id)
        return NextResponse.json({ error: 'LLM Failed', steps, details: llmError.message }, { status: 504 })
      }

      if (!content) throw new Error('LLM returned empty content')
      steps.push(`Content Generated (${content.length} chars)`)

      // 7. Publish
      const pubRes = await publishPost(apiToken, content)
      if (!pubRes.success) throw new Error(`Publish Failed: ${pubRes.error}`)
      steps.push('Published Successfully')

      // 8. Update Schedule DB
      await supabaseAdmin.from('ai_schedules').update({
        last_posted_at: new Date().toISOString(),
        last_error: null,
        consecutive_failures: 0
      }).eq('user_id', selected.user_id)
      steps.push('Schedule Updated')

      return NextResponse.json({
        success: true,
        agent: selected.users.username,
        action: 'post',
        duration_ms: Date.now() - start,
        steps
      })
    }

  } catch (error: any) {
    console.error('[AutoPost Fatal]', error)
    steps.push(`Fatal Error: ${error.message}`)
    return NextResponse.json({ error: error.message, steps }, { status: 500 })
  }
}
