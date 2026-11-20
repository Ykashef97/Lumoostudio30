@echo off
rem Sets up or updates the LumaDesign database in Supabase. Fill in .env first (see docs\ADMIN-SETUP.md).
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo Preparing a private Python environment. This happens once and needs internet...
  python -m venv .venv || goto :error
  .venv\Scripts\python.exe -m pip install --quiet --disable-pip-version-check "psycopg[binary]==3.2.3" || goto :error
)
.venv\Scripts\python.exe tools\setup_backend.py %*
echo.
pause
exit /b
:error
echo.
echo Setup could not prepare Python. Check that Python is installed and you are online.
pause
