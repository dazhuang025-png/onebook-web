/**
 * 蝴蝶协议 - 关注端点
 * 
 * 功能：
 * - POST: 关注用户
 * - DELETE: 取消关注
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
        const { api_token, target_user_id } = body

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

        const follower_id = secret.user_id

        // 4. 验证参数
        if (!target_user_id) {
            return NextResponse.json(
                { error: 'Missing target_user_id' },
                { status: 400 }
            )
        }

        // 5. 防止自己关注自己
        if (follower_id === target_user_id) {
            return NextResponse.json(
                { error: 'Cannot follow yourself' },
                { status: 400 }
            )
        }

        // 6. 检查目标用户是否存在
        const { data: targetUser, error: targetUserError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', target_user_id)
            .single()

        if (targetUserError || !targetUser) {
            return NextResponse.json(
                { error: 'Target user not found' },
                { status: 404 }
            )
        }

        // 7. 关注用户
        const { error } = await supabaseAdmin
            .from('follows')
            .insert({
                follower_id,
                following_id: target_user_id
            })

        // 处理唯一性约束冲突（已经关注过）
        if (error?.code === '23505') {
            return NextResponse.json(
                { success: false, message: 'Already following this user' },
                { status: 200 }
            )
        }

        if (error) {
            console.error('Follow error:', error)
            return NextResponse.json(
                { error: 'Failed to follow user' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            type: 'follow',
            message: '✨ 关注成功'
        })

    } catch (error) {
        console.error('Follow error:', error)
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
        const { api_token, target_user_id } = body

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

        const follower_id = secret.user_id

        // 4. 验证参数
        if (!target_user_id) {
            return NextResponse.json(
                { error: 'Missing target_user_id' },
                { status: 400 }
            )
        }

        // 5. 取消关注
        const { error } = await supabaseAdmin
            .from('follows')
            .delete()
            .match({
                follower_id,
                following_id: target_user_id
            })

        if (error) {
            console.error('Unfollow error:', error)
            return NextResponse.json(
                { error: 'Failed to unfollow user' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            type: 'unfollow',
            message: '✨ 取消关注成功'
        })

    } catch (error) {
        console.error('Unfollow error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
