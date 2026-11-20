"""
Pydantic Schemas for DOMINO SKY
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- AIRPORT SCHEMAS ---
class AirportBase(BaseModel):
    code: str
    icao: str
    name: str
    city: str
    state: str
    latitude: float
    longitude: float
    runways: int
    capacity_per_hour: int
    min_turnaround_time: int
    is_hub: bool

class AirportDetail(AirportBase):
    current_status: str = "OPERATIONAL" # OPERATIONAL, MINOR_DISRUPTION, SIGNIFICANT_DISRUPTION, CLOSED, RECOVERY
    scheduled_departures: int = 0
    scheduled_arrivals: int = 0
    delayed_flights: int = 0
    cancelled_flights: int = 0
    aircraft_present: List[str] = Field(default_factory=list)
    affected_passengers: int = 0
    incoming_disruptions: List[str] = Field(default_factory=list)

# --- AIRCRAFT SCHEMAS ---
class AircraftBase(BaseModel):
    registration: str
    model: str
    capacity: int
    base_airport: str
    is_spare: bool = False
    status: str = "AVAILABLE" # AVAILABLE, IN_FLIGHT, MAINTENANCE, READY_STANDBY, ASSIGNED

# --- FLIGHT SCHEMAS ---
class FlightBase(BaseModel):
    flight_id: str
    flight_number: str
    origin: str
    destination: str
    scheduled_departure: str
    scheduled_arrival: str
    duration_minutes: int
    assigned_aircraft: str
    aircraft_model: str
    rotation_sequence: int
    total_rotation_legs: int
    passenger_count: int
    capacity: int
    load_factor: float
    priority: str = "MEDIUM"

class FlightSimulated(FlightBase):
    actual_departure: str
    actual_arrival: str
    departure_delay_minutes: int = 0
    arrival_delay_minutes: int = 0
    flight_status: str = "ON_TIME" # ON_TIME, DELAYED, CANCELLED, RECOVERED, DIVERTED
    is_delayed: bool = False
    is_cancelled: bool = False
    delay_reasons: List[str] = Field(default_factory=list)
    root_cause: Optional[str] = None
    propagation_source: Optional[str] = None
    crew_duty_violated: bool = False
    turnaround_buffer_used: int = 0
    connecting_passengers_in: int = 0
    connecting_passengers_out: int = 0
    missed_connections_count: int = 0

# --- PASSENGER & CONNECTION SCHEMAS ---
class PassengerConnectionBase(BaseModel):
    connection_id: str
    inbound_flight_id: str
    outbound_flight_id: str
    airport: str
    passengers: int
    min_connection_time: int
    baggage_transfer: bool = True
    vip_pax: int = 0

class PassengerConnectionSimulated(PassengerConnectionBase):
    scheduled_buffer_minutes: int
    actual_buffer_minutes: int
    status: str = "SUCCESSFUL" # SUCCESSFUL, MISSED, CANCELLED_FLIGHT
    is_missed: bool = False
    alternative_flight_available: bool = False
    stranded_passengers: int = 0
    rebookable_passengers: int = 0

# --- CREW SCHEMAS ---
class CrewAssignmentBase(BaseModel):
    crew_id: str
    assigned_aircraft: str
    captain: str
    first_officer: str
    cabin_lead: str
    cabin_crew_count: int
    duty_start_time: str
    max_fdp_minutes: int
    rest_period_required_minutes: int
    assigned_flight_ids: List[str]
    home_base: str

class CrewAssignmentSimulated(CrewAssignmentBase):
    actual_duty_minutes: int = 0
    remaining_duty_allowance_minutes: int = 0
    duty_violation: bool = False
    violation_flight_id: Optional[str] = None
    status: str = "ON_DUTY" # ON_DUTY, VIOLATION, REST_REQUIRED

# --- SPARE AIRCRAFT SCHEMAS ---
class SpareAircraft(BaseModel):
    registration: str
    model: str
    capacity: int
    current_airport: str
    available_from: str
    turnaround_ready_minutes: int
    hourly_operating_cost: float
    compatible_aircraft_models: List[str]
    status: str = "READY_STANDBY"
    assigned_to_flight_id: Optional[str] = None

# --- SIMULATION INPUT & OUTPUT SCHEMAS ---
class DisruptionInput(BaseModel):
    airport_code: str
    start_time: str = "08:00"
    duration_minutes: int = 90
    disruption_type: str = "Thunderstorm" # Thunderstorm, Heavy rainfall, Fog, Runway maintenance, Airport infrastructure failure, Air traffic control restrictions, Custom disruption
    description: Optional[str] = None

class NetworkMetrics(BaseModel):
    total_airports: int = 16
    total_flights: int = 70
    total_aircraft: int = 16
    on_time_flights: int = 70
    delayed_flights: int = 0
    cancelled_flights: int = 0
    recovered_flights: int = 0
    total_delay_minutes: int = 0
    average_delay_minutes: float = 0.0
    total_passengers: int = 0
    affected_passengers: int = 0
    stranded_passengers: int = 0
    missed_connections: int = 0
    successful_connections: int = 0
    aircraft_unavailable: int = 0
    crew_duty_violations: int = 0
    spare_aircraft_deployed: int = 0
    network_health_score: float = 100.0 # 0 to 100
    network_recovery_percentage: float = 100.0
    severity_level: str = "NORMAL" # NORMAL, LOW, MEDIUM, HIGH, CRITICAL

class DisruptionTimelineEvent(BaseModel):
    time: str
    event_type: str # CLOSURE_START, FLIGHT_HOLD, ARRIVAL_DELAY, CASCADE_PROPAGATION, CREW_LIMIT, CLOSURE_END, RECOVERY
    flight_id: Optional[str] = None
    airport: str
    description: str
    severity: str = "INFO" # INFO, WARNING, CRITICAL

class SimulationResult(BaseModel):
    simulation_id: str
    created_at: str
    disruption: DisruptionInput
    metrics: NetworkMetrics
    flights: List[FlightSimulated]
    connections: List[PassengerConnectionSimulated]
    crew_status: List[CrewAssignmentSimulated]
    timeline: List[DisruptionTimelineEvent]
    airport_disruption_ranking: List[Dict[str, Any]]
    delay_distribution: Dict[str, int]
    is_baseline: bool = False

# --- RECOVERY SCHEMAS ---
class RecoveryActionType(str):
    DEPLOY_SPARE = "DEPLOY_SPARE"
    SWAP_AIRCRAFT = "SWAP_AIRCRAFT"
    CANCEL_FLIGHT = "CANCEL_FLIGHT"
    DELAY_CONNECTING_FLIGHT = "DELAY_CONNECTING_FLIGHT"
    REBOOK_PASSENGERS = "REBOOK_PASSENGERS"

class RecoveryCandidate(BaseModel):
    action_id: str
    action_type: str
    name: str
    description: str
    target_flight_id: str
    target_airport: str
    spare_aircraft_reg: Optional[str] = None
    delay_minutes_to_add: Optional[int] = 0
    operational_feasibility: bool
    feasibility_notes: str
    trade_offs: str
    estimated_delay_saved_minutes: int
    estimated_passengers_recovered: int
    estimated_connections_restored: int
    estimated_crew_violations_prevented: int
    score: float

class RecoveryRecommendation(BaseModel):
    recommendation_id: str
    title: str
    action_type: str
    action_details: Dict[str, Any]
    why_recommended: str
    expected_impact: Dict[str, Any] # Exact deterministic numbers
    trade_offs: str
    affected_flights: List[str]
    passenger_impact: Dict[str, Any]
    operational_feasibility: bool
    confidence_evidence: str
    candidate_id: str

class RecoveryApplyRequest(BaseModel):
    simulation_id: str
    candidate_id: str
    custom_parameters: Optional[Dict[str, Any]] = None

class RecoveryComparison(BaseModel):
    before_simulation_id: str
    after_simulation_id: str
    applied_action: RecoveryRecommendation
    before_metrics: NetworkMetrics
    after_metrics: NetworkMetrics
    delay_reduction_minutes: int
    delay_reduction_percentage: float
    passengers_recovered: int
    connections_restored: int
    flights_recovered: int
    crew_violations_resolved: int
    remaining_disruptions: int
