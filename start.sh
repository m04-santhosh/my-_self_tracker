#!/usr/bin/env bash
set -e

echo "========================================================"
echo "Starting LifeOS 90 (Backend & Frontend)"
echo "========================================================"
echo ""
echo "NOTE: Two-terminal alternative:"
echo "  Terminal 1: .venv/bin/uvicorn app.main:app --app-dir backend --reload --port 8000"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""

# Trap exit to cleanup background jobs
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

# Start backend
if [ -f ".venv/bin/uvicorn" ]; then
    .venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload &
elif [ -f ".venv/Scripts/uvicorn.exe" ]; then
    .venv/Scripts/uvicorn.exe app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload &
else
    uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload &
fi

# Start frontend
cd frontend
npm run dev -- --host &

wait
