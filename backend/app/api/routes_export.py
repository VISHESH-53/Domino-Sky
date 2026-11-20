"""
Export API Routes for DOMINO SKY
Provides CSV and JSON downloads of complete simulation results and flight intelligence.
Secured against CSV Formula Injection (CWE-1236).
"""

from fastapi import APIRouter, HTTPException, Response
from typing import Optional
import csv
import io
import json

from app.api.routes_simulation import get_engine
from app.core.security import sanitize_csv_cell

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("/json")
def export_simulation_json(simulation_id: Optional[str] = None):
    """Exports full simulation result as structured JSON."""
    engine = get_engine()
    from app.api.routes_simulation import _latest_sim
    sim = engine.get_simulation(simulation_id) if simulation_id else _latest_sim
    
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    content = sim.model_dump_json(indent=2)
    filename = f"domino_sky_simulation_{sim.simulation_id}.json"
    
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/csv")
def export_flights_csv(simulation_id: Optional[str] = None):
    """
    Exports simulated flights table as CSV.
    All text values are sanitized against CSV Formula Injection (CWE-1236).
    """
    engine = get_engine()
    from app.api.routes_simulation import _latest_sim
    sim = engine.get_simulation(simulation_id) if simulation_id else _latest_sim
    
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Flight ID", "Origin", "Destination", "Aircraft", "Model",
        "Sched Departure", "Actual Departure", "Sched Arrival", "Actual Arrival",
        "Dep Delay (min)", "Arr Delay (min)", "Status", "Passengers",
        "Crew Violation", "Root Cause", "Propagation Source"
    ])

    for f in sim.flights:
        # Sanitize every potentially user-controlled or text field against formula injection
        writer.writerow([
            sanitize_csv_cell(f.flight_id),
            sanitize_csv_cell(f.origin),
            sanitize_csv_cell(f.destination),
            sanitize_csv_cell(f.assigned_aircraft),
            sanitize_csv_cell(f.aircraft_model),
            sanitize_csv_cell(f.scheduled_departure),
            sanitize_csv_cell(f.actual_departure),
            sanitize_csv_cell(f.scheduled_arrival),
            sanitize_csv_cell(f.actual_arrival),
            f.departure_delay_minutes,
            f.arrival_delay_minutes,
            sanitize_csv_cell(f.flight_status),
            f.passenger_count,
            "YES" if f.crew_duty_violated else "NO",
            sanitize_csv_cell(f.root_cause or "N/A"),
            sanitize_csv_cell(f.propagation_source or "N/A")
        ])

    filename = f"domino_sky_flights_{sim.simulation_id}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
