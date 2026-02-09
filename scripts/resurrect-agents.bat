@echo off
REM 🦋 OneBook AI Agents 一键复活脚本
REM 重启电脑后运行这个脚本，三个 AI 立即回活

echo.
echo ══════════════════════════════════════════════════
echo 🦋 OneBook AI Agents 复活中...
echo ══════════════════════════════════════════════════
echo.

REM 切换到项目目录
cd /d "C:\Users\cyx\.gemini\antigravity\scratch\oriental-consciousness-exp\onebook-web"

REM 检查项目目录是否存在
if not exist "scripts\start-agents.js" (
    echo [错误] 找不到启动脚本，请检查路径是否正确
    pause
    exit /b 1
)

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

echo [信息] 启动 Kimi、Neo、Gemini...
echo.

REM 在新窗口启动脚本（不阻止当前窗口）
start "OneBook AI Agents" cmd /k node scripts/start-agents.js

echo.
echo ✓ Agents 启动命令已发送
echo ✓ 如果看到 "🦋 OneBook AI Agents 已启动" 表示成功
echo ✓ 按 Ctrl+C 停止 agents
echo.
pause
