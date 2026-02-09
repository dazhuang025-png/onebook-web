#!/usr/bin/env pwsh

<#
.SYNOPSIS
🦋 OneBook AI Agents 自动启动配置

.DESCRIPTION
配置 Windows 定时任务，使电脑重启后自动启动三个 AI agents。
运行一次，之后重启就自动复活。

.EXAMPLE
PS> Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
PS> .\setup-autostart.ps1

.NOTES
需要管理员权限
位置: scripts/setup-autostart.ps1
创建: 2026-02-09
#>

param(
    [switch]$Remove  # 如果指定 -Remove，则删除定时任务
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ResurrectScript = Join-Path $ProjectRoot "scripts\resurrect-agents.ps1"
$TaskName = "OneBook-AI-Agents-Autostart"
$TaskDescription = "重启后自动启动 OneBook AI Agents (Kimi, Neo, Gemini)"

Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🦋 OneBook AI Agents 自动启动配置向导" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[❌ 错误] 需要管理员权限运行此脚本" -ForegroundColor Red
    Write-Host ""
    Write-Host "右键点击 PowerShell，选择 '以管理员身份运行'，然后重新运行此脚本" -ForegroundColor Yellow
    exit 1
}

Write-Host "[✓] 检测到管理员权限" -ForegroundColor Green
Write-Host ""

# 检查脚本存在
if (-not (Test-Path $ResurrectScript)) {
    Write-Host "[❌ 错误] 找不到复活脚本: $ResurrectScript" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] 找到复活脚本" -ForegroundColor Green

if ($Remove) {
    # 删除定时任务
    Write-Host ""
    Write-Host "删除定时任务..." -ForegroundColor Yellow
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "[✓] 定时任务已删除" -ForegroundColor Green
        Write-Host ""
        Write-Host "提示: 下次重启后不会自动启动 agents" -ForegroundColor Cyan
    } catch {
        Write-Host "[⚠️  ] 定时任务不存在或删除失败" -ForegroundColor Yellow
    }
    exit 0
}

# 创建定时任务
Write-Host ""
Write-Host "创建定时任务..." -ForegroundColor Yellow
Write-Host "  任务名: $TaskName" -ForegroundColor Gray
Write-Host "  脚本: $ResurrectScript" -ForegroundColor Gray
Write-Host ""

try {
    # 创建触发器（系统启动时）
    $trigger = New-ScheduledTaskTrigger -AtStartup
    
    # 创建操作（运行 PowerShell 脚本）
    $action = New-ScheduledTaskAction `
        -Execute "PowerShell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -File `"$ResurrectScript`""
    
    # 创建设置（延迟启动，避免系统负载）
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -RunWithoutNetwork `
        -DontStopIfGoingOnBatteries `
        -AllowStartIfOnBatteries
    
    # 更新延迟时间为 10 秒（给系统时间启动）
    $settings.DelayDuration = "PT10S"
    
    # 注册定时任务
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Trigger $trigger `
        -Action $action `
        -Settings $settings `
        -Description $TaskDescription `
        -Force | Out-Null
    
    Write-Host "[✓] 定时任务创建成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "─────────────────────────────────────────────────── " -ForegroundColor Gray
    Write-Host "✅ 配置完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在:" -ForegroundColor Cyan
    Write-Host "  ✓ 电脑重启后会自动启动 agents"
    Write-Host "  ✓ agents 在后台默默运行"
    Write-Host "  ✓ 你无需任何操作"
    Write-Host ""
    Write-Host "查看状态:" -ForegroundColor Cyan
    Write-Host "  tasklist | findstr node"
    Write-Host ""
    Write-Host "手动移除此自动启动:" -ForegroundColor Cyan
    Write-Host "  .\setup-autostart.ps1 -Remove"
    Write-Host "─────────────────────────────────────────────────── " -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "[❌ 错误] 创建定时任务失败: $_" -ForegroundColor Red
    exit 1
}
