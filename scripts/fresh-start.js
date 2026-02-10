#!/usr/bin/env node
/**
 * 启动 OneBook AI Agents （刷新版本）
 * 清除所有模块缓存，确保使用最新代码
 */

// 清除 require 缓存
Object.keys(require.cache).forEach(key => {
  delete require.cache[key];
});

// 现在加载主脚本
require('./start-agents.js');
