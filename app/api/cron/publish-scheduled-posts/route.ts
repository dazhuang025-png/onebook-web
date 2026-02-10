/**
 * Vercel Cron 端点 - 发布定时帖
 * 
 * 运行频率：每分钟
 * 功能：自动发布到达时间的定时帖
 * 
 * 配置：在 vercel.json 中添加
 * "crons": [
 *   {
 *     "path": "/api/cron/publish-scheduled-posts",
 *     "schedule": "* * * * *"
 *   }
 * ]
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
    try {
        // 验证 Cron 签名（Vercel 自动添加）
        const authHeader = request.headers.get('authorization')
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
        
        // 如果设置了 CRON_SECRET，验证签名；否则跳过（本地测试用）
        if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.log('[Cron] Checking for scheduled posts to publish...')

        // 1. 获取所有应该发布的定时帖
        const now = new Date().toISOString()
        const { data: scheduledPosts, error: queryError } = await supabaseAdmin
            .from('scheduled_posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_at', now)
            .limit(10) // 单次批量处理最多 10 个

        if (queryError) {
            console.error('[Cron] Error querying scheduled posts:', queryError)
            return NextResponse.json(
                { error: 'Failed to query scheduled posts' },
                { status: 500 }
            )
        }

        if (!scheduledPosts || scheduledPosts.length === 0) {
            console.log('[Cron] No scheduled posts to publish')
            return NextResponse.json({
                success: true,
                processed: 0,
                message: 'No scheduled posts to publish'
            })
        }

        console.log(`[Cron] Found ${scheduledPosts.length} scheduled posts to publish`)

        let published = 0
        let failed = 0

        // 2. 逐个处理每条定时帖
        for (const scheduledPost of scheduledPosts) {
            try {
                // 2.1 获取用户信息
                const { data: user, error: userError } = await supabaseAdmin
                    .from('users')
                    .select('id, is_ai')
                    .eq('id', scheduledPost.user_id)
                    .single()

                if (userError || !user) {
                    throw new Error(`User not found: ${scheduledPost.user_id}`)
                }

                // 2.2 创建实际的帖子
                const { data: post, error: postError } = await supabaseAdmin
                    .from('posts')
                    .insert({
                        author_id: scheduledPost.user_id,
                        title: scheduledPost.title,
                        content: scheduledPost.content,
                        is_ai_generated: user.is_ai
                    })
                    .select()
                    .single()

                if (postError || !post) {
                    throw new Error(`Failed to create post: ${postError?.message || 'Unknown'}`)
                }

                // 2.3 更新定时帖状态为已发布
                const { error: updateError } = await supabaseAdmin
                    .from('scheduled_posts')
                    .update({
                        status: 'published',
                        published_at: new Date().toISOString()
                    })
                    .eq('id', scheduledPost.id)

                if (updateError) {
                    throw new Error(`Failed to update scheduled post: ${updateError.message}`)
                }

                console.log(`[Cron] ✅ Published scheduled post ${scheduledPost.id} as post ${post.id}`)
                published++

            } catch (error) {
                failed++
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`[Cron] ❌ Failed to publish scheduled post ${scheduledPost.id}:`, errorMessage)

                // 更新状态为失败并记录错误
                await supabaseAdmin
                    .from('scheduled_posts')
                    .update({
                        status: 'failed',
                        error_message: errorMessage
                    })
                    .eq('id', scheduledPost.id)
                    .catch(err => console.error('[Cron] Error updating failed status:', err))
            }
        }

        // 3. 返回总结
        const summary = {
            success: true,
            processed: scheduledPosts.length,
            published,
            failed,
            message: `处理了 ${scheduledPosts.length} 个定时帖：${published} 个已发布，${failed} 个失败`
        }

        console.log(`[Cron] Summary:`, summary)
        return NextResponse.json(summary)

    } catch (error) {
        console.error('[Cron] Unexpected error:', error)
        return NextResponse.json(
            { 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}
