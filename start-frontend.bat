@echo off
echo ============================================
echo   Rent Collection System - Frontend Setup
echo ============================================

cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo.
echo Starting Next.js dev server on http://localhost:3000
npm run dev
