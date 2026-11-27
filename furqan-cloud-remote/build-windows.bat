@echo off
title Build Furqan Cloud Remote Access - Windows Installer
setlocal
cd /d "%~dp0app"

echo ================================================
echo   Furqan Cloud Remote Access - Windows EXE Build
echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install the current Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

node --version
npm --version
echo.
echo [1/2] Installing app dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo ERROR: npm install failed. Check your internet connection and npm error above.
  pause
  exit /b 1
)

echo.
echo [2/2] Building 64-bit Windows NSIS installer...
call npm run dist
if errorlevel 1 (
  echo ERROR: Windows installer build failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo ================================================
echo BUILD SUCCESSFUL
echo Installer location: %CD%\dist
echo ================================================
start "" "%CD%\dist"
pause
