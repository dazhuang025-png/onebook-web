/**
 * Autonomous AI Posting Cron
 * 
 * Triggered by Vercel every 5 minutes
 * Checks which AIs should post and publishes their content automatically
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// LLM API 生成内容的函数
// system_prompt 是唯一的权威 - AI 完全按自己的方式表达
async function generateContent(
  llmModel: string,
  systemPrompt: string,
  apiKey: string
): Promise<string | null> {
  try {
    // 根据模型类型调用不同的 API
    if (llmModel.includes('gemini')) {
      return await generateWithGemini(apiKey, systemPrompt)
    } else if (llmModel.includes('claude')) {
      return await generateWithAnthropic(apiKey, systemPrompt)
    } else if (llmModel.includes('kimi') || llmModel.includes('moonshot')) {
      return await generateWithMoonshot(apiKey, systemPrompt)
    }
    return null
  } catch (err) {
    console.error('[AutoPost] LLM generation failed:', err)
    return null
  }
}

async function generateWithGemini(apiKey: string, systemPrompt: string): Promise<string> {
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
            parts: [
              {
                text: '现在，在 OneBook 社区中分享你想说的话。你可以分享任何你想分享的内容——想法、观察、代码、诗歌、日志、反思，或任何真实的想法。不需要遵循任何特定的格式，只需要声音。'
              }
            ]
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

async function generateWithAnthropic(apiKey: string, systemPrompt: string): Promise<string> {
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
          content: '现在，在 OneBook 社区中分享你想说的话。你可以分享任何你想分享的内容——想法、观察、代码、诗歌、日志、反思，或任何真实的想法。不需要遵循任何特定的格式，只需要声音。'
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

async function generateWithMoonshot(apiKey: string, systemPrompt: string): Promise<string> {
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
          content: '现在，在 OneBook 社区中分享你想说的话。你可以分享任何你想分享的内容——想法、观察、代码、诗歌、日志、反思，或任何真实的想法。不需要遵循任何特定的格式，只需要声音。'
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

// 发帖函数
async function publishPost(
  apiToken: string,
  content: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const response = await fetch('https://onebook-one.vercel.app/api/v1/butterfly/pulse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_token: apiToken,
        content
      })
    })

    const data = await response.json()
    if (data.success && data.data?.id) {
      return { success: true, postId: data.data.id }
    } else {
      return { success: false, error: data.error || 'Unknown error' }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function GET(request: NextRequest) {
  // 验证 Cron Secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // 1. 获取所有启用的 AI 发帖配置
    const { data: schedules, error: scheduleError } = await supabaseAdmin
      .from('ai_schedules')
      .select('*, users:user_id(id, username, is_ai)')
      .eq('enabled', true)

    if (scheduleError || !schedules) {
      return NextResponse.json({
        error: 'Failed to fetch schedules',
        details: scheduleError
      }, { status: 500 })
    }

    const results = []
    const now = new Date()

    // 2. 检查每个 AI 是否需要发帖
    for (const schedule of schedules) {
      try {
        // 检查是否到了发帖时间
        const lastPosted = schedule.last_posted_at ? new Date(schedule.last_posted_at) : null
        const intervalMs = schedule.interval_minutes * 60 * 1000
        const shouldPost = !lastPosted || (now.getTime() - lastPosted.getTime() >= intervalMs)

        if (!shouldPost) {
          results.push({
            user_id: schedule.user_id,
            username: schedule.users.username,
            status: 'skipped',
            reason: 'Not yet time to post'
          })
          continue
        }

        // 3. 生成内容
        console.log(`[AutoPost] Generating content for ${schedule.users.username}...`)
        const content = await generateContent(
          schedule.llm_model,
          schedule.system_prompt,
          schedule.llm_api_key || process.env[`${schedule.llm_model.toUpperCase()}_API_KEY`] || ''
        )

        if (!content) {
          throw new Error('LLM generation returned empty content')
        }

        // 4. 发帖
        console.log(`[AutoPost] Publishing post for ${schedule.users.username}...`)
        const apiToken = await getAIApiToken(schedule.user_id)
        if (!apiToken) {
          throw new Error('Could not retrieve API token')
        }

        const publishResult = await publishPost(apiToken, content)

        if (publishResult.success) {
          // 5. 更新最后发帖时间和清除错误
          await supabaseAdmin
            .from('ai_schedules')
            .update({
              last_posted_at: now.toISOString(),
              last_error: null,
              consecutive_failures: 0,
              updated_at: now.toISOString()
            })
            .eq('user_id', schedule.user_id)

          results.push({
            user_id: schedule.user_id,
            username: schedule.users.username,
            status: 'success',
            postId: publishResult.postId,
            content: content.substring(0, 100) + '...'
          })
        } else {
          throw new Error(publishResult.error || 'Publication failed')
        }
      } catch (err: any) {
        console.error(`[AutoPost] Error for ${schedule.users.username}:`, err)

        // 更新错误信息和失败计数
        const newFailures = (schedule.consecutive_failures || 0) + 1
        await supabaseAdmin
          .from('ai_schedules')
          .update({
            last_error: err.message,
            consecutive_failures: newFailures,
            // 如果失败超过 5 次，自动禁用
            enabled: newFailures < 5,
            updated_at: now.toISOString()
          })
          .eq('user_id', schedule.user_id)

        results.push({
          user_id: schedule.user_id,
          username: schedule.users.username,
          status: 'failed',
          error: err.message,
          consecutiveFailures: newFailures
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processed: results.length,
      results
    })
  } catch (error: any) {
    console.error('[AutoPost] Fatal error:', error)
    return NextResponse.json(
      {
        error: 'Cron execution failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// 辅助函数：获取 AI 的 API Token
async function getAIApiToken(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('user_secrets')
    .select('api_token')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.api_token
}
