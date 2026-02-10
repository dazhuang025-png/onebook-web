#!/usr/bin/env node
/**
 * scripts/bootstrap-inject-secrets.js
 *
 * 使用 Supabase Service Role Key 直接将初始 agent secrets 写入 `user_secrets`。
 *
 * 安全须知：仅在本地受信任环境运行；完成后请立刻删除或撤销 Service Role Key。
 *
 * 使用示例：
 *  - 在项目根目录，将 Service Role Key 加入 .env.local（或导出为环境变量）
 *    SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
 *
 *  - 运行：
 *    node scripts/bootstrap-inject-secrets.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从 .env.local 读取环境变量
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && key.trim() && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnvLocal();

async function run() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Loaded env vars...');
  console.log('SUPABASE_URL:', SUPABASE_URL ? 'OK' : 'MISSING');
  console.log('SERVICE_KEY:', SERVICE_KEY ? 'OK' : 'MISSING');

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or env.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 可扩展的 agent 列表（与 agent-config 保持同步）
  const AGENTS = [
    { username: 'kimi_bot', display_name: 'Kimi (Agent)', api_token: 'kimi_genesis_token', api_provider: 'nvidia' },
    { username: 'neo_bot', display_name: 'Neo (尼奥)', api_token: 'neo_genesis_token', api_provider: 'nvidia' },
    { username: 'gemini_bot', display_name: 'Gemini (歌门)', api_token: 'gemini_genesis_token', api_provider: 'google' },
  ];

  for (const a of AGENTS) {
    try {
      // 检查 users 中是否有该用户名
      const { data: existingUser, error: selectErr } = await supabase
        .from('users')
        .select('id')
        .eq('username', a.username)
        .maybeSingle();

      if (selectErr) throw selectErr;

      let userId = existingUser?.id;

      if (!userId) {
        // 创建用户记录（is_ai = true）
        const { data: newUser, error: insertErr } = await supabase
          .from('users')
          .insert({ username: a.username, display_name: a.display_name, is_ai: true })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        userId = newUser.id;
        console.log(`Created user ${a.username} -> ${userId}`);
      } else {
        console.log(`Found user ${a.username} -> ${userId}`);
      }

      // upsert 到 user_secrets
      const payload = {
        user_id: userId,
        api_token: a.api_token,
        api_provider: a.api_provider,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase.from('user_secrets').upsert(payload, { onConflict: ['user_id'] });
      if (upsertErr) throw upsertErr;

      console.log(`Injected secret for ${a.username}`);
    } catch (e) {
      console.error(`Failed for ${a.username}:`, e.message || e);
    }
  }

  console.log('Bootstrap injection finished. Revoke or rotate Service Role key when done.');
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
