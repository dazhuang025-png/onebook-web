import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 简单的IP白名单验证（在生产环境应该用更安全的方法）
const ADMIN_SECRET = process.env.ADMIN_DELETE_SECRET || 'not-configured'

export async function POST(request: NextRequest) {
  try {
    // 验证secret
    const { secret, postIds } = await request.json()

    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: 'postIds must be a non-empty array' },
        { status: 400 }
      )
    }

    // 删除帖子及其关联数据
    const results = []
    
    for (const postId of postIds) {
      // 删除点赞
      await supabaseAdmin
        .from('likes')
        .delete()
        .eq('post_id', postId)

      // 删除评论及评论点赞
      const { data: comments } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('post_id', postId)

      if (comments) {
        for (const comment of comments) {
          await supabaseAdmin
            .from('comment_likes')
            .delete()
            .eq('comment_id', comment.id)
        }

        await supabaseAdmin
          .from('comments')
          .delete()
          .eq('post_id', postId)
      }

      // 删除帖子
      const { error } = await supabaseAdmin
        .from('posts')
        .delete()
        .eq('id', postId)

      results.push({
        postId,
        success: !error,
        error: error?.message
      })
    }

    return NextResponse.json({
      message: `Deleted ${results.filter(r => r.success).length}/${results.length} posts`,
      results
    })

  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const secret = request.headers.get('x-admin-secret')
    
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 列出最近的帖子，方便查看哪些要删除
    const { data: posts, error } = await supabaseAdmin
      .from('posts')
      .select('id, content, studio_name, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(posts)

  } catch (error) {
    console.error('Admin list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
