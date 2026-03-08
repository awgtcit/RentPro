@echo off
echo ============================================
echo   Rent Collection System - Backend Setup
echo ============================================

cd /d "%~dp0backend"

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt

if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env
    echo Please edit .env with your database URL and JWT secrets.
)

echo.
echo Seeding database...
python seed.py

echo.
echo Starting Flask server on http://localhost:5000
python app.py
