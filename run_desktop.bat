@echo off
title RADAR Desktop Workstation
echo Launching RADAR Enterprise Desktop Workstation...
cd /d "%~dp0"
start "" npx electron desktop/main.cjs
exit
