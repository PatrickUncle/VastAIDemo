@echo off
chcp 65001 >nul

set KILLED=0

:: 优先用 server.pid
if exist "server.pid" (
    set /p PID=<server.pid
    if defined PID (
        taskkill /PID %PID% /F >nul 2>&1
        if not errorlevel 1 (
            echo [停止] 已终止进程 PID=%PID%
            set KILLED=1
        )
    )
    del /f "server.pid" >nul 2>&1
)

:: 读取端口，按端口查找并杀掉占用进程
set PORT=3000
for /f "tokens=2 delims==" %%a in ('findstr /b "PUBLIC_PORT=" .env 2^>nul') do set PORT=%%a
for /f "tokens=2 delims==" %%a in ('findstr /b "PORT=" .env 2^>nul') do if "!PORT!"=="3000" set PORT=%%a

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if "%%p" NEQ "0" (
        taskkill /PID %%p /F >nul 2>&1
        if not errorlevel 1 (
            echo [停止] 已终止占用端口 %PORT% 的进程 PID=%%p
            set KILLED=1
        )
    )
)

if "%KILLED%"=="0" (
    echo [提示] 未找到运行中的服务进程
) else (
    echo [完成] 服务已停止
)
