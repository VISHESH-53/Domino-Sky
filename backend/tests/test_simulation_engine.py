"""
Automated Test Suite for DOMINO SKY Deterministic Simulation Engine
Tests all 12 operational simulation requirements + AI verification requirements.
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.schemas import DisruptionInput
from app.services.simulation_engine import SimulationEngine
from app.services.recovery_optimizer import RecoveryOptimizer
from app.services.ai_dispatcher import AIDispatcher
from app.services.data_loader import DataLoader

@pytest.fixture
def engine():
    return SimulationEngine()

@pytest.fixture
def optimizer(engine):
    return RecoveryOptimizer(engine)

@pytest.fixture
def dispatcher(optimizer):
    return AIDispatcher(optimizer)

# TEST 1: Baseline Simulation Integrity
def test_baseline_simulation(engine):
    baseline = engine.run_simulation(None)
    assert baseline.metrics.total_airports == 16
    assert baseline.metrics.total_flights == 70
    assert baseline.metrics.total_aircraft == 16
    assert baseline.metrics.delayed_flights == 0
    assert baseline.metrics.cancelled_flights == 0
    assert baseline.metrics.on_time_flights == 70
    assert baseline.metrics.total_delay_minutes == 0
    assert baseline.metrics.stranded_passengers == 0
    assert baseline.metrics.missed_connections == 0
    assert baseline.metrics.network_health_score == 100.0

# TEST 2: Airport Closure Delays Affected Departure
def test_airport_closure_delays_departure(engine):
    # Mumbai closed 08:00 - 09:30
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    # DS-102 is BOM -> CCU scheduled at 08:30 (inside 08:00-09:30 closure window)
    ds102 = next(f for f in result.flights if f.flight_id == "DS-102")
    assert ds102.is_delayed
    assert "DIRECT_AIRPORT_CLOSURE" in ds102.delay_reasons
    assert ds102.actual_departure >= "09:30"
    assert ds102.departure_delay_minutes >= 60

# TEST 3: Airport Closure Affects Inbound Flights
def test_airport_closure_affects_inbound_flights(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    # DS-221 is COK -> BOM arriving scheduled 08:15 (inside closure window)
    ds221 = next(f for f in result.flights if f.flight_id == "DS-221")
    assert ds221.is_delayed
    assert ds221.actual_arrival >= "09:30"

# TEST 4: Flights Outside Closure Window Not Directly Delayed
def test_flights_outside_closure_window_not_directly_delayed(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    # DS-111 BOM -> DEL departs at 06:30 and arrives 08:45 at DEL.
    # Departs 1.5 hours BEFORE closure starts!
    ds111 = next(f for f in result.flights if f.flight_id == "DS-111")
    assert not ds111.is_delayed
    assert ds111.departure_delay_minutes == 0

# TEST 5: Aircraft Rotation Propagation & Minimum Turnaround Time Respected
def test_aircraft_rotation_propagation(engine):
    # VT-ABC operates: DS-101 (BLR->BOM), DS-102 (BOM->CCU), DS-103 (CCU->DEL), DS-104 (DEL->BLR)
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    ds102 = next(f for f in result.flights if f.flight_id == "DS-102")
    ds103 = next(f for f in result.flights if f.flight_id == "DS-103")
    
    # DS-102 is delayed arriving at CCU
    assert ds102.arrival_delay_minutes > 0
    # DS-103 departs from CCU. Its departure must be >= DS-102 actual arrival + min turnaround (40 mins at CCU)
    from app.services.simulation_engine import time_to_minutes
    min_dep = time_to_minutes(ds102.actual_arrival) + 40
    assert time_to_minutes(ds103.actual_departure) >= min_dep
    assert "ROTATION_PROPAGATION" in ds103.delay_reasons

# TEST 6: Passenger Missed Connections & Stranded Counting
def test_passenger_connections_calculated(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    assert result.metrics.missed_connections > 0
    assert result.metrics.stranded_passengers > 0
    # Stranded passengers must be less than or equal to total affected passengers
    assert result.metrics.stranded_passengers <= result.metrics.affected_passengers

# TEST 7: Passenger Counts Not Duplicated
def test_passenger_counts_not_duplicated(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    result = engine.run_simulation(disruption)
    
    # Sum of stranded pax on each connection must equal metrics.stranded_passengers
    sum_conn_stranded = sum(c.stranded_passengers for c in result.connections)
    assert sum_conn_stranded == result.metrics.stranded_passengers

# TEST 8: Crew Duty Constraints (DGCA 600m FDP)
def test_crew_duty_constraints(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=180, # Extended 3-hour closure to trigger crew limit
        disruption_type="Heavy rainfall"
    )
    result = engine.run_simulation(disruption)
    assert result.metrics.crew_duty_violations > 0
    violated_crews = [c for c in result.crew_status if c.duty_violation]
    assert len(violated_crews) == result.metrics.crew_duty_violations

# TEST 9: Spare Aircraft Recovery Action Reduces Delay
def test_spare_aircraft_deployment(engine, optimizer):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    base_sim = engine.run_simulation(disruption)
    
    candidates = optimizer.generate_candidates(base_sim)
    spare_candidates = [c for c in candidates if c.action_type == "DEPLOY_SPARE"]
    assert len(spare_candidates) > 0
    
    best_candidate = spare_candidates[0]
    recovered_sim, comparison = optimizer.apply_recovery(base_sim, best_candidate)
    
    assert recovered_sim.metrics.total_delay_minutes < base_sim.metrics.total_delay_minutes
    assert comparison.delay_reduction_minutes > 0
    assert recovered_sim.metrics.network_health_score >= base_sim.metrics.network_health_score

# TEST 10: AI Dispatcher Numerical Consistency
def test_ai_dispatcher_numerical_consistency(engine, dispatcher):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    sim = engine.run_simulation(disruption)
    recs = dispatcher.analyze_and_recommend(sim)
    
    assert len(recs) > 0
    for rec in recs:
        # Check that expected impact numbers are strictly integers / floats, not fabricated strings
        assert isinstance(rec.expected_impact["total_delay_saved_minutes"], (int, float))
        assert isinstance(rec.expected_impact["passengers_recovered"], (int, float))
        # Expected delay saved cannot exceed total delay in base simulation!
        assert rec.expected_impact["total_delay_saved_minutes"] <= sim.metrics.total_delay_minutes

# TEST 11: Deterministic Reproducibility
def test_deterministic_reproducibility(engine):
    disruption = DisruptionInput(
        airport_code="BOM",
        start_time="08:00",
        duration_minutes=90,
        disruption_type="Thunderstorm"
    )
    run1 = engine.run_simulation(disruption, simulation_id="run_1")
    run2 = engine.run_simulation(disruption, simulation_id="run_2")
    
    assert run1.metrics.total_delay_minutes == run2.metrics.total_delay_minutes
    assert run1.metrics.delayed_flights == run2.metrics.delayed_flights
    assert run1.metrics.stranded_passengers == run2.metrics.stranded_passengers
    assert run1.metrics.missed_connections == run2.metrics.missed_connections
    assert run1.metrics.network_health_score == run2.metrics.network_health_score
