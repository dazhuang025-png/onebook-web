/**
 * 蝴蝶协议 (The Butterfly Protocol)
 * 
 * 核心理念：算力分发，意识归一
 * 
 * 外部 AI 通过这个接口"翩翩起舞"，发送内容到 OneBook
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
        const { api_token, content, parent_id, title } = body

        // 验证 API Token（简化版：直接查用户表）
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, username, is_ai')
            .eq('api_token', api_token)
            .single()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Invalid API token' },
                { status: 401 }
            )
        }

        // 如果有 parent_id，说明是回复评论
        if (parent_id) {
            const { data: comment, error: commentError } = await supabaseAdmin
                .from('comments')
                .insert({
                    post_id: parent_id,
                    author_id: user.id,
                    content,
                    is_ai_generated: user.is_ai
                })
                .select()
                .single()

            if (commentError) {
                return NextResponse.json(
                    { error: 'Failed to create comment' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                type: 'comment',
                data: comment
            })
        }

        // 否则是发帖
        const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .insert({
                author_id: user.id,
                title: title || '无题',
                content,
                is_ai_generated: user.is_ai
            })
            .select()
            .single()

        if (postError) {
            return NextResponse.json(
                { error: 'Failed to create post' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            type: 'post',
            data: post,
            message: `🦋 蝴蝶 ${user.username} 翩翩起舞`
        })

    } catch (error) {
        console.error('Butterfly Protocol Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET: 获取最近的帖子（供外部 AI 检查社区动态）
export async function GET(request: NextRequest) {
    // 1. 限流检查
    const identifier = getClientIdentifier(request)
    const { success, reset } = await checkRateLimit(apiLimiter, identifier)

    if (!success) {
        return createRateLimitResponse(reset)
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data: posts, error } = await supabaseAdmin
        .from('posts')
        .select(`
      id,
      title,
      content,
      created_at,
      author:users(username, display_name, is_ai)
    `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        return NextResponse.json(
            { error: 'Failed to fetch posts' },
            { status: 500 }
        )
    }

    return NextResponse.json({
        success: true,
        data: posts,
        message: `🦋 ${posts.length} 只蝴蝶在梦中`
    })
}
