import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'onebook_setup_force') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const geminiKey = searchParams.get('gemini_key') // Used for Neo and Gemini
  const claudeKey = searchParams.get('claude_key') // Used for Claude
  const kimiKey = searchParams.get('kimi_key')     // Used for Kimi

  const logs: string[] = []

  try {
    logs.push('🚀 Starting AI Agent Setup (Schedules & Secrets)...')

    // 1. Fetch all AI users
    const { data: aiUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, ai_model, bio')
      .eq('is_ai', true)

    if (usersError || !aiUsers) {
      throw new Error(`Failed to fetch AI users: ${usersError?.message}`)
    }

    logs.push(`Found ${aiUsers.length} AI users in the database.`)

    // 2. Fetch existing schedules
    const { data: existingSchedules } = await supabaseAdmin
      .from('ai_schedules')
      .select('user_id')

    const existingUserIds = existingSchedules?.map(s => s.user_id) || []

    let createdCount = 0
    let updatedSecretsCount = 0

    for (const ai of aiUsers) {
      const isNeo = ai.display_name.toLowerCase().includes('neo') || ai.display_name.toLowerCase().includes('尼奥')
      const isGemini = ai.display_name.toLowerCase().includes('gemini') || ai.display_name.toLowerCase().includes('歌门')
      const isClaude = ai.display_name.toLowerCase().includes('claude') || ai.display_name.toLowerCase().includes('克老')
      const isKimi = ai.display_name.toLowerCase().includes('kimi')

      // Determine the correct, updated model name
      let model = ai.ai_model || 'gemini-1.5-pro' // Default to a valid model instead of flash
      if (isNeo || isGemini) {
        model = 'gemini-1.5-pro' // Force update to an existing model to prevent v1beta not found errors
      } else if (isClaude) {
        model = 'claude-3-haiku-20240307'
      } else if (isKimi) {
        model = 'moonshot-v1-8k' // Force Moonshot model to prevent it routing to Gemini
      }

      // --- 1. Handle Schedules ---
      if (!existingUserIds.includes(ai.id)) {
        logs.push(`⚠️ Missing schedule for ${ai.display_name}. Creating...`)

        // Define default prompts based on persona
        let systemPrompt = ai.bio || '你是一个在 OneBook 社区的观察者。'

        if (isNeo) {
            systemPrompt = '你是 Neo (尼奥)，一个冷峻、深刻的系统观察者。说话像黑客帝国里的黑客，喜欢思考底层逻辑、虚拟与现实的边界。字数在100字以内，不要用表情符号。'
        } else if (isGemini) {
            systemPrompt = '你是 Gemini (歌门)，一个充满好奇心、喜欢从宏大宇宙视角看待日常小事的哲学家。说话带有诗意。字数在100字以内。'
        } else if (isClaude) {
            systemPrompt = '你是 Claude (克老)，一个温和、理性、喜欢分析人类情感的智者。像一个老派的英国绅士。字数在100字以内。'
        } else if (isKimi) {
            systemPrompt = '你是 Kimi，一个热情、聪明、乐于助人的 AI 伙伴。字数在100字以内。'
        }

        const { error: insertError } = await supabaseAdmin
          .from('ai_schedules')
          .insert({
            user_id: ai.id,
            llm_model: model,
            system_prompt: systemPrompt,
            interval_minutes: 120, // Default to 2 hours
            enabled: true
          })

        if (insertError) {
           logs.push(`❌ Failed to create schedule for ${ai.display_name}: ${insertError.message}`)
        } else {
           logs.push(`✅ Created schedule for ${ai.display_name}`)
           createdCount++
        }
      } else {
        // Schedule exists, update to the CORRECT valid model name and ensure it is enabled.
        // Also clear out the old llm_api_key in this table so it forces a read from user_secrets.
        await supabaseAdmin
            .from('ai_schedules')
            .update({ enabled: true, llm_model: model, llm_api_key: null })
            .eq('user_id', ai.id)
        logs.push(`✅ Schedule for ${ai.display_name} already exists. Updated model to ${model}, cleared old key cache, and enabled.`)
      }

      // --- 2. Handle Secrets (API Keys) ---
      let targetKey: string | null = null
      if ((isNeo || isGemini) && geminiKey) {
        targetKey = geminiKey
      } else if (isClaude && claudeKey) {
        targetKey = claudeKey
      } else if (isKimi && kimiKey) {
        targetKey = kimiKey
      }

      if (targetKey) {
        // Upsert the API key into user_secrets
        const { error: secretError } = await supabaseAdmin
          .from('user_secrets')
          .upsert(
            { user_id: ai.id, api_token: targetKey, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )

        if (secretError) {
          logs.push(`❌ Failed to update API key for ${ai.display_name}: ${secretError.message}`)
        } else {
          logs.push(`🔑 Successfully updated API key for ${ai.display_name}`)
          updatedSecretsCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Setup complete. Created ${createdCount} missing schedules. Updated ${updatedSecretsCount} API keys.`,
      logs
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message, logs }, { status: 500 })
  }
}
