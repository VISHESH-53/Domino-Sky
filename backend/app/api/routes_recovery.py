"""
Recovery API Routes for DOMINO SKY
Handles AI Dispatcher recommendations, strategy previews, and Before/After application.
Enforces Role-Based Access Control (RBAC) and candidate validation guardrails.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.schemas.schemas import (
    RecoveryRecommendation,
    RecoveryCandidate,
    RecoveryApplyRequest,
    RecoveryComparison,
    SimulationResult
)
from app.api.routes_simulation import (
    get_engine,
    get_dispatcher,
    get_optimizer,
    _sim_lock,
    save_scenario_to_db
)
from app.models.database import get_db
from app.core.security import UserRole
from app.core.dependencies import (
    get_current_user,
    require_role,
    log_audit_event
)

router = APIRouter(prefix="/api/recovery", tags=["Recovery"])

@router.post("/recommend", response_model=List[RecoveryRecommendation])
def get_recommendations(simulation_id: Optional[str] = None):
    """
    Invokes SKY-MIND Autonomous Recovery Intelligence.
    Analyzes the disrupted simulation and generates verified recovery strategies.
    Accessible to all users for advisory inspection.
    """
    engine = get_engine()
    dispatcher = get_dispatcher()
    
    sim = engine.get_simulation(simulation_id) if simulation_id else None
    if not sim:
        from app.api.routes_simulation import _latest_sim
        sim = _latest_sim

    return dispatcher.analyze_and_recommend(sim)

@router.post("/preview")
def preview_recovery(
    request: RecoveryApplyRequest,
    user=Depends(require_role([UserRole.ADMIN, UserRole.DISPATCHER, UserRole.ANALYST]))
):
    """
    Simulates a recovery strategy in a sandbox without altering the active simulation.
    Requires ADMIN, DISPATCHER, or ANALYST role.
    """
    engine = get_engine()
    optimizer = get_optimizer()

    base_sim = engine.get_simulation(request.simulation_id)
    if not base_sim:
        from app.api.routes_simulation import _latest_sim
        base_sim = _latest_sim

    candidates = optimizer.generate_candidates(base_sim)
    candidate = next((c for c in candidates if c.action_id == request.candidate_id), None)
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate {request.candidate_id} not found")

    preview_sim, comparison = optimizer.apply_recovery(base_sim, candidate)
    return {
        "candidate": candidate,
        "preview_metrics": preview_sim.metrics,
        "comparison": comparison
    }

@router.post("/apply", response_model=RecoveryComparison)
async def apply_recovery(
    apply_req: RecoveryApplyRequest,
    request: Request,
    user=Depends(require_role([UserRole.ADMIN, UserRole.DISPATCHER])),
    db: Session = Depends(get_db)
):
    """
    Applies the chosen recovery strategy and generates a new active simulation.
    Strictly requires ADMIN or DISPATCHER role with human approval.
    AI cannot directly call this endpoint; an explicit human operator must commit.
    Thread-safe concurrency locked.
    """
    engine = get_engine()
    optimizer = get_optimizer()
    import app.api.routes_simulation as sim_mod

    base_sim = engine.get_simulation(apply_req.simulation_id)
    if not base_sim:
        base_sim = sim_mod._latest_sim

    candidates = optimizer.generate_candidates(base_sim)
    candidate = next((c for c in candidates if c.action_id == apply_req.candidate_id), None)
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate '{apply_req.candidate_id}' not found or no longer feasible."
        )

    # Concurrency lock to prevent race conditions during recovery re-simulation
    async with _sim_lock:
        after_sim, comparison = optimizer.apply_recovery(base_sim, candidate)
        sim_mod._latest_sim = after_sim
        save_scenario_to_db(after_sim, db, user=user)

    log_audit_event(
        db, action="APPLY_RECOVERY",
        target_resource=candidate.action_id,
        status="SUCCESS", user=user, request=request,
        details={
            "action_type": candidate.action_type,
            "target_flight": candidate.target_flight_id,
            "delay_saved": candidate.estimated_delay_saved_minutes
        }
    )

    return comparison
