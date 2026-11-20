@echo off
rem Saves a backup of the LumaDesign database (requests, content, settings) and uploaded photos
rem into the backups folder on this computer. Needs the .env file (see docs\ADMIN-SETUP.md).
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo Preparing a private Python environment. This happens once and needs internet...
  python -m venv .venv || goto :error
  .venv\Scripts\python.exe -m pip install --quiet --disable-pip-version-check "psycopg[binary]==3.2.3" || goto :error
)
.venv\Scripts\python.exe tools\backup_database.py %*
echo.
pause
exit /b
:error
echo.
echo The backup could not prepare Python. Check that Python is installed and you are online.
pause
