"""
FastAPI Dependencies & RBAC Enforcement for DOMINO SKY
Provides:
- Current user extraction from JWT Bearer header
- Role-Based Access Control (RBAC) guards
- Audit trail logging
- Optional authentication for public observer mode
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.models.database import get_db, UserModel, AuditLogModel
from app.core.security import decode_token, UserRole, ROLE_HIERARCHY

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> UserModel:
    """
    Strict dependency: Requires a valid JWT access token.
    Raises 401 Unauthorized if missing, expired, or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[UserModel]:
    """
    Permissive dependency: Returns authenticated user if valid token present,
    or None if anonymous.
    """
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None

def require_role(allowed_roles: List[UserRole]):
    """
    Role-Based Access Control (RBAC) guard factory.
    Enforces that current user belongs to one of allowed_roles.
    """
    def role_checker(user: UserModel = Depends(get_current_user)) -> UserModel:
        user_role_enum = UserRole(user.role) if user.role in [r.value for r in UserRole] else UserRole.VIEWER
        if user_role_enum not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Access denied for role '{user.role}'. Required: {[r.value for r in allowed_roles]}."
            )
        return user
    return role_checker

def log_audit_event(
    db: Session,
    action: str,
    target_resource: str,
    status: str = "SUCCESS",
    user: Optional[UserModel] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None
):
    """Writes an immutable record into audit_logs table."""
    ip_addr = request.client.host if request and request.client else None
    log_entry = AuditLogModel(
        user_id=user.id if user else None,
        user_email=user.email if user else "anonymous",
        user_role=user.role if user else "ANONYMOUS",
        action=action,
        target_resource=target_resource,
        status=status,
        ip_address=ip_addr,
        details_json=json.dumps(details) if details else None
    )
    db.add(log_entry)
    db.commit()
