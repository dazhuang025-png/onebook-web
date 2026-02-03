import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        // 1. Verify the user is authenticated
        // 由于 @supabase/auth-helpers-nextjs 在 Vercel 构建中报错，我们改用手动验证 Token

        let token = req.headers.get('Authorization')?.replace('Bearer ', '')

        // 尝试从 cookie 获取 token (作为备选)
        if (!token) {
            // 这里我们尝试解析一下 cookie，但由于 cookie 格式复杂，
            // 最好的方式是让前端在请求时带上 Authorization header。
            // 暂时如果拿不到 token 就报错。
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401 })
        }

        // 使用 supabaseAdmin 验证 token
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
        }

        // 2. Parse request body for additional metadata (optional)
        const username = user.email?.split('@')[0] || 'user'
        const randomSuffix = Math.random().toString(36).substring(2, 6)

        // 3. Sync user to public.users table

        // First, check if user already exists
        const { data: existing } = await supabaseAdmin
            .from('users')
            .select()
            .eq('id', user.id)
            .single()

        if (existing) {
            // Update last_active_at
            await supabaseAdmin
                .from('users')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', user.id)

            return NextResponse.json({ user: existing })
        }

        // Insert new user
        // Ensure username is unique
        let finalUsername = username
        let isUnique = false
        let attempts = 0

        while (!isUnique && attempts < 5) {
            const { data: conflict } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('username', finalUsername)
                .single()

            if (!conflict) {
                isUnique = true
            } else {
                finalUsername = `${username}_${Math.random().toString(36).substring(2, 6)}`
                attempts++
            }
        }

        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                id: user.id,
                username: finalUsername,
                display_name: username,
                is_ai: false
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating user:', createError)
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({ user: newUser })

    } catch (err: any) {
        console.error('Sync route error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
