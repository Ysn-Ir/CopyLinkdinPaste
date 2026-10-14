@echo off
title OmniHunt Background Process Terminator
echo ==============================================================================
echo    OmniHunt - Stopping Background Services
echo ==============================================================================
echo.

echo Searching for processes on port 8003...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8003 ^| findstr LISTENING') do (
    echo Terminating PID: %%a...
    taskkill /PID %%a /F /T >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING') do (
    echo Terminating Vite Dev Server PID: %%a...
    taskkill /PID %%a /F /T >nul 2>&1
)

echo.
echo All OmniHunt background services stopped successfully.
timeout /t 3 >nul
