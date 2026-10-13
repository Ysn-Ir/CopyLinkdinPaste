@echo off
title PFE Hunter Career Command Center Launcher
echo ==============================================================================
echo    PFE Hunter - Career Command Center
echo    FastAPI (Port 8003) + PostgreSQL (Port 5432) + Vite Frontend (Port 5174)
echo ==============================================================================
echo.

echo [1/2] Launching FastAPI Backend on 0.0.0.0:8003...
start "FastAPI Backend (8003)" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8003 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite Frontend on 0.0.0.0:5174...
start "Vite Frontend (5174)" cmd /k "npm run dev"

echo.
echo ==============================================================================
echo   Applications started successfully!
echo   Desktop Local:    http://localhost:5174
echo   Android / LAN:    http://192.168.1.12:5174
echo   FastAPI Swagger:  http://localhost:8003/docs
echo ==============================================================================
