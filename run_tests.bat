@echo off
echo ========================================================
echo   DOMINO SKY - Automated Test Suite
echo ========================================================
set PYTHONPATH=%cd%\backend
python -m pytest backend/tests/ -v
pause
