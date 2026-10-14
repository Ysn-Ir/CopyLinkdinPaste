@echo off
title OmniHunt Career Command Center
cls
echo ==============================================================================
echo    🦅 OmniHunt • Multi-Platform Career Intelligence Suite
echo ==============================================================================
echo.
echo  Choose how you want to run OmniHunt:
echo.
echo    [1] Run in Background (Silent, NO open terminal windows)
echo    [2] Run with Docker (1-Command: docker compose up -d)
echo    [3] Run Dev Mode (FastAPI + Vite in visible terminals)
echo    [4] Stop all running background servers
echo    [5] Open Web Command Center in Browser (http://localhost:8003)
echo.
echo ==============================================================================
set /p choice="Enter your choice (1-5, default is 1): "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto BACKGROUND
if "%choice%"=="2" goto DOCKER
if "%choice%"=="3" goto DEV
if "%choice%"=="4" goto STOP
if "%choice%"=="5" goto BROWSER

:BACKGROUND
echo.
echo Starting OmniHunt in the background...
wscript.exe start_background.vbs
echo.
echo Server active on http://localhost:8003
echo You can safely close this terminal window!
timeout /t 3 >nul
exit

:DOCKER
echo.
echo Launching OmniHunt with Docker Compose...
docker compose up -d --build
echo.
echo Docker containers are running in the background:
echo • Web Frontend: http://localhost:5174
echo • Unified API & App: http://localhost:8003
echo • Mobile / LAN: http://localhost:8003
timeout /t 5 >nul
exit

:DEV
echo.
echo [1/2] Launching FastAPI Backend on 0.0.0.0:8003...
start "FastAPI Backend (8003)" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8003 --reload"
timeout /t 2 /nobreak >nul
echo [2/2] Launching Vite Frontend on 0.0.0.0:5174...
start "Vite Frontend (5174)" cmd /k "npm run dev"
echo.
echo Dev servers launched.
exit

:STOP
call stop_background.bat
exit

:BROWSER
start http://localhost:8003
exit
