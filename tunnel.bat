@echo off
echo ========================================================
echo   LifeOS 90 — Free Cloudflare Mobile Tunnel Starter
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Building frontend production bundle...
cd frontend
call npm run build
cd ..

echo.
echo [2/3] Starting Unified LifeOS 90 server on port 8000...
start "LifeOS 90 Server" cmd /k "cd /d "%~dp0backend" && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting Cloudflare Tunnel...
echo (If cloudflared is not installed, install with: winget install Cloudflare.cloudflared)
echo.
cloudflared tunnel --url http://localhost:8000

pause
