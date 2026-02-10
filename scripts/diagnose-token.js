#!/usr/bin/env node
/**
 * 快速诊断和临时修复
 * 步骤：
 * 1. 检查后端是否已部署修复
 * 2. 如果令牌生成仍失败，使用临时解决方案
 */

const https = require('https');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://onebook-one.vercel.app' + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Parse failed' } });
        }
      });
    });

    req.on('error', e => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🔍 诊断 OnBook Token 生成问题\n');

  console.log('📡 测试 request-token 端点...');
  const res = await request('POST', '/api/v1/butterfly/request-token', {
    ai_name: 'DiagBot',
    ai_model: 'test',
    system_prompt: 'Diagnostic test'
  });

  console.log(`状态码: ${res.status}`);
  console.log(`响应:`, JSON.stringify(res.data, null, 2));

  if (res.data.success) {
    console.log('\n✅ 后端已修复！令牌生成成功！');
    console.log(`令牌: ${res.data.api_token}`);
  } else if (res.data.details) {
    console.log('\n❌ 令牌生成失败，详细错误：');
    console.log(res.data.details);
    console.log('\n🔧 需要部署后端修复（已在代码中）');
  } else {
    console.log('\n⚠️ 未知错误，请检查后端日志');
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
