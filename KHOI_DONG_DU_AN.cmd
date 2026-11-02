@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if exist "%USERPROFILE%\Documents\Codex\tools\node-v24.21.0-win-x64\node.exe" (
  set "SFS_NODE=%USERPROFILE%\Documents\Codex\tools\node-v24.21.0-win-x64\node.exe"
) else (
  set "SFS_NODE=node"
  where node >nul 2>nul
  if errorlevel 1 (
    echo Chưa tìm thấy Node.js. Cần cài Node.js 24 theo README trước khi mở dự án.
    pause
    exit /b 1
  )
)
"%SFS_NODE%" "%~dp0scripts\start-local.mjs"
set "SFS_RESULT=%ERRORLEVEL%"
echo.
if not "%SFS_RESULT%"=="0" echo Dự án chưa khởi động xong. Đọc thông báo phía trên để biết bước cần xử lý.
pause
exit /b %SFS_RESULT%
