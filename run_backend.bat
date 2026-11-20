@echo off
echo ========================================================
echo   DOMINO SKY - Airline Disruption & Recovery Simulator
echo   Starting Unified Application Server on http://localhost:8000
echo ========================================================
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
pause
