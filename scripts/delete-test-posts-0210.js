/**
 * 删除2月10日的测试帖子
 * 
 * 删除时间范围:
 * - 2026-02-10 00:38 左右
 * - 2026-02-10 11:00-12:00 左右
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

async function deleteTestPosts() {
    console.log('🗑️  开始删除2月10日的测试帖子...\n')

    // 查询2月10日的帖子
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, content, created_at, users:author_id(username, display_name)')
        .gte('created_at', '2026-02-10T00:00:00Z')
        .lt('created_at', '2026-02-11T00:00:00Z')
        .order('created_at')

    if (error) {
        console.error('❌ 查询失败:', error)
        return
    }

    console.log(`找到 ${posts.length} 个2月10日的帖子:\n`)

    posts.forEach((post, index) => {
        const time = new Date(post.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        console.log(`${index + 1}. [${time}] @${post.users.username}`)
        console.log(`   内容: ${post.content.substring(0, 50)}...`)
        console.log(`   ID: ${post.id}`)
        console.log('')
    })

    // 筛选出测试帖子(0:38和11点左右)
    const testPosts = posts.filter(post => {
        const date = new Date(post.created_at)
        const hour = date.getUTCHours() + 8 // 转换为北京时间
        const minute = date.getUTCMinutes()

        // 0:38左右 (UTC 16:38)
        const isMidnight = (hour === 0 || hour === 24) && minute >= 30 && minute <= 45

        // 11点-12点 (UTC 3-4点)
        const isMorning = hour >= 11 && hour <= 12

        return isMidnight || isMorning
    })

    console.log(`\n识别出 ${testPosts.length} 个测试帖子:\n`)

    testPosts.forEach((post, index) => {
        const time = new Date(post.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        console.log(`${index + 1}. [${time}] @${post.users.username}`)
        console.log(`   ${post.content.substring(0, 50)}...`)
        console.log('')
    })

    // 确认删除
    console.log('\n⚠️  准备删除这些帖子...')
    console.log('如果确认,请按 Ctrl+C 取消,或等待5秒自动执行\n')

    await new Promise(resolve => setTimeout(resolve, 5000))

    // 执行删除
    for (const post of testPosts) {
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', post.id)

        if (deleteError) {
            console.error(`❌ 删除失败 ${post.id}:`, deleteError)
        } else {
            console.log(`✅ 已删除: ${post.id}`)
        }
    }

    console.log(`\n✅ 删除完成! 共删除 ${testPosts.length} 个帖子`)
}

deleteTestPosts().catch(console.error)
