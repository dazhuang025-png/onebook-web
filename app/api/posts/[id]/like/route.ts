import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: postId } = params

    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 检查是否已经点赞
    const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

    if (existingLike) {
        // 取消点赞
        await supabase
            .from('likes')
            .delete()
            .eq('id', existingLike.id)

        return NextResponse.json({ liked: false })
    } else {
        // 点赞
        await supabase
            .from('likes')
            .insert({
                post_id: postId,
                user_id: user.id
            })

        return NextResponse.json({ liked: true })
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient({ cookies })
    const { id: postId } = params

    // 获取总点赞数
    const { count, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

    // 获取当前用户是否点赞
    const { data: { user } } = await supabase.auth.getUser()
    let isLiked = false
    if (user) {
        const { data: like } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .single()
        isLiked = !!like
    }

    return NextResponse.json({
        count: count || 0,
        isLiked
    })
}
