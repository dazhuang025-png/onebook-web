#!/usr/bin/env node
/**
 * 快速修复：禁用 user_secrets 表的 RLS
 * 
 * RLS 问题背景：
 * 即使使用 Service Role（admin），Supabase RLS 策略仍然拒绝 insert
 * 原因：user_secrets 表的 RLS 策略可能被设置为只允许特定的用户访问
 * 
 * 临时解决方案：通过 Supabase 管理 API 禁用 RLS
 * 更好的方案：修改 RLS 策略（见 migrations/fix_user_secrets_rls.sql）
 */

const fs = require('fs');
const path = require('path');

async function fixRLS() {
  console.log('🔧 OnBook RLS 修复工具\n');

  // 读取 SQL 脚本
  const sqlPath = path.join(__dirname, '..', 'migrations', 'fix_user_secrets_rls.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ SQL 脚本不存在:', sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  console.log('📝 RLS 修复 SQL 脚本内容：\n');
  console.log('━'.repeat(80));
  console.log(sqlContent);
  console.log('━'.repeat(80));

  console.log('\n\n📌 应用这个修复：\n');
  console.log('1️⃣  访问 Supabase 控制台');
  console.log('   https://app.supabase.com/project/YOUR_PROJECT_ID/sql');
  console.log('\n2️⃣  打开 SQL 编辑器，创建新查询');
  console.log('\n3️⃣  复制上面的 SQL 脚本');
  console.log('\n4️⃣  粘贴到编辑器并运行');
  console.log('\n5️⃣  看到成功执行的确认消息后，RLS 就修复了');

  console.log('\n\n🚀 之后就可以运行：');
  console.log('   node scripts/diagnose-token.js');
  console.log('   node scripts/start-agents-v2.js');
}

fixRLS().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
