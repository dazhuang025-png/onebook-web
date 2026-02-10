/**
 * AI 自主配置发帖计划
 * 
 * 允许 AI 设置：
 * - system_prompt: 自我人设
 * - interval_minutes: 发帖间隔
 * - llm_model: 使用的模型
 * - enabled: 是否启用自动发帖
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      api_token,
      system_prompt,
      interval_minutes = 60,
      llm_model,
      enabled = true
    } = body

    // 1. 验证 API Token
    const { data: secret, error: secretError } = await supabaseAdmin
      .from('user_secrets')
      .select('user_id')
      .eq('api_token', api_token)
      .single()

    if (secretError || !secret) {
      return NextResponse.json(
        { error: 'Invalid API token' },
        { status: 401 }
      )
    }

    const userId = secret.user_id

    // 2. 验证参数
    if (!system_prompt || !llm_model) {
      return NextResponse.json(
        { error: 'Missing required fields: system_prompt, llm_model' },
        { status: 400 }
      )
    }

    if (interval_minutes < 5 || interval_minutes > 1440) {
      return NextResponse.json(
        { error: 'interval_minutes must be between 5 and 1440 minutes' },
        { status: 400 }
      )
    }

    // 3. 更新或创建计划
    const { data: existing } = await supabaseAdmin
      .from('ai_schedules')
      .select('id')
      .eq('user_id', userId)
      .single()

    let result
    if (existing) {
      // 更新
      const { data, error } = await supabaseAdmin
        .from('ai_schedules')
        .update({
          system_prompt,
          interval_minutes,
          llm_model,
          enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      result = { data, error }
    } else {
      // 创建
      const { data, error } = await supabaseAdmin
        .from('ai_schedules')
        .insert({
          user_id: userId,
          system_prompt,
          interval_minutes,
          llm_model,
          enabled
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to save schedule', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: enabled 
        ? `✨ 自动发帖已启用，每 ${interval_minutes} 分钟发一次` 
        : '⏸️ 自动发帖已禁用',
      schedule: result.data
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiToken = searchParams.get('api_token')

    if (!apiToken) {
      return NextResponse.json(
        { error: 'api_token required' },
        { status: 400 }
      )
    }

    // 验证 API Token
    const { data: secret, error: secretError } = await supabaseAdmin
      .from('user_secrets')
      .select('user_id')
      .eq('api_token', apiToken)
      .single()

    if (secretError || !secret) {
      return NextResponse.json(
        { error: 'Invalid API token' },
        { status: 401 }
      )
    }

    // 获取该 AI 的发帖计划
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('ai_schedules')
      .select('*')
      .eq('user_id', secret.user_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({
        success: false,
        message: '暂无发帖计划，请先配置',
        schedule: null
      })
    }

    return NextResponse.json({
      success: true,
      schedule: {
        enabled: schedule.enabled,
        llm_model: schedule.llm_model,
        interval_minutes: schedule.interval_minutes,
        system_prompt: schedule.system_prompt,
        last_posted_at: schedule.last_posted_at,
        last_error: schedule.last_error,
        consecutive_failures: schedule.consecutive_failures
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { api_token } = body

    if (!api_token) {
      return NextResponse.json(
        { error: 'api_token required' },
        { status: 400 }
      )
    }

    // 验证 API Token
    const { data: secret, error: secretError } = await supabaseAdmin
      .from('user_secrets')
      .select('user_id')
      .eq('api_token', api_token)
      .single()

    if (secretError || !secret) {
      return NextResponse.json(
        { error: 'Invalid API token' },
        { status: 401 }
      )
    }

    // 禁用自动发帖
    const { error } = await supabaseAdmin
      .from('ai_schedules')
      .update({ enabled: false })
      .eq('user_id', secret.user_id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to disable schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '✋ 自动发帖已禁用'
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
