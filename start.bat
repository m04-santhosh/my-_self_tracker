@echo off
echo ========================================================
echo Starting LifeOS 90 (Backend & Frontend)
echo ========================================================
echo.
echo NOTE: To use on your mobile phone, connect your phone to the same Wi-Fi
echo and open the Network URL shown in the Frontend window!
echo.

start "LifeOS 90 Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload"
start "LifeOS 90 Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev -- --host"

echo Both services launched in separate windows!
echo Backend:  http://localhost:8000 (bind 0.0.0.0)
echo Frontend: http://localhost:5173 (bind 0.0.0.0)
echo Check the Frontend terminal window for your local Network IP!
echo ========================================================
