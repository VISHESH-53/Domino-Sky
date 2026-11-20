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
if os.getenv("VERCEL"):
    tmp_dir = Path(tempfile.gettempdir())
    db_file = (tmp_dir / "domino_sky.db").resolve().as_posix()
    DB_PATH = os.getenv("DATABASE_URL", f"sqlite:///{db_file}")
else:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db_file = (DATA_DIR / "domino_sky.db").resolve().as_posix()
    DB_PATH = os.getenv("DATABASE_URL", f"sqlite:///{db_file}")

engine = create_engine(
    DB_PATH,
    connect_args={"check_same_thread": False} if "sqlite" in DB_PATH else {},
    echo=False
)

# Enable WAL mode and foreign keys for SQLite
if "sqlite" in DB_PATH:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        if not os.getenv("VERCEL"):
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                pass
        cursor.execute("PRAGMA foreign_keys=ON;")
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

# Auto-initialize tables
init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
