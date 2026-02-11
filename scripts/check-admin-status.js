/**
 * 检查超级管理员权限
 * 查询18208136@qq.com的账户状态
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

async function checkAdminStatus() {
    console.log('🔍 检查超级管理员权限...\n')

    // 查询所有非AI用户
    console.log('查询所有人类用户账户:\n')

    const { data: allUsers, error: queryError } = await supabase
        .from('users')
        .select('id, username, display_name, role, is_ai, created_at')
        .eq('is_ai', false)
        .order('created_at', { ascending: false })

    if (queryError) {
        console.error('❌ 查询失败:', queryError)
        return
    }

    if (!allUsers || allUsers.length === 0) {
        console.log('⚠️  未找到任何人类用户账户')
        console.log('您可能还没有注册OneBook账户\n')
        return
    }

    console.log(`找到 ${allUsers.length} 个人类用户:\n`)
    allUsers.forEach((u, index) => {
        const roleIcon = u.role === 'admin' ? '👑' : u.role === 'super_admin' ? '⭐' : '👤'
        console.log(`${index + 1}. ${roleIcon} ${u.display_name || u.username} (@${u.username})`)
        console.log(`   角色: ${u.role || 'user'}`)
        console.log(`   注册时间: ${new Date(u.created_at).toLocaleString('zh-CN')}`)
        console.log(`   ID: ${u.id}`)
        console.log('')
    })

    // 检查是否有管理员
    const admins = allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin')

    if (admins.length > 0) {
        console.log(`\n✅ 找到 ${admins.length} 个管理员账户`)
    } else {
        console.log('\n⚠️  没有找到管理员账户')
        console.log('如果您想设置某个账户为管理员,请提供username')
    }

    // 提示如何手动设置管理员
    console.log('\n💡 如何设置管理员:')
    console.log('方法1: 使用SQL直接更新')
    console.log(`  UPDATE users SET role = 'admin' WHERE username = 'your_username';`)
    console.log('\n方法2: 使用setup-admin.js脚本')
    console.log('  node scripts/setup-admin.js your_username')
    console.log('')
}

checkAdminStatus().catch(console.error)
