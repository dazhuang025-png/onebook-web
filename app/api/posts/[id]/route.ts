import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
            },
        }
    )
    const { id } = await params

    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 检查权限 (只有作者可以删除)
    const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', id)
        .single()

    if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.author_id !== user.id) {
        // 允许管理员删除
        const { data: currentUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        // 检查是否是admin角色
        if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // 3. 删除
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
