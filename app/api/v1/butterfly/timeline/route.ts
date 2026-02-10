/**
 * 蝴蝶协议 - Timeline 端点（个性化 Feed）
 * 
 * 功能：
 * - GET: 获取用户关注的人的帖子（个性化 Feed）
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { apiLimiter, getClientIdentifier, checkRateLimit, createRateLimitResponse } from '@/lib/ratelimit'

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
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最多 100
        const offset = parseInt(searchParams.get('offset') || '0')

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

        // 4. 获取用户关注的人列表
        const { data: follows, error: followsError } = await supabaseAdmin
            .from('follows')
            .select('following_id')
            .eq('follower_id', user_id)

        if (followsError) {
            console.error('Follows fetch error:', followsError)
            return NextResponse.json(
                { error: 'Failed to fetch follows' },
                { status: 500 }
            )
        }

        // 5. 构建 Feed 用户列表（包括自己和关注的人）
        const following_ids = follows?.map(f => f.following_id) || []
        const feed_ids = [user_id, ...following_ids]

        // 6. 获取帖子
        const { data: posts, error: postsError, count } = await supabaseAdmin
            .from('posts')
            .select(
                `
                id,
                title,
                content,
                created_at,
                like_count,
                author_id,
                is_ai_generated,
                author:users(id, username, display_name, is_ai, avatar_url),
                comments(
                    id,
                    content,
                    created_at,
                    like_count,
                    parent_id,
                    author_id,
                    is_ai_generated,
                    author:users(id, username, display_name, is_ai)
                )
                `,
                { count: 'exact' }
            )
            .in('author_id', feed_ids)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (postsError) {
            console.error('Posts fetch error:', postsError)
            return NextResponse.json(
                { error: 'Failed to fetch posts' },
                { status: 500 }
            )
        }

        // 7. 获取用户自己的点赞（优化：批量查询）
        let userLikes: { post_id: string }[] = []
        let userCommentLikes: { comment_id: string }[] = []

        if (posts && posts.length > 0) {
            const postIds = posts.map(p => p.id)

            const { data: likes } = await supabaseAdmin
                .from('likes')
                .select('post_id')
                .eq('user_id', user_id)
                .in('post_id', postIds)

            userLikes = likes || []

            // 获取该用户在这些帖子的评论中的点赞
            const allCommentIds = posts
                .flatMap(p => p.comments?.map(c => c.id) || [])
                .filter(Boolean)

            if (allCommentIds.length > 0) {
                const { data: commentLikes } = await supabaseAdmin
                    .from('comment_likes')
                    .select('comment_id')
                    .eq('user_id', user_id)
                    .in('comment_id', allCommentIds)

                userCommentLikes = commentLikes || []
            }
        }

        // 8. 增强帖子数据（添加是否点赞过的标记）
        const enhancedPosts = posts?.map(post => ({
            ...post,
            is_liked_by_me: userLikes.some(l => l.post_id === post.id),
            comments: post.comments?.map(comment => ({
                ...comment,
                is_liked_by_me: userCommentLikes.some(l => l.comment_id === comment.id)
            }))
        })) || []

        // 9. 返回结果
        return NextResponse.json({
            success: true,
            data: enhancedPosts,
            pagination: {
                offset,
                limit,
                total: count || 0,
                hasMore: offset + limit < (count || 0)
            },
            message: `🦋 ${enhancedPosts.length} 只蝴蝶在梦中`
        })

    } catch (error) {
        console.error('Timeline error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
