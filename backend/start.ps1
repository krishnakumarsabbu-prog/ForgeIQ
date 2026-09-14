<#
.SYNOPSIS
    Starts the ForgeIQ FastAPI backend server with Uvicorn.
.DESCRIPTION
    Detects the Python runtime (virtualenv, python, or py launcher),
    ensures dependencies are available, and starts Uvicorn on port 8001
    with hot-reloading enabled.
.PARAMETER Port
    Port to bind the server on. Default: 8001 (matching frontend Vite proxy).
.PARAMETER HostAddress
    Host interface to bind on. Default: 127.0.0.1.
.PARAMETER NoReload
    Disable auto-reload on code changes.
.PARAMETER Install
    Force installing dependencies from requirements.txt before starting.
#>
param (
    [int]$Port = 8001,
    [string]$HostAddress = "127.0.0.1",
    [switch]$NoReload,
    [switch]$Install
)

$ErrorActionPreference = "Stop"

# Ensure working directory is the backend folder
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendDir

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       ForgeIQ Backend Server            " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Detect Python executable
$PythonCmd = $null

if (Test-Path "$BackendDir\.venv\Scripts\python.exe") {
    $PythonCmd = "$BackendDir\.venv\Scripts\python.exe"
    Write-Host "[OK] Using virtual environment (.venv)" -ForegroundColor Green
} elseif (Test-Path "$BackendDir\venv\Scripts\python.exe") {
    $PythonCmd = "$BackendDir\venv\Scripts\python.exe"
    Write-Host "[OK] Using virtual environment (venv)" -ForegroundColor Green
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonCmd = "python"
} elseif (Get-Command "py" -ErrorAction SilentlyContinue) {
    $PythonCmd = "py"
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe") {
    $PythonCmd = "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe"
}

if (-not $PythonCmd) {
    Write-Host "[ERROR] Python was not found on your system!" -ForegroundColor Red
    Write-Host "Please install Python 3.10+ from https://www.python.org/ or ensure it is added to your PATH." -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Python runner: $PythonCmd" -ForegroundColor Gray

# 2. Check dependencies
$depsCheck = & $PythonCmd -c "import uvicorn, fastapi, pydantic" 2>&1
if ($LASTEXITCODE -ne 0 -or $Install) {
    Write-Host "[INFO] Installing/verifying backend dependencies from requirements.txt..." -ForegroundColor Yellow
    & $PythonCmd -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

# 3. Launch Uvicorn
$cmdArgs = @("-m", "uvicorn", "app.main:app", "--host", $HostAddress, "--port", "$Port")
if (-not $NoReload) {
    $cmdArgs += "--reload"
}

Write-Host ""
Write-Host "Starting ForgeIQ API server on http://${HostAddress}:${Port}" -ForegroundColor Green
Write-Host "Interactive Docs (Swagger): http://${HostAddress}:${Port}/docs" -ForegroundColor Cyan
Write-Host "Vite Frontend proxy configured for: http://127.0.0.1:${Port}" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

& $PythonCmd $cmdArgs

