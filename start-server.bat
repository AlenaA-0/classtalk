@echo off
cd /d "%~dp0"
echo 正在启动课通服务器...
echo.

REM 检查node是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    call npm install
)

REM 停止可能运行的旧进程
taskkill /F /IM node.exe >nul 2>&1

REM 启动服务器
echo ✅ 启动服务器...
node server.js

pause
