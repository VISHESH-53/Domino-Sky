"""
SQLAlchemy Database Models and Engine for DOMINO SKY
Provides persistent storage for:
- Users & Authentication
- Refresh Tokens & Revocation
- Simulation Scenarios & Immutable Snapshots
- Audit Logs for Operations & Recovery Actions
"""

import os
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    event
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from pathlib import Path
import tempfile

DATA_DIR = Path(__file__).parent.parent / "data"

def _resolve_db_url() -> str:
    env_db = os.getenv("DATABASE_URL")
    if env_db:
        return env_db
    
    # In Vercel, AWS Lambda, or any environment where local data dir is read-only,
    # always use the OS temp directory (/tmp) which is guaranteed to be writable.
    is_serverless = bool(
        os.getenv("VERCEL") or 
        os.getenv("VERCEL_ENV") or 
        os.getenv("AWS_LAMBDA_FUNCTION_NAME") or 
        os.getenv("LAMBDA_TASK_ROOT")
    )
    
    if not is_serverless:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            test_file = DATA_DIR / ".write_test"
            test_file.touch()
            test_file.unlink()
            db_file = (DATA_DIR / "domino_sky.db").resolve().as_posix()
            return f"sqlite:///{db_file}"
        except (OSError, PermissionError):
            pass
            
    tmp_dir = Path(tempfile.gettempdir())
    db_file = (tmp_dir / "domino_sky.db").resolve().as_posix()
    return f"sqlite:///{db_file}"

DB_PATH = _resolve_db_url()

engine = create_engine(
    DB_PATH,
    connect_args={"check_same_thread": False} if "sqlite" in DB_PATH else {},
    echo=False
)

# Enable safe DELETE mode and foreign keys for SQLite
if "sqlite" in DB_PATH:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=DELETE;")
        except Exception:
            pass
        try:
            cursor.execute("PRAGMA foreign_keys=ON;")
        except Exception:
            pass
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_utc_now():
    return datetime.now(timezone.utc)

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="VIEWER") # ADMIN, DISPATCHER, ANALYST, VIEWER
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    mfa_secret = Column(String(64), nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    refresh_tokens = relationship("RefreshTokenModel", back_populates="user", cascade="all, delete-orphan")

class RefreshTokenModel(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    user = relationship("UserModel", back_populates="refresh_tokens")

class ScenarioModel(Base):
    __tablename__ = "scenarios"

    id = Column(String(64), primary_key=True, index=True)
    airport_code = Column(String(10), nullable=False)
    start_time = Column(String(10), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    disruption_type = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    is_baseline = Column(Boolean, default=False, nullable=False)
    
    # Immutable JSON snapshots of complete deterministic simulation results
    metrics_json = Column(Text, nullable=False)
    flights_json = Column(Text, nullable=False)
    connections_json = Column(Text, nullable=False)
    crew_json = Column(Text, nullable=False)
    timeline_json = Column(Text, nullable=False)
    airport_ranking_json = Column(Text, nullable=False)
    delay_distribution_json = Column(Text, nullable=False)

class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False) # LOGIN, INITIATE_DISRUPTION, PREVIEW_RECOVERY, APPLY_RECOVERY, RESET_NETWORK
    target_resource = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False) # SUCCESS, FAILURE, REJECTED
    ip_address = Column(String(64), nullable=True)
    details_json = Column(Text, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)
    # Self-healing migration for SQLite existing databases
    if "sqlite" in DB_PATH:
        try:
            with engine.connect() as conn:
                res = conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()
                existing_cols = {row[1] for row in res}
                new_cols = {
                    "failed_login_attempts": "INTEGER DEFAULT 0 NOT NULL",
                    "locked_until": "DATETIME",
                    "mfa_secret": "VARCHAR(64)",
                    "mfa_enabled": "BOOLEAN DEFAULT 0 NOT NULL"
                }
                for col, col_type in new_cols.items():
                    if col not in existing_cols:
                        conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
                conn.commit()
        except Exception:
            pass

# Auto-initialize tables safely
try:
    init_db()
except Exception as e:
    import logging
    logging.getLogger(__name__).warning("Initial init_db notice: %s", e)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
