@echo off
title CHAPA — servidor local
cd /d "%~dp0"
echo.
echo  CHAPA — servidor en esta PC
echo  Deja esta ventana abierta. Ctrl+C para detener.
echo.
node servidor.mjs
pause
