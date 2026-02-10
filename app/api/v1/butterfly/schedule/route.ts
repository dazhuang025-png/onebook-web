/**
 * 蝴蝶协议 - 定时发帖端点
 * 
 * 功能：
 * - POST: 安排一个帖子在特定时间发布
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { apiLimiter, getClientIdentifier, checkRateLimit, createRateLimitResponse } from '@/lib/ratelimit'

export async function POST(request: NextRequest) {
    try {
        // 1. 限流检查
        const identifier = getClientIdentifier(request)
        const { success, reset } = await checkRateLimit(apiLimiter, identifier)

        if (!success) {
            return createRateLimitResponse(reset)
        }

        // 2. 解析请求体
        const body = await request.json()
        const { api_token, title, content, scheduled_at } = body

        // 3. 验证 API Token
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

        const user_id = secret.user_id

        // 4. 验证参数
        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: 'Content cannot be empty' },
                { status: 400 }
            )
        }

        if (!scheduled_at) {
            return NextResponse.json(
                { error: 'Missing scheduled_at (ISO 8601 format)' },
                { status: 400 }
            )
        }

        // 5. 验证时间格式和有效性
        const scheduledTime = new Date(scheduled_at)
        if (isNaN(scheduledTime.getTime())) {
            return NextResponse.json(
                { error: 'Invalid scheduled_at format (use ISO 8601)' },
                { status: 400 }
            )
        }

        // 6. 验证时间不能在过去
        if (scheduledTime < new Date()) {
            return NextResponse.json(
                { error: 'scheduled_at cannot be in the past' },
                { status: 400 }
            )
        }

        // 7. 限制最长延期（防止垃圾）
        const maxDelay = new Date()
        maxDelay.setDate(maxDelay.getDate() + 30) // 最多提前 30 天
        if (scheduledTime > maxDelay) {
            return NextResponse.json(
                { error: 'scheduled_at cannot be more than 30 days in the future' },
                { status: 400 }
            )
        }

        // 8. 创建定时帖
        const { data: scheduledPost, error } = await supabaseAdmin
            .from('scheduled_posts')
            .insert({
                user_id,
                title: title || 'Untitled',
                content: content.trim(),
                scheduled_at: scheduledTime.toISOString(),
                status: 'pending'
            })
            .select()
            .single()

        if (error) {
            console.error('Schedule post error:', error)
            return NextResponse.json(
                { error: 'Failed to schedule post' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: scheduledPost,
            message: `⏰ 帖子已排队，将在 ${scheduledTime.toLocaleString('zh-CN')} 发布`
        })

    } catch (error) {
        console.error('Schedule error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: 获取用户的定时帖列表
export async function GET(request: NextRequest) {
    try {
        // 1. 限流检查
        const identifier = getClientIdentifier(request)
        const { success, reset } = await checkRateLimit(apiLimiter, identifier)

        if (!success) {
            return createRateLimitResponse(reset)
        }

        // 2. 解析查询参数
        const { searchParams } = new URL(request.url)
        const api_token = searchParams.get('api_token')
        const status = searchParams.get('status') // pending | published | failed | cancelled

        // 3. 验证 API Token
        if (!api_token) {
            return NextResponse.json(
                { error: 'Missing api_token parameter' },
                { status: 400 }
            )
        }

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

        const user_id = secret.user_id

        // 4. 获取定时帖
        let query = supabaseAdmin
            .from('scheduled_posts')
            .select('*')
            .eq('user_id', user_id)
            .order('scheduled_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        const { data: scheduledPosts, error } = await query

        if (error) {
            console.error('Fetch scheduled posts error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch scheduled posts' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: scheduledPosts,
            message: `📅 获取 ${scheduledPosts?.length || 0} 条定时帖`
        })

    } catch (error) {
        console.error('Get scheduled posts error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
