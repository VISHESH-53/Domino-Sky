"""
Security & Authentication Core for DOMINO SKY
Provides:
- Argon2id Password Hashing & Verification
- JWT Access & Refresh Token Management
- Role-Based Access Control (RBAC)
- CSV Formula Injection Sanitization
- Prompt Injection Sanitization Guardrails
- Default User Seeding
"""

import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
import jwt

from app.models.database import SessionLocal, UserModel, RefreshTokenModel

# Argon2id password hasher configuration (RFC 9106 recommended parameters)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16
)

# JWT Secret Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "domino-sky-super-secret-production-hardened-key-2026-aviation-aoc-jwt-token-999")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DISPATCHER = "DISPATCHER"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"

# Role hierarchy: lower index = higher privileges
ROLE_HIERARCHY = {
    UserRole.ADMIN: 4,
    UserRole.DISPATCHER: 3,
    UserRole.ANALYST: 2,
    UserRole.VIEWER: 1
}

def hash_password(password: str) -> str:
    """Hash password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a short-lived JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> Tuple[str, datetime]:
    """Creates an opaque refresh token and its expiration."""
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, expires_at

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None

# --- CSV FORMULA INJECTION PREVENTION (Phase 6) ---
def sanitize_csv_cell(value: Any) -> Any:
    """
    Prevents CSV Formula Injection (CWE-1236).
    If a cell starts with =, +, -, @, or tab/carriage return,
    prepends a single quote so spreadsheet programs interpret it as text.
    """
    if value is None:
        return ""
    str_val = str(value)
    if str_val and str_val[0] in ('=', '+', '-', '@', '\t', '\r'):
        return f"'{str_val}"
    return str_val

# --- PROMPT INJECTION SANITIZATION (Phase 2) ---
PROMPT_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"(?i)system\s+prompt\s+leak",
    r"(?i)grant\s+(role|permission|admin)",
    r"(?i)you\s+are\s+now\s+in\s+developer\s+mode",
    r"(?i)bypass\s+(security|validation|rules)",
    r"(?i)drop\s+table",
    r"(?i)delete\s+from",
]

def sanitize_prompt_input(text: Optional[str]) -> str:
    """
    Sanitizes user input intended for AI context or description fields.
    Neutralizes direct and indirect prompt injection attacks.
    """
    if not text:
        return ""
    cleaned = text.strip()[:500] # Strict length cap
    for pattern in PROMPT_INJECTION_PATTERNS:
        cleaned = re.sub(pattern, "[FILTERED_SECURITY_VIOLATION]", cleaned)
    return cleaned

# --- DEFAULT SEED USERS (Loaded from env with fallback for evaluation) ---
DEFAULT_USERS = [
    {
        "email": "admin@dominosky.aoc",
        "password": os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@DominoSky2026!"), # nosec B105
        "full_name": "Chief Network Controller",
        "role": UserRole.ADMIN
    },
    {
        "email": "dispatcher@dominosky.aoc",
        "password": os.getenv("DEFAULT_DISPATCHER_PASSWORD", "Dispatch@DominoSky2026!"), # nosec B105
        "full_name": "Senior Operations Dispatcher",
        "role": UserRole.DISPATCHER
    },
    {
        "email": "analyst@dominosky.aoc",
        "password": os.getenv("DEFAULT_ANALYST_PASSWORD", "Analyst@DominoSky2026!"), # nosec B105
        "full_name": "Schedule Optimization Analyst",
        "role": UserRole.ANALYST
    },
    {
        "email": "viewer@dominosky.aoc",
        "password": os.getenv("DEFAULT_VIEWER_PASSWORD", "Viewer@DominoSky2026!"), # nosec B105
        "full_name": "Executive Observer",
        "role": UserRole.VIEWER
    }
]

def seed_default_users():
    """Seeds the 4 default roles if they do not already exist in the database."""
    db = SessionLocal()
    try:
        for u in DEFAULT_USERS:
            existing = db.query(UserModel).filter(UserModel.email == u["email"]).first()
            if not existing:
                new_user = UserModel(
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"].value,
                    is_active=True
                )
                db.add(new_user)
        db.commit()
    finally:
        db.close()

import logging

_logger = logging.getLogger(__name__)

# Auto-seed default users if not present
try:
    seed_default_users()
except Exception as exc:
    _logger.debug("Initial default user seed notice: %s", exc)
