"""
Simulation API Routes for DOMINO SKY
Handles running disruption simulations, persistent scenario storage, flight details, and history.
Enforces Role-Based Access Control (RBAC) and concurrency locking.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import asyncio
import json

from app.schemas.schemas import (
    DisruptionInput,
    SimulationResult,
    FlightSimulated
)
from app.services.simulation_engine import SimulationEngine
from app.services.ai_dispatcher import AIDispatcher
from app.services.recovery_optimizer import RecoveryOptimizer
from app.models.database import get_db, ScenarioModel
from app.core.security import UserRole, sanitize_prompt_input
from app.core.dependencies import (
    get_current_user,
    get_optional_current_user,
    require_role,
    log_audit_event
)

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

# Global singleton instances
_engine = SimulationEngine()
_optimizer = RecoveryOptimizer(_engine)
_dispatcher = AIDispatcher(_optimizer)

# Global concurrency lock to guarantee atomic simulation updates
_sim_lock = asyncio.Lock()

# Initialize baseline on module load
_baseline_sim = _engine.run_simulation(None, simulation_id="baseline")
_latest_sim = _baseline_sim

def get_engine():
    return _engine

def get_dispatcher():
    return _dispatcher

def get_optimizer():
    return _optimizer

def save_scenario_to_db(sim_res: SimulationResult, db: Session, user=None):
    """Persists an immutable simulation snapshot into SQLAlchemy ScenarioModel."""
    try:
        scenario = ScenarioModel(
            id=sim_res.simulation_id,
            airport_code=sim_res.disruption.airport_code,
            start_time=sim_res.disruption.start_time,
            duration_minutes=sim_res.disruption.duration_minutes,
            disruption_type=sim_res.disruption.disruption_type,
            description=sim_res.disruption.description,
            user_id=user.id if user else None,
            user_email=user.email if user else "anonymous",
            user_role=user.role if user else "ANONYMOUS",
            is_baseline=sim_res.is_baseline,
            metrics_json=sim_res.metrics.model_dump_json(),
            flights_json=json.dumps([f.model_dump() for f in sim_res.flights]),
            connections_json=json.dumps([c.model_dump() for c in sim_res.connections]),
            crew_json=json.dumps([cr.model_dump() for cr in sim_res.crew_status]),
            timeline_json=json.dumps([t.model_dump() for t in sim_res.timeline]),
            airport_ranking_json=json.dumps(sim_res.airport_disruption_ranking),
            delay_distribution_json=json.dumps(sim_res.delay_distribution)
        )
        db.merge(scenario)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to persist scenario snapshot to DB: {e}")

@router.post("/run", response_model=SimulationResult)
async def run_simulation(
    disruption: DisruptionInput,
    request: Request,
    user=Depends(require_role([UserRole.ADMIN, UserRole.DISPATCHER])),
    db: Session = Depends(get_db)
):
    """
    Executes a deterministic disruption simulation across the 16-airport network.
    Restricted to ADMIN and DISPATCHER roles.
    Thread-safe concurrency locked.
    """
    global _latest_sim
    # Sanitize input against prompt injection
    if disruption.description:
        disruption.description = sanitize_prompt_input(disruption.description)

    async with _sim_lock:
        sim_result = _engine.run_simulation(disruption)
        _latest_sim = sim_result
        save_scenario_to_db(sim_result, db, user=user)

    log_audit_event(
        db, action="INITIATE_DISRUPTION",
        target_resource=f"{disruption.airport_code}:{disruption.duration_minutes}m",
        status="SUCCESS", user=user, request=request,
        details={"type": disruption.disruption_type, "start": disruption.start_time}
    )

    return sim_result

@router.post("/reset", response_model=SimulationResult)
async def reset_to_baseline(
    request: Request,
    user=Depends(require_role([UserRole.ADMIN, UserRole.DISPATCHER])),
    db: Session = Depends(get_db)
):
    """
    Resets network to baseline on-time schedule.
    Restricted to ADMIN and DISPATCHER roles.
    """
    global _latest_sim
    async with _sim_lock:
        baseline = _engine.run_simulation(None, simulation_id="baseline")
        _latest_sim = baseline
        save_scenario_to_db(baseline, db, user=user)

    log_audit_event(
        db, action="RESET_NETWORK", target_resource="BASELINE",
        status="SUCCESS", user=user, request=request
    )

    return baseline

@router.get("/latest", response_model=SimulationResult)
def get_latest_simulation():
    """Returns the most recently executed simulation."""
    return _latest_sim

@router.get("/results/{simulation_id}", response_model=SimulationResult)
def get_simulation_result(simulation_id: str, db: Session = Depends(get_db)):
    """Retrieves a specific simulation by ID from memory or persistent DB."""
    result = _engine.get_simulation(simulation_id)
    if result:
        return result

    # Query persistent database
    sc = db.query(ScenarioModel).filter(ScenarioModel.id == simulation_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")

    from app.schemas.schemas import NetworkMetrics
    return SimulationResult(
        simulation_id=sc.id,
        created_at=sc.created_at.isoformat(),
        disruption=DisruptionInput(
            airport_code=sc.airport_code,
            start_time=sc.start_time,
            duration_minutes=sc.duration_minutes,
            disruption_type=sc.disruption_type,
            description=sc.description
        ),
        metrics=NetworkMetrics(**json.loads(sc.metrics_json)),
        flights=json.loads(sc.flights_json),
        connections=json.loads(sc.connections_json),
        crew_status=json.loads(sc.crew_json),
        timeline=json.loads(sc.timeline_json),
        airport_disruption_ranking=json.loads(sc.airport_ranking_json),
        delay_distribution=json.loads(sc.delay_distribution_json),
        is_baseline=sc.is_baseline
    )

@router.get("/history", response_model=List[Dict[str, Any]])
def get_simulation_history(db: Session = Depends(get_db)):
    """Retrieves list of past executed scenarios from persistent DB."""
    scenarios = db.query(ScenarioModel).order_by(ScenarioModel.created_at.desc()).limit(100).all()
    history_summary = []
    for sc in scenarios:
        metrics = json.loads(sc.metrics_json)
        history_summary.append({
            "simulation_id": sc.id,
            "created_at": sc.created_at.isoformat(),
            "airport_code": sc.airport_code,
            "duration_minutes": sc.duration_minutes,
            "disruption_type": sc.disruption_type,
            "user_email": sc.user_email,
            "delayed_flights": metrics.get("delayed_flights", 0),
            "total_delay_minutes": metrics.get("total_delay_minutes", 0),
            "stranded_passengers": metrics.get("stranded_passengers", 0),
            "health_score": metrics.get("network_health_score", 100.0),
            "is_baseline": sc.is_baseline
        })
    return history_summary

@router.get("/domino-explanation/{simulation_id}")
def get_domino_explanation(simulation_id: str):
    """Returns a step-by-step causal explanation of the domino effect."""
    sim = _engine.get_simulation(simulation_id)
    if not sim:
        sim = _latest_sim
    return _dispatcher.explain_domino_effect(sim)

@router.get("/flights", response_model=List[FlightSimulated])
def get_simulated_flights(simulation_id: Optional[str] = None):
    """Returns all 70 flights with their simulated status."""
    sim = _engine.get_simulation(simulation_id) if simulation_id else _latest_sim
    return sim.flights

@router.get("/flights/{flight_id}", response_model=FlightSimulated)
def get_flight_detail(flight_id: str, simulation_id: Optional[str] = None):
    """Returns detailed intelligence and delay history for an individual flight."""
    sim = _engine.get_simulation(simulation_id) if simulation_id else _latest_sim
    fl = next((f for f in sim.flights if f.flight_id == flight_id), None)
    if not fl:
        raise HTTPException(status_code=404, detail=f"Flight {flight_id} not found")
    return fl
