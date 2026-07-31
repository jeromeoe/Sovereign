@echo off
setlocal
title Sovereign
cd /d "%~dp0"
cls

echo.
echo   SOVEREIGN
echo   Preparing your private study connection...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo   Sovereign needs Node.js once before it can start.
  echo   We are opening the official download page for you.
  echo.
  start "" "https://nodejs.org/en/download"
  echo   Install Node.js, then double-click "Start Sovereign.cmd" again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\@openai\codex\bin\codex.js" (
  echo   First-time setup. This can take a few minutes...
  echo.
  call npm.cmd install
  if errorlevel 1 goto :failed
)

call npx.cmd codex login status >nul 2>&1
if errorlevel 1 (
  echo   One-time Codex sign in required.
  echo   Follow the instructions that appear next.
  echo.
  call npx.cmd codex login
  if errorlevel 1 goto :failed
  cls
)

echo.
echo   Starting Sovereign...
echo.
call npm.cmd run bridge
exit /b %errorlevel%

:failed
echo.
echo   Sovereign could not finish setup.
echo   Check your internet connection, then double-click this file again.
echo.
pause
exit /b 1
