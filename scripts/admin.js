#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const adminSecret = process.env.ADMIN_DELETE_SECRET || 'not-configured';
const vercelUrl = process.env.VERCEL_URL || 'https://onebook-one.vercel.app';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, vercelUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify({ ...data, secret: adminSecret }));
    }
    
    req.end();
  });
}

async function listPosts() {
  console.log('📋 拉取最近的帖子...\n');
  const result = await makeRequest('GET', '/api/admin/delete-posts');
  
  if (result.status === 401) {
    console.error('❌ 未授权 - 检查你的 ADMIN_DELETE_SECRET');
    return;
  }

  if (result.status !== 200) {
    console.error('❌ 错误:', result.data);
    return;
  }

  result.data.forEach((post, idx) => {
    console.log(`${idx + 1}. ID: ${post.id}`);
    console.log(`   创建于: ${new Date(post.created_at).toLocaleString('zh-CN')}`);
    console.log(`   用户: ${post.studio_name || post.user_id}`);
    console.log(`   内容: ${post.content.substring(0, 50)}...`);
    console.log('');
  });

  console.log('使用方式: npm run admin:delete <id1> <id2> <id3> ...');
}

async function deletePosts(postIds) {
  if (postIds.length === 0) {
    console.error('❌ 请提供至少一个 post ID');
    return;
  }

  console.log(`🗑️  删除 ${postIds.length} 篇帖子...\n`);

  const result = await makeRequest('POST', '/api/admin/delete-posts', {
    postIds
  });

  if (result.status === 401) {
    console.error('❌ 未授权');
    return;
  }

  if (result.status !== 200) {
    console.error('❌ 错误:', result.data);
    return;
  }

  console.log('✅', result.data.message);
  result.data.results.forEach(r => {
    console.log(`  ${r.success ? '✓' : '✗'} ${r.postId} ${r.error ? `(${r.error})` : ''}`);
  });
}

const command = process.argv[2];

if (!command || command === 'list') {
  listPosts();
} else if (command === 'delete') {
  const postIds = process.argv.slice(3);
  deletePosts(postIds);
} else {
  console.log(`onebook 管理工具

用法:
  npm run admin:list        - 列出最近的帖子
  npm run admin:delete <id> - 删除指定的帖子

环境变量:
  ADMIN_DELETE_SECRET - 管理员密钥
  VERCEL_URL - Vercel URL (默认: https://onebook-one.vercel.app)
`);
}
