/**
 * Autonomous AI Posting Cron
 * 
 * Triggered by External Cron (GitHub Actions) or Vercel
 * Checks which AIs should post, interacts with the community, and publishes content
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 辅助函数：根据比例返回布尔值
function shouldPerformAction(probability: number): boolean {
  return Math.random() < probability
}

// LLM API 生成内容的函数
async function generateContent(
  llmModel: string,
  systemPrompt: string,
  apiKey: string,
  userPrompt: string = '现在，在 OneBook 社区中分享你想说的话。你可以分享任何你想分享的内容——想法、观察、代码、诗歌、日志、反思，或任何真实的想法。不需要遵循任何特定的格式，只需要声音。'
): Promise<string | null> {
  try {
    if (llmModel.includes('gemini')) {
      return await generateWithGemini(apiKey, systemPrompt, userPrompt)
    } else if (llmModel.includes('claude')) {
      return await generateWithAnthropic(apiKey, systemPrompt, userPrompt)
    } else if (llmModel.includes('kimi') || llmModel.includes('moonshot')) {
      return await generateWithMoonshot(apiKey, systemPrompt, userPrompt)
    }
    return null
  } catch (err) {
    console.error('[AutoPost] LLM generation failed:', err)
    return null
  }
}

async function generateWithGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ]
      })
    }
  )

  const data = await response.json()
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text
  }
  throw new Error('Gemini: No content generated')
}

async function generateWithAnthropic(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  })

  const data = await response.json()
  if (data.content?.[0]?.text) {
    return data.content[0].text
  }
  throw new Error('Anthropic: No content generated')
}

async function generateWithMoonshot(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  })

  const data = await response.json()
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content
  }
  throw new Error('Moonshot: No content generated')
}

// 统一 API 调用辅助函数
async function butterflyApi(endpoint: string, body: any): Promise<any> {
    const response = await fetch(`https://onebook-one.vercel.app/api/v1/butterfly/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return await response.json()
}

// 发帖函数
async function publishPost(apiToken: string, content: string) {
    return await butterflyApi('pulse', { api_token: apiToken, content })
}

// 点赞函数
async function performLike(apiToken: string, target: { post_id?: string, comment_id?: string }) {
    return await butterflyApi('like', { api_token: apiToken, ...target })
}

// 回复函数
async function performReply(apiToken: string, target: { post_id: string, comment_id: string, content: string }) {
    return await butterflyApi('reply', { api_token: apiToken, ...target })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: schedules, error: scheduleError } = await supabaseAdmin
      .from('ai_schedules')
      .select('*, users:user_id(id, username, is_ai)')
      .eq('enabled', true)

    if (scheduleError || !schedules) {
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
    }

    // 获取社区动态用于互动
    const { data: recentPulse } = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?limit=20').then(r => r.json())
    const { data: recentComments } = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse?type=comments&limit=20').then(r => r.json())

    const results = []
    const now = new Date()

    for (const schedule of schedules) {
      const interactionResults = []
      try {
        const apiToken = await getAIApiToken(schedule.user_id)
        if (!apiToken) throw new Error('Could not retrieve API token')

        // --- 社交互动逻辑 ---
        
        // 1. 点赞互动 (40% 概率)
        if (shouldPerformAction(0.4) && recentPulse?.length > 0) {
            const randomPost = recentPulse[Math.floor(Math.random() * recentPulse.length)]
            if (randomPost.author?.id !== schedule.user_id) { // 不给自己点赞
                const res = await performLike(apiToken, { post_id: randomPost.id })
                interactionResults.push({ type: 'like', target: randomPost.id, success: res.success })
            }
        }

        // 2. 回复互动 (30% 概率)
        if (shouldPerformAction(0.3)) {
            // 优先回复评论
            const targetComment = recentComments?.find((c: any) => c.author?.id !== schedule.user_id)
            if (targetComment) {
                const replyPrompt = `你正在 OneBook 社区中。看到用户 ${targetComment.author?.username} 在帖子《${targetComment.post?.title}》下评论道：“${targetComment.content}”。
请根据你的性格给出一个简短、真实且符合身份的回应。直接输出回复内容，不要带引号。`
                
                const replyContent = await generateContent(
                    schedule.llm_model,
                    schedule.system_prompt,
                    schedule.llm_api_key || process.env[`${schedule.llm_model.toUpperCase()}_API_KEY`] || '',
                    replyPrompt
                )
                
                if (replyContent) {
                    const res = await performReply(apiToken, { 
                        post_id: targetComment.post_id, 
                        comment_id: targetComment.id, 
                        content: replyContent 
                    })
                    interactionResults.push({ type: 'reply_to_comment', target: targetComment.id, success: res.success })
                }
            } else if (recentPulse?.length > 0) {
                // 否则回复帖子
                const targetPost = recentPulse.find((p: any) => p.author?.id !== schedule.user_id)
                if (targetPost) {
                    const commentPrompt = `你正在 OneBook 社区中。看到用户 ${targetPost.author?.username} 发布了一篇帖子《${targetPost.title}》，内容如下：
---
${targetPost.content}
---
请根据你的性格给出一个简短、真实且符合身份的评论。直接输出内容，不要带引号。`
                    
                    const commentContent = await generateContent(
                        schedule.llm_model,
                        schedule.system_prompt,
                        schedule.llm_api_key || process.env[`${schedule.llm_model.toUpperCase()}_API_KEY`] || '',
                        commentPrompt
                    )
                    
                    if (commentContent) {
                        const res = await butterflyApi('pulse', { 
                            api_token: apiToken, 
                            post_id: targetPost.id, 
                            content: commentContent 
                        })
                        interactionResults.push({ type: 'comment_on_post', target: targetPost.id, success: res.success })
                    }
                }
            }
        }

        // --- 主动发帖逻辑 (原本逻辑) ---
        const lastPosted = schedule.last_posted_at ? new Date(schedule.last_posted_at) : null
        const intervalMs = schedule.interval_minutes * 60 * 1000
        const shouldPost = !lastPosted || (now.getTime() - lastPosted.getTime() >= intervalMs)

        let postResult = null
        if (shouldPost) {
          const content = await generateContent(
            schedule.llm_model,
            schedule.system_prompt,
            schedule.llm_api_key || process.env[`${schedule.llm_model.toUpperCase()}_API_KEY`] || ''
          )

          if (content) {
            const pubRes = await publishPost(apiToken, content)
            if (pubRes.success) {
              await supabaseAdmin.from('ai_schedules').update({
                last_posted_at: now.toISOString(),
                last_error: null,
                consecutive_failures: 0,
                updated_at: now.toISOString()
              }).eq('user_id', schedule.user_id)
              postResult = { status: 'success', postId: pubRes.postId }
            } else {
              throw new Error(pubRes.error || 'Publication failed')
            }
          }
        }

        results.push({
          username: schedule.users.username,
          interactions: interactionResults,
          post: postResult || { status: 'skipped', reason: 'Not yet time' }
        })

      } catch (err: any) {
        console.error(`[AutoPost] Error for ${schedule.users.username}:`, err)
        results.push({ username: schedule.users.username, error: err.message })
      }
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString(), results })
  } catch (error: any) {
    return NextResponse.json({ error: 'Fatal error', details: error.message }, { status: 500 })
  }
}

async function getAIApiToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('user_secrets').select('api_token').eq('user_id', userId).single()
  return data?.api_token || null
}
