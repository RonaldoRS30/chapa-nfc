@echo off
title CHAPA - compartir sistema
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0compartir.ps1"
echo.
pause
