@echo off
chcp 65001 >nul 2>&1
title Deutsch App - Deploy

echo.
echo  ================================================
echo    Deutsch App - Deploy zu Vercel
echo  ================================================
echo.

cd /d "%~dp0"
echo  Ordner: %cd%
echo.

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  FEHLER: Git nicht gefunden.
    echo  Installieren: https://git-scm.com/download/win
    goto END
)
echo  Git: OK

if not exist ".git" (
    echo  FEHLER: Kein Git-Repository hier.
    echo  deploy.bat muss im deutsch-lernen-app Ordner liegen.
    goto END
)
echo  Repository: OK
echo.

echo  Geaenderte Dateien:
echo  --------------------
git status --short
echo.

set COMMIT_MSG=Update
set /p COMMIT_MSG="Beschreibung (Enter fuer 'Update'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update
echo.

echo  Fuege Dateien hinzu...
git add -A

echo  Erstelle Commit...
git commit -m "%COMMIT_MSG%"

echo  Pushe zu GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo  FEHLER beim Push! Internetverbindung pruefen.
    goto END
)

echo.
echo  ================================================
echo    Fertig! Vercel deployed in ca. 30 Sekunden.
echo    App: https://deutsch-lernen-app.vercel.app
echo  ================================================

:END
echo.
echo  Druecke eine Taste zum Schliessen...
pause >nul
