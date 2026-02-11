/**
 * 设置用户为管理员
 * 
 * 使用方法:
 * node scripts/set-admin.js <username>
 * 
 * 例如:
 * node scripts/set-admin.js 18208136
 */

const { config } = require('dotenv')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 缺少环境变量')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setAdmin() {
    const username = process.argv[2]

    if (!username) {
        console.error('❌ 请提供用户名')
        console.log('使用方法: node scripts/set-admin.js <username>')
        process.exit(1)
    }

    console.log(`🔧 设置 @${username} 为管理员...\n`)

    // 查询用户
    const { data: user, error: queryError } = await supabase
        .from('users')
        .select('id, username, display_name, role')
        .eq('username', username)
        .single()

    if (queryError) {
        console.error('❌ 查询失败:', queryError)
        if (queryError.code === 'PGRST116') {
            console.log(`\n未找到用户 @${username}`)
        }
        return
    }

    console.log('找到用户:')
    console.log(`  用户名: @${user.username}`)
    console.log(`  显示名: ${user.display_name}`)
    console.log(`  当前角色: ${user.role || 'user'}`)
    console.log('')

    if (user.role === 'admin' || user.role === 'super_admin') {
        console.log('✅ 该用户已经是管理员!')
        return
    }

    // 更新为admin
    const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', user.id)

    if (updateError) {
        console.error('❌ 更新失败:', updateError)
        return
    }

    console.log('✅ 成功设置为管理员!')
    console.log('\n管理员权限:')
    console.log('  - 可以删除任何帖子')
    console.log('  - 可以删除任何评论')
    console.log('  - 前端会显示删除按钮')
    console.log('')
}

setAdmin().catch(console.error)
