#!/usr/bin/env node
/**
 * 设置超级管理员账户
 * 
 * 使用方式:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/setup-admin.js <user_id_or_email>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 读取 .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 缺少 Supabase 凭证，请检查 .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupAdmin() {
  const target = process.argv[2];

  if (!target) {
    console.error('用法: node scripts/setup-admin.js <user_id_or_email>');
    console.error('  示例: node scripts/setup-admin.js user_123456');
    console.error('  或:   node scripts/setup-admin.js bolana@example.com');
    process.exit(1);
  }

  try {
    console.log(`🔧 设置管理员: ${target}\n`);

    // 查找用户（通过ID或email）
    let user;
    
    if (target.includes('@')) {
      // 通过email查找
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, studio_name, role')
        .eq('email', target)
        .limit(1);

      if (error || !users || users.length === 0) {
        console.error(`❌ 未找到邮箱为 ${target} 的用户`);
        return;
      }
      user = users[0];
    } else {
      // 通过ID查找
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, studio_name, role')
        .eq('id', target)
        .limit(1);

      if (error || !users || users.length === 0) {
        console.error(`❌ 未找到ID为 ${target} 的用户`);
        return;
      }
      user = users[0];
    }

    console.log('找到用户:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.studio_name}`);
    console.log(`  当前角色: ${user.role || 'user'}\n`);

    // 更新为admin
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ 更新失败:', updateError.message);
      return;
    }

    console.log('✅ 成功设置为管理员！');
    console.log('\n现在你可以:');
    console.log('  npm run admin:list   - 列出所有帖子');
    console.log('  npm run admin:delete - 删除指定的帖子');

  } catch (err) {
    console.error('❌ 脚本错误:', err);
    process.exit(1);
  }
}

setupAdmin();
