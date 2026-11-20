"""
DOMINO SKY — FastAPI Backend Entrypoint for Vercel Services
Exposes the FastAPI 'app' instance with diagnostic fallback.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from app.main import app
except Exception as e:
    import traceback
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_trace = traceback.format_exc()
    print("BACKEND INITIALIZATION ERROR:\n", err_trace)

    app = FastAPI(title="DOMINO SKY — Diagnostic Fallback")

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all_error(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "FastAPI Initialization Failed on Vercel",
                "details": str(e),
                "traceback": err_trace
            }
        )
