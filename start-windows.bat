@echo off
rem Double-click to start the resume builder. Keep this window open while you use the page.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev
pause
