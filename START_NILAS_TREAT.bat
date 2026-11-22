@echo off
title Nila's Treat — Bakery Server & Public Live Tunnel
color 0A

echo ========================================================
echo        NILA'S TREAT BAKERY — LIVE SYSTEM LAUNCHER
echo ========================================================
echo.
echo [1/3] Starting Local Next.js Server on port 3000...
cd /d "%~dp0"
start "Nila's Treat Next.js Server" cmd /k "npm run dev"

echo [2/3] Waiting 4 seconds for server initialization...
timeout /t 4 /nobreak >nul

echo [3/3] Starting Public Cloudflare Live Tunnel...
if exist "%~dp0..\cloudflared.exe" (
    start "Cloudflare Live Tunnel" cmd /k ""%~dp0..\cloudflared.exe" tunnel --url http://localhost:3000"
) else if exist "cloudflared.exe" (
    start "Cloudflare Live Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:3000"
) else (
    echo Cloudflared executable not found.
)

echo.
echo ========================================================
echo  LIVE ACCESS LINKS:
echo  - Local PC Browser:   http://localhost:3000
echo  - Worldwide Client:   Check Cloudflare Tunnel Window!
echo ========================================================
echo.
pause
