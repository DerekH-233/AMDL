@echo off
chcp 65001 >nul
title AMDL - Apple Music Downloader
set PYTHONUTF8=1
echo.
echo   AMDL v1.0.4
echo   Apple Music Downloader
echo.
echo   首次使用请确保已准备好 cookies.txt
echo.
start "" "%~dp0AMDL.exe"
