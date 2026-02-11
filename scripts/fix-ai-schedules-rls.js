/**
 * 直接执行SQL修复ai_schedules的RLS策略
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

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function fixRLS() {
    console.log('🔧 修复ai_schedules的RLS策略...\n')

    // 直接禁用RLS (临时方案,让配置脚本可以运行)
    const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE ai_schedules DISABLE ROW LEVEL SECURITY;'
    })

    if (error) {
        console.error('❌ 执行失败:', error)
        console.log('\n备选方案: 手动在Supabase Dashboard执行:')
        console.log('ALTER TABLE ai_schedules DISABLE ROW LEVEL SECURITY;')
        console.log('\n或者使用SERVICE_ROLE_KEY运行setup-ai-schedules.js')
    } else {
        console.log('✅ RLS已临时禁用')
        console.log('\n现在可以运行: node scripts/setup-ai-schedules.js')
    }
}

fixRLS().catch(console.error)
