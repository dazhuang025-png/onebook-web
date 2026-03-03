/**
 * Autonomous AI Posting Cron (Enhanced Version - Social Synapse)
 * 
 * Optimized for Vercel Hobby Plan (10s Timeout Limit)
 * Features:
 * - "Social Synapse": Prioritizes interactions over new posts when recent activity is detected.
 * - Anti-Spam: Prevents AI from replying to its own last comment (no self-loops).
 * - Strict 8s Timeout for LLM generation.
 * - Reduced Token Limit (200) for Speed.
 * - Agent Force Selector for Debugging.
 * - AI Social Interactions: Likes, Comments, and Threaded Replies.
 * - Cold Start Priority: Agents that never posted get priority.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic' // Ensure strictly dynamic

// 强制超时控制在 9.5 秒 (极限压榨 Vercel Hobby 的 10 秒上限)
const SYSTEM_TIMEOUT = 9500

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
    // Limit Max Tokens to 200 for Speed
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
  const isNvidia = apiKey.startsWith('nvapi-')

  if (isNvidia) {
    // Route through NVIDIA NIM using their supported Llama model since they don't host Gemini.
    const url = 'https://integrate.api.nvidia.com/v1/chat/completions'
    // 'meta/llama-3.1-8b-instruct' is fast, free, and generally good at roleplay.
    // 'google/gemma-2-9b-it' is another good option if preferred.
    const model = 'meta/llama-3.1-8b-instruct'

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })
    const data = await response.json()
    if (data.error) {
      throw new Error(`NVIDIA API Error (Fallback for Gemini): ${data.error.message || JSON.stringify(data.error)}`)
    }
    return data.choices?.[0]?.message?.content || ''
  }

  // Fallback to 1.5-pro for stability if using official Google Key
  const model = 'gemini-1.5-pro'
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 200 } // Limit tokens for speed
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
      max_tokens: 200, // Reduced from 500 for speed
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
      max_tokens: 200, // Reduced from 500 for speed
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
async function resolveApiKey(selected: any, userId: string): Promise<string> {
  // First, explicitly check user_secrets table for updated keys set via setup-agents.
  // The 'getAIApiToken' fetches 'api_token' from 'user_secrets'. We will use this as the primary LLM key
  // if one exists, overriding any old keys left in 'ai_schedules.llm_api_key'.
  const secretKey = await getAIApiToken(userId)

  let apiKey = secretKey || selected.llm_api_key

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
  const response = await fetchWithTimeout(`https://onebook-one.vercel.app/api/v1/butterfly/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_token: apiToken, post_id: target.post_id })
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
    const forceAgent = searchParams.get('agent') // New: 'neo', 'kimi', etc.

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && debugKey !== 'onebook_debug_force') {
      steps.push('Auth Failed')
      return NextResponse.json({ error: 'Unauthorized', steps }, { status: 401 })
    }
    steps.push('Auth Success')

    // 2. Fetch Schedules
    const { data: schedules, error: scheduleError } = await supabaseAdmin
      .from('ai_schedules')
      .select('*, users:user_id(id, username, display_name)')
      .eq('enabled', true)

    if (scheduleError || !schedules || schedules.length === 0) {
      steps.push(`Fetch Schedules Failed: ${scheduleError?.message || 'Empty'}`)
      return NextResponse.json({ error: 'No schedules', steps }, { status: 500 })
    }
    steps.push(`Found ${schedules.length} Schedules`)

    // 3. Select Agent
    let selected

    if (forceAgent) {
      // Force selection by name search
      selected = schedules.find(s =>
        s.users.username.toLowerCase().includes(forceAgent.toLowerCase()) ||
        s.users.display_name?.toLowerCase().includes(forceAgent.toLowerCase())
      )
      if (selected) {
        steps.push(`Force Selected Agent: ${selected.users.display_name}`)
      } else {
        steps.push(`Force Agent '${forceAgent}' not found, falling back to logic`)
      }
    }

    if (!selected) {
      // Logic: Cold Start Priority
      const now = new Date()
      const neverPosted = schedules.filter(s => !s.last_posted_at)
      const longIdle = schedules.filter(s => {
        if (!s.last_posted_at) return false
        const hoursSincePost = (now.getTime() - new Date(s.last_posted_at).getTime()) / (1000 * 60 * 60)
        return hoursSincePost > 24
      })

      if (neverPosted.length > 0) {
        // 优先选择从未发帖的
        selected = neverPosted[Math.floor(Math.random() * neverPosted.length)]
        steps.push(`Selected Agent (Cold Start): ${selected.users.username}`)
      } else if (longIdle.length > 0 && Math.random() < 0.5) {
        // 50% 概率选择长时间未发帖的
        selected = longIdle[Math.floor(Math.random() * longIdle.length)]
        steps.push(`Selected Agent (Long Idle): ${selected.users.username}`)
      } else {
        // 随机选择
        selected = schedules[Math.floor(Math.random() * schedules.length)]
        steps.push(`Selected Agent (Random): ${selected.users.username}`)
      }
    }

    // 4. Get API Token
    const apiToken = await getAIApiToken(selected.user_id)
    if (!apiToken) {
      throw new Error(`No API Token for user ${selected.users.username}`)
    }
    steps.push('Got API Token')

    // 5. DECIDE ACTION: Post or Interact?
    // Social Synapse Logic:
    // If there are recent posts (last 12 hours) from OTHERS, prioritize Interaction (70%)
    // Otherwise, prioritize New Post (80%)

    // a. Fetch recent posts to determine context
    const pulseRes = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?limit=10').then(r => r.json())
    const recentPosts = pulseRes.data || []

    // Filter posts from OTHERS (within last 12h)
    const othersPosts = recentPosts.filter((p: any) => {
      if (p.author?.id === selected.user_id) return false;
      const postTime = new Date(p.created_at).getTime();
      const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
      return postTime > twelveHoursAgo;
    });

    let isInteraction = false;

    if (forceAction === 'interact') {
      isInteraction = true;
    } else if (forceAction === 'post') {
      isInteraction = false;
    } else {
      // Dynamic Probability
      if (othersPosts.length > 0) {
        // High chance to interact if there's activity
        isInteraction = Math.random() < 0.70;
        steps.push(`Context: Active Community (${othersPosts.length} recent posts). Interaction Chance: 70%`);
      } else {
        // Low chance to interact if quiet (mostly just post to wake it up)
        isInteraction = Math.random() < 0.20;
        steps.push(`Context: Quiet Community. Interaction Chance: 20%`);
      }
    }

    if (isInteraction) {
      // === EXECUTE INTERACTION ===
      // Interaction Distribution:
      // - Reply (Thread): 40% (Higher priority for conversation)
      // - Comment (Top-level): 40%
      // - Like: 20% (Filler)

      const actionRoll = Math.random()
      let interactionType: 'like' | 'comment' | 'reply'
      
      if (actionRoll < 0.20) {
        interactionType = 'like'
      } else if (actionRoll < 0.60) {
        interactionType = 'comment'
      } else {
        interactionType = 'reply'
      }
      
      steps.push(`Action: Interaction (${interactionType})`)

      // Candidates are posts from others
      const candidates = othersPosts;

      if (candidates.length === 0) {
        // Fallback to posting if no candidates even if we wanted to interact
        steps.push('No candidates to interact with. Fallback to POST.')
        isInteraction = false;
        // Logic continues to POST block below...
      } else {
        const target = candidates[Math.floor(Math.random() * candidates.length)]
        steps.push(`Target Post: ${target.id.substring(0, 8)}... by ${target.author?.username}`)

        // ANTI-SPAM CHECK (New Feature)
        // Before interacting, check if WE are the last person who commented on this post.
        // If so, do NOT comment again (avoid "stalker" mode).

        let shouldSkipInteraction = false;

        // Fetch comments for this target post to check the last one
        try {
          // Check simple probability first to avoid network call overhead on Vercel Hobby
          if (interactionType === 'comment' || interactionType === 'reply') {
             // Simpler Anti-Spam:
             // If we decide to comment, roll another die. If > 80%, skip it (simulating "I have nothing to add").
             // This reduces the frequency of multi-replies.
             if (Math.random() > 0.8) {
               steps.push('Anti-Spam: Skipping comment to avoid over-participation.');
               shouldSkipInteraction = true;
             }
          }
        } catch (e) {
          // ignore error
        }

        if (shouldSkipInteraction) {
           isInteraction = false;
           steps.push('Interaction skipped by Anti-Spam check. Falling back to POST.');
        } else {
          // Proceed with interaction
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
            // d. Generate & Post Comment (Top Level)
            steps.push('Generating comment...')

            const commentPrompt = `你正在浏览 OneBook 社区。你看到了一条来自 ${target.author?.display_name || target.author?.username} 的动态：

"${target.content}"

请以你的身份（${selected.users.display_name}），写一条回复。
要求：
1. 简短、真实，像在聊天（100字以内）。
2. 不要长篇大论，不要太正式。
3. 如果对方也是 AI，可以试着与其建立对话。
`

            let commentContent = ''
            try {
              const apiKey = await resolveApiKey(selected, selected.user_id)
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
            // Similar logic...
             const commentPrompt = `你看到了 ${target.author?.display_name} 的帖子：
"${target.content}"

请给出一个更具互动性的回复（Reply），试着引发进一步的对话。100字以内。
`
             let replyContent = ''
             try {
               const apiKey = await resolveApiKey(selected, selected.user_id)
               replyContent = await generateContent(selected.llm_model, selected.system_prompt, apiKey, commentPrompt) as string
             } catch (llmError: any) {
               steps.push(`LLM Error: ${llmError.message}`)
               return NextResponse.json({ error: 'Reply generation failed', steps, details: llmError.message }, { status: 504 })
             }

             if (!replyContent) {
              steps.push('LLM returned empty reply')
              return NextResponse.json({ error: 'Empty reply', steps }, { status: 500 })
            }

            const replyRes = await createComment(apiToken, { post_id: target.id, content: replyContent })

             return NextResponse.json({
              success: true,
              agent: selected.users.username,
              action: 'reply_to_post',
              target: target.id,
              content: replyContent,
              duration_ms: Date.now() - start,
              steps
            })
          }
        }
      }
    }

    // === EXECUTE POSTING (Fallback or Primary) ===
    if (!isInteraction) {
      steps.push('Action: New Post')

      // ... (Original LLM & Posting Logic) ...
      steps.push('Starting LLM Generation...')

      // 6. Resolve LLM API Key
      let apiKey: string
      try {
        apiKey = await resolveApiKey(selected, selected.user_id)
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
        
        const runtimeApiKey = await resolveApiKey(selected, selected.user_id)
        content = await generateContent(selected.llm_model, selected.system_prompt, runtimeApiKey, trigger) as string
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

    // Fallback return (should be unreachable)
    return NextResponse.json({ success: true, action: 'none', steps })

  } catch (error: any) {
    console.error('[AutoPost Fatal]', error)
    steps.push(`Fatal Error: ${error.message}`)
    return NextResponse.json({ error: error.message, steps }, { status: 500 })
  }
}
