@echo off
title Furqan Cloud Remote Access - Server
cd /d "%~dp0server"
if not exist node_modules call npm install
node server.js
pause
