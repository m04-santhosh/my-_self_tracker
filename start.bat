@echo off
echo ========================================================
echo Starting LifeOS 90 (Backend & Frontend)
echo ========================================================
echo.
echo NOTE: You can also run in two separate terminals:
echo Terminal 1: .venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
echo Terminal 2: cd frontend && npm run dev
echo.

start "LifeOS 90 Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000"
start "LifeOS 90 Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo Both services launched in separate windows!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo ========================================================
