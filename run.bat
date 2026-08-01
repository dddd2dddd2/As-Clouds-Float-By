@echo off
title As Clouds Float By - Local Dev Server

echo ===================================
echo   YunFuJi Local Build ^& Server
echo ===================================
echo.

echo [1/3] Scanning poems and images...
set PYTHONUTF8=1
python build_index.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed. Please check the python script output.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Opening browser...
start http://127.0.0.1:8000

echo.
echo [3/3] Starting local server on port 8000...
echo ===================================
echo Server is running... Close this window to stop.
echo ===================================
python -m http.server 8000 --bind 127.0.0.1
