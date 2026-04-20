@echo off
chcp 65001 >nul
setlocal

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

:: 检查 .env
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [警告] 已从 .env.example 创建 .env，请先编辑配置后重新运行
        pause
        exit /b 1
    ) else (
        echo [错误] 未找到 .env 文件
        pause
        exit /b 1
    )
)

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js ^>= 18
    pause
    exit /b 1
)

:: 检查 dist 目录，不存在则构建
if not exist "dist\index.html" (
    echo [构建] dist 目录不存在，开始构建前端...
    where pnpm >nul 2>&1
    if not errorlevel 1 (
        pnpm install && pnpm build
    ) else (
        npm install && npm run build
    )
    echo [构建] 完成
)

:: 停止已有进程
if exist "server.pid" (
    set /p OLD_PID=<server.pid
    taskkill /PID %OLD_PID% /F >nul 2>&1
    del /f "server.pid" >nul 2>&1
)

:: 创建日志目录
if not exist "logs" mkdir logs

:: 启动后端服务
echo [启动] 后端服务...
start /b node server.js >> logs\server.log 2>&1

:: 获取 PID（通过 wmic 查找）
timeout /t 2 >nul
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo list ^| findstr "PID"') do (
    set SERVER_PID=%%i
    goto :found
)

:found
echo %SERVER_PID% > server.pid

:: 读取端口
set PORT=3000
for /f "tokens=2 delims==" %%a in ('findstr /b "PUBLIC_PORT=" .env') do set PORT=%%a

echo.
echo =========================================
echo  启动成功
echo =========================================
echo  PID:      %SERVER_PID%
echo  访问地址: http://localhost:%PORT%/
echo  日志目录: %SCRIPT_DIR%logs\
echo.
echo  实时查看日志:
echo    type logs\server.log
echo.
echo  停止服务:
echo    stop.bat  或  taskkill /PID %SERVER_PID% /F
echo =========================================

endlocal
