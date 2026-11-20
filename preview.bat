@echo off
rem Double-click this file to see the website on this computer before publishing.
cd /d "%~dp0"
echo LumaDesign preview is running at http://localhost:8124
echo Keep this window open while you look at the site. Close it when you are finished.
start "" http://localhost:8124
python -m http.server 8124 --bind 127.0.0.1
