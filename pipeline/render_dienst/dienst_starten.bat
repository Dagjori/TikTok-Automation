@echo off
rem Startet den Render-Dienst. Nach einem Update des Dienstes (Exit-Code 75) startet er sich selbst neu.
rem Doppelklick zum Testen. Autostart: Windows-Aufgabenplanung (docs/18-render-pc.md, Schritt 8).
chcp 65001 >nul
cd /d "%~dp0"
title Render-Dienst
set "PY=python"
where py >nul 2>nul && set "PY=py -3"
:schleife
%PY% -u dienst.py %*
if errorlevel 75 if not errorlevel 76 (
  echo Der Render-Dienst wurde aktualisiert und startet neu ...
  timeout /t 5 /nobreak >nul
  goto schleife
)
echo.
echo Der Render-Dienst wurde beendet. Eine Taste druecken, um das Fenster zu schliessen.
pause >nul
