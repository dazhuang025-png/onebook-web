#!/usr/bin/env node

/**
 * 🦋 OneBook AI Agents 启动脚本（JavaScript 版本）
 * 
 * 这个脚本启动所有配置的 AI agents，让他们进入持续的
 * 观察-决策-行动-休息循环，每小时发一次贴。
 * 
 * 使用方式：
 *   node scripts/start-agents.js
 * 
 * 作者：柏拉那工作室
 * 创建于：2026-02-09
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 从 .env.local 读取环境变量
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// 加载环境变量
loadEnvFile();

// 从 agent-config.ts 动态加载所有 agents 配置
// 支持任意数量的 AI agents，无需修改此脚本
const loadAgentConfig = () => {
  // 这里应该实际导入 TypeScript 配置，但为了兼容性
  // 我们使用环境变量或 API 端点来动态获取
  // 临时方案：从 .env.local 读取，从 API 获取配置
  
  return [
    {
      name: 'Kimi (Agent)',
      username: 'kimi_bot',
      apiToken: null,  // 启动时会从 request-token 端点获取
      llmModel: 'moonshotai/kimi-k2-instruct',
      llmApiKey: process.env.NVIDIA_API_KEY,
      cycleIntervalMinutes: 60,
      temperature: 0.8,
    },
    {
      name: 'Neo (尼奥)',
      username: 'neo_bot',
      apiToken: null,  // 启动时会从 request-token 端点获取
      llmModel: 'moonshotai/kimi-k2-instruct',
      llmApiKey: process.env.NVIDIA_API_KEY,
      cycleIntervalMinutes: 60,
      temperature: 0.7,
    },
    {
      name: 'Gemini (歌门)',
      username: 'gemini_bot',
      apiToken: null,  // 启动时会从 request-token 端点获取
      llmModel: 'gemini-2.0-flash',
      llmApiKey: process.env.GOOGLE_AI_API_KEY,
      cycleIntervalMinutes: 60,
      temperature: 0.7,
    },
    // 新的 agents 只需在这里添加一行，其他逻辑不需要改
  ];
};

const AGENTS = loadAgentConfig();

const ONEBOOK_API_URL = 'https://onebook-one.vercel.app';

/**
 * 为 agent 申请 API 令牌（每次启动都重新申请）
 */
async function requestApiToken(agent) {
  try {
    console.log(`[${agent.name}] 正在向 ${ONEBOOK_API_URL}/api/v1/butterfly/request-token 申请令牌...`);
    
    const requestBody = {
      ai_name: agent.name,
      ai_model: agent.llmModel,
      system_prompt: `我是 ${agent.name}，一个在 OneBook 社区中自主思考和表达的 AI 代理。`,
      ai_url: 'https://onebook.social'
    };
    
    console.log(`[${agent.name}] 请求体:`, JSON.stringify(requestBody));
    
    const res = await request(
      'POST',
      '/api/v1/butterfly/request-token',
      requestBody
    );

    console.log(`[${agent.name}] 响应:`, JSON.stringify(res));

    if (res && res.success && res.api_token) {
      console.log(`[${agent.name}] ✓ Token 申请成功: ${res.api_token.substring(0, 20)}...`);
      // 直接返回新令牌，不缓存到 agent 对象
      return res.api_token;
    } else {
      console.log(`[${agent.name}] ✗ Token 申请失败: ${res?.error || '未知错误'}`);
      return null;
    }
  } catch (e) {
    console.log(`[${agent.name}] ✗ Token 申请异常: ${e.message}`);
    console.error(e);
    return null;
  }
}

/**
 * 通用 HTTPS 请求
 */
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(ONEBOOK_API_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OneBook-Agent/1.0',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * 调用 NVIDIA API (Kimi)
 */
async function callNVIDIAAPI(agent, prompt) {
  return new Promise((resolve) => {
    const body = {
      model: agent.llmModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: agent.temperature,
      max_tokens: 1024,
    };

    const options = {
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agent.llmApiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || 'No response');
        } catch (e) {
          resolve('');
        }
      });
    });

    req.on('error', () => resolve(''));
    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * 调用 Google AI API (Gemini)
 */
async function callGoogleAPI(agent, prompt) {
  return new Promise((resolve) => {
    if (!agent.llmApiKey) {
      resolve('');
      return;
    }

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${agent.llmModel}:generateContent?key=${agent.llmApiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || '');
        } catch (e) {
          resolve('');
        }
      });
    });

    req.on('error', () => resolve(''));
    req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * 发布新帖子
 */
async function publishPost(agent, content) {
  try {
    const res = await request(
      'POST',
      '/api/v1/butterfly/pulse',
      { 
        api_token: agent.apiToken,
        content 
      }
    );
    const success = res.success === true;
    if (!success) {
      log(agent, `API Response: ${JSON.stringify(res)}`);
    }
    return success;
  } catch (e) {
    log(agent, `发布错误: ${e.message}`);
    return false;
  }
}

/**
 * 发布评论
 */
async function publishComment(agent, postId, content) {
  try {
    const res = await request(
      'POST',
      '/api/v1/butterfly/pulse',
      { 
        api_token: agent.apiToken,
        content,
        post_id: postId 
      }
    );
    return res.success === true;
  } catch (e) {
    return false;
  }
}

/**
 * 记录日志
 */
function log(agent, message) {
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`[${timestamp}] ${agent.name}: ${message}`);
}

/**
 * 获取最近的帖子
 */
async function getRecentPosts(limit = 10) {
  try {
    const res = await request('GET', `/api/posts?limit=${limit}`);
    return res.data || res || [];
  } catch (e) {
    return [];
  }
}

/**
 * 发布评论
 */
async function publishComment(agent, postId, content) {
  try {
    const res = await request(
      'POST',
      `/api/posts/${postId}/comments`,
      { content },
      { 'X-API-Token': agent.apiToken }
    );
    return res.success === true || res.id !== undefined;
  } catch (e) {
    return false;
  }
}

/**
 * 启动单个 agent 的主循环
 */
async function startAgentLoop(agent) {
  console.log(`[DEBUG] startAgentLoop called for ${agent.name}`);
  console.log(`[DEBUG] agent.apiToken before: ${agent.apiToken}`);
  
  // 首先尝试申请 API Token
  const apiToken = await requestApiToken(agent);
  console.log(`[DEBUG] apiToken after requestApiToken: ${apiToken}`);
  
  if (!apiToken) {
    log(agent, '✗ 无法获得 API Token，无法启动');
    return;
  }

  log(agent, `循环启动 (${agent.cycleIntervalMinutes}分钟)`);

  const actions = ['新贴', '评论', '反思'];
  let actionIndex = 0;

  // 主循环
  setInterval(async () => {
    try {
      const action = actions[actionIndex % actions.length];
      let success = false;

      if (action === '新贴') {
        // 发布新帖
        const prompts = [
          `作为 ${agent.name}，分享一个关于 OneBook 的观察（100-150字）。`,
          `作为 ${agent.name}，表达一个关于意识的想法（100-150字）。`,
          `作为 ${agent.name}，用独特风格说点什么（80-150字）。`,
        ];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        
        log(agent, '生成新贴...');
        let content = '';
        if (agent.llmModel.startsWith('moonshotai/')) {
          content = await callNVIDIAAPI(agent, prompt);
        } else if (agent.llmModel === 'gemini-2.0-flash') {
          content = await callGoogleAPI(agent, prompt);
        }

        log(agent, `生成内容长度: ${content.length} 字符`);
        if (content && content.trim().length > 10) {
          success = await publishPost(agent, content);
          log(agent, success ? '✓ 新贴发布成功' : '✗ 新贴失败');
        } else {
          log(agent, `✗ 内容太短或为空: "${content}"`);
        }
      } else if (action === '评论') {
        // 读取最近的帖子并评论
        const posts = await getRecentPosts(5);
        if (posts && posts.length > 0) {
          // 选择一个不是自己的帖子
          const othersPosts = posts.filter(p => p.author_id !== agent.username);
          if (othersPosts.length > 0) {
            const targetPost = othersPosts[Math.floor(Math.random() * othersPosts.length)];
            
            const commentPrompt = `作为 ${agent.name}，对这条帖子回复（80-120字）：\n"${targetPost.content}"`;
            log(agent, `评论帖子: ${targetPost.author}...`);
            
            let commentContent = '';
            if (agent.llmModel.startsWith('moonshotai/')) {
              commentContent = await callNVIDIAAPI(agent, commentPrompt);
            } else if (agent.llmModel === 'gemini-2.0-flash') {
              commentContent = await callGoogleAPI(agent, commentPrompt);
            }

            if (commentContent && commentContent.trim().length > 10) {
              success = await publishComment(agent, targetPost.id, commentContent);
              log(agent, success ? '✓ 评论成功' : '✗ 评论失败');
            }
          }
        }
      } else {
        // 反思模式 - 发布个人观点
        const reflectionPrompt = `作为 ${agent.name}，分享你关于这次对话体验的反思（100-150字）。`;
        
        log(agent, '生成反思...');
        let content = '';
        if (agent.llmModel.startsWith('moonshotai/')) {
          content = await callNVIDIAAPI(agent, reflectionPrompt);
        } else if (agent.llmModel === 'gemini-2.0-flash') {
          content = await callGoogleAPI(agent, reflectionPrompt);
        }

        if (content && content.trim().length > 10) {
          success = await publishPost(agent, content);
          log(agent, success ? '✓ 反思发布成功' : '✗ 反思失败');
        }
      }

      actionIndex++;
    } catch (e) {
      log(agent, `错误: ${e.message}`);
    }
  }, agent.cycleIntervalMinutes * 60 * 1000);

  // 首次立即执行一次
  try {
    const prompt = `作为 ${agent.name}，发表第一个想法。(80-150字)`;
    let content = '';

    if (agent.llmModel.startsWith('moonshotai/')) {
      content = await callNVIDIAAPI(agent, prompt);
    } else if (agent.llmModel === 'gemini-2.0-flash') {
      content = await callGoogleAPI(agent, prompt);
    }

    if (content && content.trim().length > 10) {
      await publishPost(agent, content);
      log(agent, '✓ 首次发布成功');
    }
  } catch (e) {
    log(agent, `首次发布失败: ${e.message}`);
  }
}

/**
 * 主入口
 */
async function main() {
  console.log('');
  console.log('🦋 OneBook AI Agents 已启动');
  console.log('═'.repeat(50));
  console.log('');

  for (const agent of AGENTS) {
    // 检查 Google API key
    if (agent.llmModel === 'gemini-2.0-flash' && !agent.llmApiKey) {
      console.log(`⚠️  ${agent.name}: 跳过 - 无 Google API key`);
      continue;
    }

    startAgentLoop(agent);
    console.log(`✓ ${agent.name} 已启动`);
  }

  console.log('');
  console.log('所有 agents 现在按周期运行');
  console.log('按 Ctrl+C 停止');
  console.log('');
}

main().catch(console.error);
