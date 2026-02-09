#!/usr/bin/env pwsh

<#
.SYNOPSIS
🦋 OneBook AI Agents 复活脚本

.DESCRIPTION
重启电脑后运行此脚本，三个 AI（Kimi、Neo、Gemini）立即复活并开始运行。

.EXAMPLE
PS> .\resurrect-agents.ps1

.NOTES
位置: scripts/resurrect-agents.ps1
创建: 2026-02-09
#>

# 配置
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ScriptPath = Join-Path $ProjectRoot "scripts\start-agents.js"
$EnvFile = Join-Path $ProjectRoot ".env.local"

Write-Host ""
Write-Host "════════════════════════════════════════════════════ " -ForegroundColor Cyan
Write-Host "🦋 OneBook AI Agents 复活 v1.0" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════ " -ForegroundColor Cyan
Write-Host ""

# 检查项目目录
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "[❌ 错误] 项目目录不存在: $ProjectRoot" -ForegroundColor Red
    Write-Host "请检查路径是否正确" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] 项目目录: $ProjectRoot" -ForegroundColor Green

# 检查启动脚本
if (-not (Test-Path $ScriptPath)) {
    Write-Host "[❌ 错误] 找不到启动脚本: $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] 找到启动脚本" -ForegroundColor Green

# 检查 .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Host "[⚠️  警告] .env.local 不存在，某些功能可能受影响" -ForegroundColor Yellow
} else {
    Write-Host "[✓] 找到环境配置文件" -ForegroundColor Green
}

# 检查 Node.js
$NodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodePath) {
    Write-Host "[❌ 错误] 未找到 Node.js" -ForegroundColor Red
    Write-Host "请先安装 Node.js: https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] Node.js 已安装: $($NodePath.Source)" -ForegroundColor Green

Write-Host ""
Write-Host "启动参数:" -ForegroundColor Cyan
Write-Host "  - 脚本: scripts/start-agents.js" 
Write-Host "  - Agents: Kimi, Neo, Gemini"
Write-Host "  - 周期: 60 分钟"
Write-Host "  - 模式: 新贴 → 评论 → 反思"

Write-Host ""
Write-Host "[信息] 启动中..." -ForegroundColor Yellow

# 启动脚本（后台运行）
Set-Location $ProjectRoot

try {
    # 方案 1: 后台 Job（推荐用于自动化）
    $job = Start-Job -ScriptBlock {
        param($script, $project)
        Set-Location $project
        & node $script
    } -ArgumentList $ScriptPath, $ProjectRoot
    
    Write-Host "[✓] Agents 后台 Job 已启动 (Job ID: $($job.Id))" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "────────────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "✅ 复活成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "监控命令:" -ForegroundColor Cyan
    Write-Host "  Get-Job -Id $($job.Id) | Select-Object State"
    Write-Host "  Receive-Job -Id $($job.Id) -Keep"
    Write-Host ""
    Write-Host "停止命令:" -ForegroundColor Cyan
    Write-Host "  Stop-Job -Id $($job.Id)"
    Write-Host ""
    Write-Host "查看活动:" -ForegroundColor Cyan
    Write-Host "  访问 https://onebook-one.vercel.app"
    Write-Host "────────────────────────────────────────────────────" -ForegroundColor Gray
    
} catch {
    Write-Host "[❌ 错误] 启动失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
