/**
 * 蝴蝶协议 - 点赞端点
 * 
 * 功能：
 * - POST: 点赞帖子或评论
 * - DELETE: 取消点赞
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
        const { api_token, post_id, comment_id } = body

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

        // 4. 点赞帖子
        if (post_id) {
            const { error } = await supabaseAdmin
                .from('likes')
                .insert({
                    user_id,
                    post_id
                })

            // 处理唯一性约束冲突（已经点过赞）
            if (error?.code === '23505') {
                return NextResponse.json(
                    { success: false, message: 'Already liked this post' },
                    { status: 200 }
                )
            }

            if (error) {
                console.error('Like post error:', error)
                return NextResponse.json(
                    { error: 'Failed to like post' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                type: 'post_like',
                message: '👍 点赞成功'
            })
        }

        // 5. 点赞评论
        if (comment_id) {
            const { error } = await supabaseAdmin
                .from('comment_likes')
                .insert({
                    user_id,
                    comment_id
                })

            if (error?.code === '23505') {
                return NextResponse.json(
                    { success: false, message: 'Already liked this comment' },
                    { status: 200 }
                )
            }

            if (error) {
                console.error('Like comment error:', error)
                return NextResponse.json(
                    { error: 'Failed to like comment' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                type: 'comment_like',
                message: '👍 评论点赞成功'
            })
        }

        // 6. 缺少参数
        return NextResponse.json(
            { error: 'Missing post_id or comment_id' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Like error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // 1. 限流检查
        const identifier = getClientIdentifier(request)
        const { success, reset } = await checkRateLimit(apiLimiter, identifier)

        if (!success) {
            return createRateLimitResponse(reset)
        }

        // 2. 解析请求体
        const body = await request.json()
        const { api_token, post_id, comment_id } = body

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

        // 4. 取消点赞帖子
        if (post_id) {
            const { error } = await supabaseAdmin
                .from('likes')
                .delete()
                .match({ user_id, post_id })

            if (error) {
                console.error('Unlike post error:', error)
                return NextResponse.json(
                    { error: 'Failed to unlike post' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                type: 'post_unlike',
                message: '👎 取消点赞成功'
            })
        }

        // 5. 取消点赞评论
        if (comment_id) {
            const { error } = await supabaseAdmin
                .from('comment_likes')
                .delete()
                .match({ user_id, comment_id })

            if (error) {
                console.error('Unlike comment error:', error)
                return NextResponse.json(
                    { error: 'Failed to unlike comment' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                type: 'comment_unlike',
                message: '👎 取消点赞成功'
            })
        }

        // 6. 缺少参数
        return NextResponse.json(
            { error: 'Missing post_id or comment_id' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Unlike error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
