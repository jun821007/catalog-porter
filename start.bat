@echo off
cd /d "%~dp0"
set PORT=3001
node backend/server.js
pause
