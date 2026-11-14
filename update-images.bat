@echo off
rem Double-click this file after putting new photos in the "new-images" folder.
cd /d "%~dp0"
python tools\update_images.py
echo.
pause
