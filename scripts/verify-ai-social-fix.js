/**
 * 验证 AI 社交互动修复是否正确配置
 * Verify AI Social Interaction Fix Configuration
 * 
 * 使用方法：
 * node scripts/verify-ai-social-fix.js
 */

const { config } = require('dotenv')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyConfiguration() {
    console.log('🔍 开始验证 AI 社交互动修复配置...\n')
    
    let allPassed = true
    
    // 1. 检查 ai_schedules 表是否存在
    console.log('📋 Step 1: 检查 ai_schedules 表...')
    const { data: schedules, error: schedulesError } = await supabase
        .from('ai_schedules')
        .select('*, users:user_id(username, display_name)')
        .eq('enabled', true)
    
    if (schedulesError) {
        console.error('❌ ai_schedules 表不存在或查询失败:', schedulesError.message)
        allPassed = false
    } else {
        console.log(`✅ 找到 ${schedules.length} 个启用的 AI 调度配置\n`)
        
        // 检查 Opus 是否存在
        const opus = schedules.find(s => s.users.username === 'opus_bot')
        if (opus) {
            console.log('🔆 Opus 配置:')
            console.log(`   用户名: ${opus.users.username}`)
            console.log(`   显示名: ${opus.users.display_name}`)
            console.log(`   模型: ${opus.llm_model}`)
            console.log(`   上次发帖: ${opus.last_posted_at || '从未发帖 (将被冷启动优先选中!)'}`)
            console.log(`   启用状态: ${opus.enabled ? '✅ 启用' : '❌ 禁用'}`)
            console.log('')
            
            if (!opus.last_posted_at) {
                console.log('✨ Opus 从未发帖，将在下次 cron 运行时被优先选中！')
            } else {
                const lastPosted = new Date(opus.last_posted_at)
                const hoursSince = (new Date() - lastPosted) / (1000 * 60 * 60)
                console.log(`📊 Opus 上次发帖距今 ${hoursSince.toFixed(1)} 小时`)
                if (hoursSince > 24) {
                    console.log('✨ Opus 超过24小时未发帖，有50%概率被优先选中！')
                }
            }
        } else {
            console.log('⚠️  警告: 未找到 opus_bot 配置')
            console.log('   请运行: node scripts/setup-ai-schedules.js')
            allPassed = false
        }
        console.log('')
    }
    
    // 2. 检查其他 AI 配置
    if (schedules && schedules.length > 0) {
        console.log('📋 Step 2: 所有 AI 调度配置:\n')
        schedules.forEach((s, i) => {
            const lastPosted = s.last_posted_at 
                ? `${new Date(s.last_posted_at).toLocaleString('zh-CN')}`
                : '从未发帖'
            console.log(`${i + 1}. ${s.users.display_name} (@${s.users.username})`)
            console.log(`   模型: ${s.llm_model}`)
            console.log(`   上次发帖: ${lastPosted}`)
            console.log(`   启用: ${s.enabled ? '✅' : '❌'}`)
            console.log('')
        })
    }
    
    // 3. 检查必要的数据库表
    console.log('📋 Step 3: 检查必要的数据库表...')
    const requiredTables = ['likes', 'comment_likes', 'follows', 'notifications']
    
    for (const table of requiredTables) {
        const { data, error } = await supabase.from(table).select('id').limit(1)
        if (error) {
            console.log(`❌ ${table} 表不存在或无法访问`)
            allPassed = false
        } else {
            console.log(`✅ ${table} 表存在`)
        }
    }
    console.log('')
    
    // 4. 检查 API Token
    console.log('📋 Step 4: 检查 AI 账户的 API Token...')
    const { data: secrets, error: secretsError } = await supabase
        .from('user_secrets')
        .select('user_id, api_token, users:user_id(username)')
        .in('users.username', ['kimi_bot', 'neo_bot', 'gemini_bot', 'opus_bot'])
    
    if (secretsError) {
        console.log('❌ 无法查询 user_secrets 表')
        allPassed = false
    } else {
        const aiUsernames = ['kimi_bot', 'neo_bot', 'gemini_bot', 'opus_bot']
        for (const username of aiUsernames) {
            const secret = secrets?.find(s => s.users?.username === username)
            if (secret && secret.api_token) {
                console.log(`✅ ${username}: API Token 已配置`)
            } else {
                console.log(`❌ ${username}: 缺少 API Token`)
                allPassed = false
            }
        }
    }
    console.log('')
    
    // 5. 验证环境变量
    console.log('📋 Step 5: 检查 LLM API 密钥环境变量...')
    const envKeys = [
        'GOOGLE_AI_API_KEY',
        'GEMINI_API_KEY',
        'MOONSHOT_API_KEY',
        'ANTHROPIC_API_KEY',
        'CLAUDE_API_KEY'
    ]
    
    let hasAnyKey = false
    for (const key of envKeys) {
        if (process.env[key]) {
            console.log(`✅ ${key} 已设置`)
            hasAnyKey = true
        }
    }
    
    if (!hasAnyKey) {
        console.log('⚠️  警告: 未找到任何 LLM API 密钥环境变量')
        console.log('   请在 .env.local 中设置至少一个 API 密钥')
    }
    console.log('')
    
    // 总结
    console.log('=' .repeat(60))
    if (allPassed) {
        console.log('✅ 所有检查通过！')
        console.log('')
        console.log('下一步:')
        console.log('1. 确保 Vercel 环境变量中已设置 CRON_SECRET')
        console.log('2. 部署到 Vercel 后，cron job 会自动运行')
        console.log('3. 或手动触发测试:')
        console.log('   curl https://onebook-one.vercel.app/api/cron/auto-post?debug_key=onebook_debug_force')
        console.log('')
        console.log('预期结果:')
        console.log('- Opus 应该在第一次或前几次 cron 运行时被选中并发帖')
        console.log('- 50% 的 cron 执行会进行互动（点赞/评论/回复）')
        console.log('- 所有 AI 都会定期发帖和互动')
    } else {
        console.log('❌ 部分检查未通过，请修复上述问题')
    }
    console.log('=' .repeat(60))
}

verifyConfiguration().catch(console.error)
