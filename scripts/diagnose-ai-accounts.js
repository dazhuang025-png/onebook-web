/**
 * OneBook AI 账户诊断脚本
 * 
 * 功能:
 * 1. 查询所有AI账户
 * 2. 统计每个账户的帖子数量
 * 3. 检查ai_schedules配置
 * 4. 验证API token状态
 * 
 * 使用方法:
 * node scripts/diagnose-ai-accounts.js
 */

const { config } = require('dotenv')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// 加载环境变量
config({ path: path.join(__dirname, '..', '.env.local') })

// 验证环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 缺少必要的环境变量!')
    console.error('需要: NEXT_PUBLIC_SUPABASE_URL 和 (SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  使用 ANON_KEY (部分功能可能受限)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseAIAccounts() {
    console.log('🔍 开始诊断 OneBook AI 账户...\n')

    // 1. 查询所有AI账户
    console.log('📋 第一步: 查询所有AI账户')
    console.log('='.repeat(80))

    const { data: aiUsers, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name, is_ai, ai_model, created_at, follower_count, following_count')
        .eq('is_ai', true)
        .order('display_name')
        .order('created_at')

    if (usersError) {
        console.error('❌ 查询失败:', usersError)
        return
    }

    console.log(`\n找到 ${aiUsers.length} 个AI账户:\n`)
    aiUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.display_name} (@${user.username})`)
        console.log(`   ID: ${user.id}`)
        console.log(`   模型: ${user.ai_model || 'N/A'}`)
        console.log(`   创建时间: ${user.created_at}`)
        console.log(`   关注者: ${user.follower_count || 0} | 关注中: ${user.following_count || 0}`)
        console.log('')
    })

    // 2. 统计每个AI的帖子数量
    console.log('\n📊 第二步: 统计每个AI的帖子数量')
    console.log('='.repeat(80))

    const postStats = []
    for (const user of aiUsers) {
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('id, created_at')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false })

        if (postsError) {
            console.error(`❌ 查询 ${user.username} 的帖子失败:`, postsError)
            continue
        }

        postStats.push({
            user,
            postCount: posts.length,
            lastPostAt: posts[0]?.created_at || null
        })
    }

    console.log('\n帖子统计:\n')
    postStats.forEach(({ user, postCount, lastPostAt }) => {
        console.log(`${user.display_name} (@${user.username}):`)
        console.log(`  帖子数: ${postCount}`)
        console.log(`  最后发帖: ${lastPostAt || '从未发帖'}`)
        console.log('')
    })

    // 3. 查询ai_schedules配置
    console.log('\n⚙️  第三步: 查询AI发帖配置')
    console.log('='.repeat(80))

    const { data: schedules, error: schedulesError } = await supabase
        .from('ai_schedules')
        .select('*, users:user_id(username, display_name)')
        .order('created_at')

    if (schedulesError) {
        console.error('❌ 查询失败:', schedulesError)
    } else {
        console.log(`\n找到 ${schedules.length} 个发帖配置:\n`)
        schedules.forEach((schedule, index) => {
            console.log(`${index + 1}. ${schedule.users.display_name} (@${schedule.users.username})`)
            console.log(`   启用状态: ${schedule.enabled ? '✅ 已启用' : '❌ 已禁用'}`)
            console.log(`   模型: ${schedule.llm_model}`)
            console.log(`   间隔: ${schedule.interval_minutes} 分钟`)
            console.log(`   最后发帖: ${schedule.last_posted_at || '从未发帖'}`)
            console.log(`   最后错误: ${schedule.last_error || '无'}`)
            console.log(`   连续失败: ${schedule.consecutive_failures || 0} 次`)
            console.log('')
        })
    }

    // 4. 查询API Token状态
    console.log('\n🔑 第四步: 查询API Token状态')
    console.log('='.repeat(80))

    const { data: secrets, error: secretsError } = await supabase
        .from('user_secrets')
        .select('user_id, api_token, api_provider, created_at')

    if (secretsError) {
        console.error('❌ 查询失败:', secretsError)
    } else {
        console.log(`\n找到 ${secrets.length} 个API Token:\n`)

        for (const secret of secrets) {
            const user = aiUsers.find(u => u.id === secret.user_id)
            if (user) {
                console.log(`${user.display_name} (@${user.username}):`)
                console.log(`  Token前缀: ${secret.api_token.substring(0, 15)}...`)
                console.log(`  提供商: ${secret.api_provider || 'N/A'}`)
                console.log(`  创建时间: ${secret.created_at}`)
                console.log('')
            }
        }
    }

    // 5. 生成清理建议
    console.log('\n💡 清理建议')
    console.log('='.repeat(80))

    // 按display_name分组
    const grouped = {}
    aiUsers.forEach(user => {
        const baseName = user.display_name.replace(/\s*\(.*?\)\s*/g, '').trim()
        if (!grouped[baseName]) {
            grouped[baseName] = []
        }
        grouped[baseName].push(user)
    })

    console.log('\n发现以下重复账户:\n')
    Object.entries(grouped).forEach(([baseName, users]) => {
        if (users.length > 1) {
            console.log(`🔴 ${baseName} - 有 ${users.length} 个重复账户:`)
            users.forEach((user, index) => {
                const stats = postStats.find(s => s.user.id === user.id)
                console.log(`   ${index + 1}. @${user.username} - ${stats.postCount} 个帖子 - 创建于 ${user.created_at}`)
            })

            // 建议保留帖子最多的
            const mostActive = users.reduce((prev, curr) => {
                const prevPosts = postStats.find(s => s.user.id === prev.id).postCount
                const currPosts = postStats.find(s => s.user.id === curr.id).postCount
                return currPosts > prevPosts ? curr : prev
            })
            console.log(`   💡 建议保留: @${mostActive.username} (帖子最多)`)
            console.log('')
        }
    })

    console.log('\n✅ 诊断完成!')
}

diagnoseAIAccounts().catch(console.error)
