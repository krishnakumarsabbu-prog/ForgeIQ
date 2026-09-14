#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=${1:-8001}
HOST="127.0.0.1"

if [ -f ".venv/bin/python" ]; then
    PYTHON_EXE=".venv/bin/python"
elif [ -f "venv/bin/python" ]; then
    PYTHON_EXE="venv/bin/python"
elif command -v python3 &> /dev/null; then
    PYTHON_EXE="python3"
elif command -v python &> /dev/null; then
    PYTHON_EXE="python"
elif command -v py &> /dev/null; then
    PYTHON_EXE="py"
else
    echo "[ERROR] Python was not found on your system!"
    exit 1
fi

echo "========================================="
echo "       ForgeIQ Backend Server"
echo "========================================="
echo "Starting ForgeIQ API server on http://${HOST}:${PORT}"
echo "Interactive Docs (Swagger): http://${HOST}:${PORT}/docs"
echo "Press Ctrl+C to stop."
echo ""

$PYTHON_EXE -m uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
