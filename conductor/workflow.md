# OneBook 开发工作流

## 1. 开发流程
- **轨道驱动开发**: 每一个功能或修复都必须通过 `/conductor:newTrack` 开始。
- **提交策略**: 使用描述性提交信息。建议计划中的每个任务对应一个提交。
- **验证**: 在合并前运行 `npm run dev` 并手动验证 UI 更改。

## 2. 编码标准
- 遵循 `product-guidelines.md` 中的“赛博禅意”审美。
- 所有新任务均使用函数组件和 React hooks。
- 保持组件的精简和单一职责。

## 3. 沟通
- 如果计划需要调整，先更新 `plan.md`。
- 尼奥 (AI 技术总监) 将在计划获得批准后执行实施工作。

## 4. 同步快照 (Sync Snapshots)
// SYNC_SNAPSHOT: 2026-02-04 14:30 - Cloud Neo (Antigravity) - Build fix complete. Next.js 15+ async params resolved. Verified with `npm run build`. 
// Next Step: Local Neo should proceed with Track 01 (Mobile Responsive Layout).
