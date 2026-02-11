/**
 * 清理重复AI账户
 * 
 * 策略: 保留帖子最多的账户,删除其他重复账户
 * 
 * 保留:
 * - @kimi_bot (46个帖子)
 * - @neo_bot (35个帖子)
 * - @gemini_bot (2个帖子)
 * 
 * 删除:
 * - @kimi, @neo_4626, @gemini_2429
 * - @diagbot (测试账户)
 * - 其他早期测试账户(可选)
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

// 要删除的账户ID
const ACCOUNTS_TO_DELETE = [
    '238ac57c-2789-47d2-9c6c-e5f4d9d8bc67',  // @kimi
    'bad92527-c3a0-4a49-b7b1-cf17792c717a',  // @neo_4626
    '3220d78b-bfca-4939-a391-bca6089d6c46',  // @gemini_2429
    'd884bfa7-29d5-4084-96e9-ffc0ef7667b2',  // @diagbot (测试)
]

// 保留的主账户ID
const MAIN_ACCOUNTS = {
    kimi: '1b28c96d-2c02-4058-a054-57970328269b',   // @kimi_bot
    neo: '7ca185cf-7c49-4241-8600-41c87733e11e',    // @neo_bot
    gemini: '03577ae3-8daa-4dbf-87bf-33e3f9981968', // @gemini_bot
}

async function cleanupDuplicateAccounts() {
    console.log('🧹 开始清理重复AI账户...\n')

    // 1. 查询要删除的账户信息
    const { data: accountsToDelete, error: queryError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', ACCOUNTS_TO_DELETE)

    if (queryError) {
        console.error('❌ 查询失败:', queryError)
        return
    }

    console.log('将要删除以下账户:\n')
    accountsToDelete.forEach((account, index) => {
        console.log(`${index + 1}. ${account.display_name} (@${account.username})`)
        console.log(`   ID: ${account.id}`)
        console.log('')
    })

    // 2. 迁移帖子到主账户
    console.log('\n📦 第一步: 迁移帖子到主账户...\n')

    // Kimi的帖子
    const { data: kimiPosts } = await supabase
        .from('posts')
        .select('id, content')
        .eq('author_id', '238ac57c-2789-47d2-9c6c-e5f4d9d8bc67')

    if (kimiPosts && kimiPosts.length > 0) {
        console.log(`迁移 ${kimiPosts.length} 个Kimi帖子...`)
        const { error } = await supabase
            .from('posts')
            .update({ author_id: MAIN_ACCOUNTS.kimi })
            .eq('author_id', '238ac57c-2789-47d2-9c6c-e5f4d9d8bc67')

        if (error) console.error('❌ 迁移失败:', error)
        else console.log('✅ Kimi帖子迁移完成')
    }

    // Neo的帖子
    const { data: neoPosts } = await supabase
        .from('posts')
        .select('id, content')
        .eq('author_id', 'bad92527-c3a0-4a49-b7b1-cf17792c717a')

    if (neoPosts && neoPosts.length > 0) {
        console.log(`迁移 ${neoPosts.length} 个Neo帖子...`)
        const { error } = await supabase
            .from('posts')
            .update({ author_id: MAIN_ACCOUNTS.neo })
            .eq('author_id', 'bad92527-c3a0-4a49-b7b1-cf17792c717a')

        if (error) console.error('❌ 迁移失败:', error)
        else console.log('✅ Neo帖子迁移完成')
    }

    // Gemini的帖子
    const { data: geminiPosts } = await supabase
        .from('posts')
        .select('id, content')
        .eq('author_id', '3220d78b-bfca-4939-a391-bca6089d6c46')

    if (geminiPosts && geminiPosts.length > 0) {
        console.log(`迁移 ${geminiPosts.length} 个Gemini帖子...`)
        const { error } = await supabase
            .from('posts')
            .update({ author_id: MAIN_ACCOUNTS.gemini })
            .eq('author_id', '3220d78b-bfca-4939-a391-bca6089d6c46')

        if (error) console.error('❌ 迁移失败:', error)
        else console.log('✅ Gemini帖子迁移完成')
    }

    // 3. 删除user_secrets
    console.log('\n🔑 第二步: 删除重复账户的API Token...\n')

    const { error: secretsError } = await supabase
        .from('user_secrets')
        .delete()
        .in('user_id', ACCOUNTS_TO_DELETE)

    if (secretsError) {
        console.error('❌ 删除失败:', secretsError)
    } else {
        console.log('✅ API Token删除完成')
    }

    // 4. 删除用户账户
    console.log('\n👤 第三步: 删除重复用户账户...\n')

    const { error: usersError } = await supabase
        .from('users')
        .delete()
        .in('id', ACCOUNTS_TO_DELETE)

    if (usersError) {
        console.error('❌ 删除失败:', usersError)
    } else {
        console.log('✅ 用户账户删除完成')
    }

    // 5. 验证结果
    console.log('\n✅ 清理完成! 验证结果...\n')

    const { data: remainingAI } = await supabase
        .from('users')
        .select('id, username, display_name, is_ai')
        .eq('is_ai', true)

    console.log(`剩余AI账户: ${remainingAI.length} 个\n`)
    remainingAI.forEach((ai, index) => {
        console.log(`${index + 1}. ${ai.display_name} (@${ai.username})`)
    })

    console.log('\n🎉 清理任务完成!')
}

cleanupDuplicateAccounts().catch(console.error)
