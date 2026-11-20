@echo off
rem Creates the one admin account. The password is shown once, in this window only.
cd /d "%~dp0"
python tools\create_admin.py %*
echo.
pause
