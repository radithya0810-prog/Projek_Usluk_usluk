@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start chrome --app=http://localhost:3000 --user-data-dir="%TEMP%\jawa-ai" --window-size=420,650 --window-position=1450,300"
node server.js