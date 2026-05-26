@echo off
title Reconstruir Entorno Local y Crear Super Admin
cd /d "%~dp0"
echo Iniciando script de reconstruccion...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rebuild-local.ps1"
echo.
echo Presiona cualquier tecla para salir...
pause > nul
