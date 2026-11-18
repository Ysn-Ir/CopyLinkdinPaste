@echo off
title RADAR Desktop Companion
echo Starting RADAR Desktop Companion...
cd /d "%~dp0"
start "" pythonw radar_desktop.py
exit

