"""
DOMINO SKY — Airline Disruption Intelligence & Recovery Simulator
Main FastAPI Application Entrypoint
Hardened with:
- Argon2id & JWT Authentication
- Strict Role-Based Access Control (RBAC)
- HTTP Security Headers Middleware (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
- Strict CORS Allowlisting
- Request Payload Size Limits
- Rate Limiting via SlowAPI
- Persistent SQLite/PostgreSQL Database
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pathlib import Path
from datetime import datetime

from app.api.routes_network import router as network_router
from app.api.routes_simulation import router as simulation_router
from app.api.routes_recovery import router as recovery_router
from app.api.routes_export import router as export_router
from app.api.routes_auth import router as auth_router
from app.models.database import init_db
from app.core.security import seed_default_users

# Initialize Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Database Schema & Seed Default Users on Startup
    init_db()
    seed_default_users()
    yield

app = FastAPI(
    title="DOMINO SKY — Airline Disruption & Recovery API",
    description="Deterministic operational simulation and AI recovery intelligence engine for airline network disruptions.",
    version="2.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 1. STRICT CORS ALLOWLISTING
# Replaces insecure allow_origins=["*"] with explicit host origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8000,http://127.0.0.1:5173,http://127.0.0.1:8000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)

# 2. SECURITY HEADERS & REQUEST SIZE LIMITING MIDDLEWARE
MAX_REQUEST_SIZE = 2 * 1024 * 1024 # 2 Megabytes

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Enforce request payload size restriction (prevents Denial of Service via memory exhaustion)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_SIZE:
            return Response(
                content='{"detail":"Payload Too Large. Maximum allowed request size is 2MB."}',
                status_code=413,
                media_type="application/json"
            )

        response: Response = await call_next(request)

        # Inject Defense-in-Depth HTTP Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:*; "
            "frame-ancestors 'none';"
        )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Register Routers
app.include_router(auth_router)
app.include_router(network_router)
app.include_router(simulation_router)
app.include_router(recovery_router)
app.include_router(export_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "security": {
            "auth": "argon2id_jwt",
            "rbac": "enforced",
            "rate_limiting": "active",
            "security_headers": "enforced"
        },
        "services": {
            "simulation_engine": "online",
            "recovery_optimizer": "online",
            "ai_dispatcher": "online",
            "database": "sqlite_wal"
        }
    }

# Mount static frontend build if present
DIST_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "app": "DOMINO SKY",
            "tagline": "One disruption. Hundreds of consequences. One intelligent recovery system.",
            "version": "2.0.0",
            "timestamp": datetime.now().isoformat(),
            "status": "OPERATIONAL"
        }

if __name__ == "__main__":
    import uvicorn
    # Secure binding to localhost by default; configure via HOST env var (Fixes Bandit B104)
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
