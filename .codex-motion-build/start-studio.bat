@echo off
title AI Video Studio ^& Marketing Automation Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-studio.ps1"
pause
