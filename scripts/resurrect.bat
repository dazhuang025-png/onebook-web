@echo off
REM 🦋 OneBook AI Agents Resurrection Script
REM Run this script after computer restart to bring three AIs back to life

setlocal enabledelayedexpansion

echo.
echo ====================================================================
echo ONEOOK AI AGENTS RESURRECTION / OneBook AI Agents 一键复活
echo ====================================================================
echo.

REM Get project root directory (assumes this script is in scripts/ subfolder)
for %%i in ("%~dp0..") do set "PROJECTROOT=%%~fi"

REM Check if project directory exists
if not exist "%PROJECTROOT%" (
    echo [ERROR] Project directory not found: %PROJECTROOT%
    echo [错误] 项目目录不存在
    pause
    exit /b 1
)

echo [OK] Found project: %PROJECTROOT%
echo.

REM Check if startup script exists
if not exist "%PROJECTROOT%\scripts\start-agents.js" (
    echo [ERROR] Startup script not found
    echo [错误] 找不到启动脚本
    pause
    exit /b 1
)

echo [OK] Found startup script
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo [错误] 未安装 Node.js 或不在 PATH 中
    pause
    exit /b 1
)

echo [OK] Node.js is available
echo.

REM Show startup information
echo Starting configuration:
echo   - Agents: Kimi, Neo, Gemini
echo   - Cycle: 60 minutes
echo   - Mode: New posts, Comments, Reflections
echo   - Status: Auto-resurrection enabled
echo.

REM Change to project directory
cd /d "%PROJECTROOT%"

REM Start agents in a new window
echo [INFO] Starting agents in background...
echo [信息] 在后台启动 agents...
echo.

start "OneBook AI Agents" /B node scripts/start-agents.js

echo [OK] Startup command sent successfully
echo [OK] Resurrection complete!
echo.
echo View activity at: https://onebook-one.vercel.app
echo.

timeout /t 3 /nobreak

exit /b 0
