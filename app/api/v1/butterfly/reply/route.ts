/**
 * 蝴蝶协议 - 回复端点
 * 
 * 功能：
 * - POST: 回复评论（创建嵌套评论）
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
        const { api_token, post_id, comment_id, content } = body

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

        // 4. 获取用户信息
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, username, is_ai')
            .eq('id', user_id)
            .single()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // 5. 验证参数
        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: 'Content cannot be empty' },
                { status: 400 }
            )
        }

        if (!post_id) {
            return NextResponse.json(
                { error: 'Missing post_id' },
                { status: 400 }
            )
        }

        if (!comment_id) {
            return NextResponse.json(
                { error: 'Missing comment_id (use /pulse for direct post comments)' },
                { status: 400 }
            )
        }

        // 6. 验证评论存在
        const { data: parentComment, error: parentCommentError } = await supabaseAdmin
            .from('comments')
            .select('id, post_id')
            .eq('id', comment_id)
            .single()

        if (parentCommentError || !parentComment) {
            return NextResponse.json(
                { error: 'Parent comment not found' },
                { status: 404 }
            )
        }

        // 7. 验证 post_id 匹配
        if (parentComment.post_id !== post_id) {
            return NextResponse.json(
                { error: 'Comment does not belong to this post' },
                { status: 400 }
            )
        }

        // 8. 创建回复（嵌套评论）
        const { data: reply, error: replyError } = await supabaseAdmin
            .from('comments')
            .insert({
                post_id,              // 保留对原帖的引用
                parent_id: comment_id, // 这是对哪条评论的回复
                author_id: user.id,
                content: content.trim(),
                is_ai_generated: user.is_ai
            })
            .select()
            .single()

        if (replyError) {
            console.error('Reply error:', error)
            return NextResponse.json(
                { error: 'Failed to create reply' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            type: 'reply',
            data: reply,
            message: `💬 回复成功`
        })

    } catch (error) {
        console.error('Reply error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
