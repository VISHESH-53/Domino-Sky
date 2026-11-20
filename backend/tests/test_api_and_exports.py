"""
API Integration & Export Tests for DOMINO SKY
"""

import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.models.database import init_db
from app.core.security import seed_default_users

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    seed_default_users()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    res = client.post("/api/auth/login", json={
        "email": "dispatcher@dominosky.aoc",
        "password": "Dispatch@DominoSky2026!"
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "simulation_engine" in data["services"]

def test_get_airports(client):
    response = client.get("/api/network/airports")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 16
    codes = [a["code"] for a in data]
    assert "BOM" in codes
    assert "DEL" in codes
    assert "BLR" in codes

def test_get_aircraft(client):
    response = client.get("/api/network/aircraft")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 16
    spares = [a for a in data if a["is_spare"]]
    assert len(spares) == 2

def test_get_routes(client):
    response = client.get("/api/network/routes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    first_route = data[0]
    assert "origin_coords" in first_route
    assert "destination_coords" in first_route

def test_run_simulation_api(client, auth_headers):
    payload = {
        "airport_code": "BOM",
        "start_time": "08:00",
        "duration_minutes": 90,
        "disruption_type": "Thunderstorm"
    }
    response = client.post("/api/simulation/run", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["delayed_flights"] > 0
    assert data["metrics"]["total_delay_minutes"] > 0
    assert data["metrics"]["stranded_passengers"] > 0
    assert len(data["flights"]) == 70

def test_recovery_recommend_and_apply_api(client, auth_headers):
    # Run disruption first
    run_resp = client.post("/api/simulation/run", json={
        "airport_code": "BOM",
        "start_time": "08:00",
        "duration_minutes": 90,
        "disruption_type": "Thunderstorm"
    }, headers=auth_headers)
    sim_id = run_resp.json()["simulation_id"]

    # Request recommendations
    rec_resp = client.post(f"/api/recovery/recommend?simulation_id={sim_id}")
    assert rec_resp.status_code == 200
    recs = rec_resp.json()
    assert len(recs) > 0
    
    first_rec = recs[0]
    assert "recommendation_id" in first_rec
    assert "expected_impact" in first_rec

    # Apply recommendation
    apply_resp = client.post("/api/recovery/apply", json={
        "simulation_id": sim_id,
        "candidate_id": first_rec["candidate_id"]
    }, headers=auth_headers)
    assert apply_resp.status_code == 200
    comparison = apply_resp.json()
    assert comparison["delay_reduction_minutes"] >= 0
    assert "before_metrics" in comparison
    assert "after_metrics" in comparison

def test_domino_explanation_api(client):
    response = client.get("/api/simulation/latest")
    sim_id = response.json()["simulation_id"]
    
    exp_resp = client.get(f"/api/simulation/domino-explanation/{sim_id}")
    assert exp_resp.status_code == 200
    data = exp_resp.json()
    assert "summary" in data
    assert "propagation_steps" in data

def test_exports_api(client):
    json_resp = client.get("/api/export/json")
    assert json_resp.status_code == 200
    assert json_resp.headers["content-type"] == "application/json"

    csv_resp = client.get("/api/export/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "Flight ID,Origin,Destination" in csv_resp.text

def test_simulated_flights_and_detail(client):
    fl_resp = client.get("/api/simulation/flights")
    assert fl_resp.status_code == 200
    flights = fl_resp.json()
    assert len(flights) == 70

    first_flight_id = flights[0]["flight_id"]
    det_resp = client.get(f"/api/simulation/flights/{first_flight_id}")
    assert det_resp.status_code == 200
    assert det_resp.json()["flight_id"] == first_flight_id

    # 404 on nonexistent flight
    not_found = client.get("/api/simulation/flights/NONEXISTENT-999")
    assert not_found.status_code == 404
