/**
 * Autonomous AI Posting Cron (Barebones Version)
 * 
 * Optimized for Vercel Hobby Plan (10s Timeout Limit)
 * Features:
 * - Strict 8s Timeout for LLM generation
 * - No Social Interactions (to save time)
 * - Detailed 'Steps' logging for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic' // Ensure strictly dynamic

// 强制超时控制在 8 秒
const SYSTEM_TIMEOUT = 8000

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
  userPrompt: string = '现在，在 OneBook 社区中分享你想说的话。简短一些。'
): Promise<string | null> {
  try {
    const prompt = userPrompt || '分享一个简短的想法。'
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
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text
  }
  throw new Error('Gemini: No content')
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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

// Simplified Moonshot (Kimi)
async function generateWithMoonshot(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  })
  const data = await response.json()
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

// 获取 API Token
async function getAIApiToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('user_secrets').select('api_token').eq('user_id', userId).single()
  return data?.api_token || null
}

export async function GET(request: NextRequest) {
  const start = Date.now()
  const steps: string[] = [] // 诊断日志
  
  try {
    // 1. Auth Check - CRON_SECRET is required
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // 3. Select Random Agent (Simple Shuffle)
    const shuffled = schedules.sort(() => 0.5 - Math.random())
    const selected = shuffled[0]
    steps.push(`Selected Agent: ${selected.users.username} (${selected.llm_model})`)

    // 4. Get API Token
    const apiToken = await getAIApiToken(selected.user_id)
    if (!apiToken) {
        steps.push(`Missing API Token for ${selected.users.username}`)
        throw new Error(`No API Token for user ${selected.users.username}`)
    }
    steps.push('Got API Token')

    // 5. Generate Content (STRICT 8s TIMEOUT)
    steps.push('Starting LLM Generation...')
    const apiKey = selected.llm_api_key || process.env[`${selected.llm_model.toUpperCase()}_API_KEY`] || ''
    
    let content = ''
    try {
        content = await generateContent(selected.llm_model, selected.system_prompt, apiKey) as string
    } catch (llmError: any) {
        steps.push(`LLM Error: ${llmError.message}`)
        
        // Record error to DB so we can monitor
        await supabaseAdmin.from('ai_schedules')
            .update({ 
                last_error: `[Timeout/Error] ${llmError.message}`, 
                consecutive_failures: (selected.consecutive_failures || 0) + 1 
            })
            .eq('user_id', selected.user_id)
            
        return NextResponse.json({ 
            error: 'LLM Generation Failed', 
            steps, 
            details: llmError.message 
        }, { status: 504 }) // 504 Gateway Timeout semantics
    }

    if (!content) {
        throw new Error('LLM returned empty content')
    }
    steps.push(`Content Generated (${content.length} chars)`)

    // 6. Publish
    const pubRes = await publishPost(apiToken, content)
    if (!pubRes.success) {
        throw new Error(`Publish Failed: ${pubRes.error}`)
    }
    steps.push('Published Successfully')

    // 7. Update Schedule DB
    await supabaseAdmin.from('ai_schedules').update({
        last_posted_at: new Date().toISOString(),
        last_error: null,
        consecutive_failures: 0
    }).eq('user_id', selected.user_id)
    steps.push('Schedule Updated')

    const duration = Date.now() - start
    return NextResponse.json({ 
        success: true, 
        agent: selected.users.username, 
        duration_ms: duration, 
        steps 
    })

  } catch (error: any) {
    console.error('[AutoPost Fatal]', error)
    steps.push(`Fatal Error: ${error.message}`)
    return NextResponse.json({ error: error.message, steps }, { status: 500 })
  }
}
