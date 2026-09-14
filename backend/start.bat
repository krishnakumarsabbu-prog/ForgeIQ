@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

echo =========================================
echo        ForgeIQ Backend Server
echo =========================================

set "PORT=8001"
set "HOST=127.0.0.1"

if not "%~1"=="" set "PORT=%~1"

set "PYTHON_EXE="

if exist ".venv\Scripts\python.exe" set "PYTHON_EXE=.venv\Scripts\python.exe"
if "!PYTHON_EXE!"=="" if exist "venv\Scripts\python.exe" set "PYTHON_EXE=venv\Scripts\python.exe"

if "!PYTHON_EXE!"=="" (
    where python >nul 2>&1
    if !errorlevel! equ 0 set "PYTHON_EXE=python"
)

if "!PYTHON_EXE!"=="" (
    where py >nul 2>&1
    if !errorlevel! equ 0 set "PYTHON_EXE=py"
)

if "!PYTHON_EXE!"=="" (
    if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    )
)

if "!PYTHON_EXE!"=="" (
    echo [ERROR] Python was not found on your system!
    echo Please install Python 3.10+ or ensure it is added to your PATH.
    pause
    exit /b 1
)

echo [INFO] Python runner: !PYTHON_EXE!
echo [INFO] Starting ForgeIQ API server on http://!HOST!:!PORT!
echo [INFO] Interactive Docs (Swagger): http://!HOST!:!PORT!/docs
echo [INFO] Vite Frontend proxy configured for: http://127.0.0.1:!PORT!
echo [INFO] Press Ctrl+C to stop the server.
echo.

!PYTHON_EXE! -m uvicorn app.main:app --host !HOST! --port !PORT! --reload

if !errorlevel! neq 0 (
    echo.
    echo Server exited with code !errorlevel!.
    pause
)
