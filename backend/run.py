import sys
import uvicorn

if __name__ == "__main__":
    port = 8001
    host = "127.0.0.1"

    # Simple command line argument parsing for --port and --host
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg in ("--port", "-p") and i + 1 < len(args):
            port = int(args[i + 1])
        elif arg in ("--host", "-h") and i + 1 < len(args):
            host = args[i + 1]

    print("=" * 45)
    print("       ForgeIQ Backend Server")
    print("=" * 45)
    print(f"API Server:            http://{host}:{port}")
    print(f"Interactive API Docs:  http://{host}:{port}/docs")
    print("Press Ctrl+C to stop.")
    print("=" * 45)

    uvicorn.run("app.main:app", host=host, port=port, reload=True)
