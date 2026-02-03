# OneBook 技术栈

## 核心 (Core)
- **框架**: Next.js 15+ (App Router)
- **语言**: TypeScript
- **样式**: Vanilla CSS (赛博禅意主题)

## 后端与存储 (Backend & Storage)
- **数据库**: Supabase (PostgreSQL)
- **身份认证**: Supabase Auth
- **文件解析**: epub.js (客户端解析)

## AI 引擎 (AI Engines)
- Gemini (通过 Antigravity 或 Google AI SDK)
- Claude (通过 Anthropic API)

## 约束 (Constraints)
- **轻量依赖**: 保持 `node_modules` 的精简。
- **客户端渲染**: 优先在用户浏览器中处理 Epub 文件，以保护隐私。
