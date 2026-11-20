export interface Airport {
  code: string;
  icao: string;
  name: string;
  city: string;
  state: string;
  latitude: float;
  longitude: float;
  runways: number;
  capacity_per_hour: number;
  min_turnaround_time: number;
  is_hub: boolean;
  current_status?: string;
  delayed_flights?: number;
  cancelled_flights?: number;
  aircraft_present?: string[];
  affected_passengers?: number;
}

export type float = number;

export interface Aircraft {
  registration: string;
  model: string;
  capacity: number;
  base_airport: string;
  is_spare: boolean;
  status: string;
}

export interface FlightSimulated {
  flight_id: string;
  flight_number: string;
  origin: string;
  destination: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  actual_departure: string;
  actual_arrival: string;
  duration_minutes: number;
  departure_delay_minutes: number;
  arrival_delay_minutes: number;
  assigned_aircraft: string;
  aircraft_model: string;
  rotation_sequence: number;
  total_rotation_legs: number;
  passenger_count: number;
  capacity: number;
  load_factor: number;
  priority: string;
  flight_status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'RECOVERED' | 'DIVERTED';
  is_delayed: boolean;
  is_cancelled: boolean;
  delay_reasons: string[];
  root_cause: string | null;
  propagation_source: string | null;
  crew_duty_violated: boolean;
  turnaround_buffer_used: number;
  connecting_passengers_in: number;
  connecting_passengers_out: number;
  missed_connections_count: number;
}

export interface PassengerConnectionSimulated {
  connection_id: string;
  inbound_flight_id: string;
  outbound_flight_id: string;
  airport: string;
  passengers: number;
  min_connection_time: number;
  baggage_transfer: boolean;
  vip_pax: number;
  scheduled_buffer_minutes: number;
  actual_buffer_minutes: number;
  status: 'SUCCESSFUL' | 'MISSED' | 'CANCELLED_FLIGHT';
  is_missed: boolean;
  alternative_flight_available: boolean;
  stranded_passengers: number;
  rebookable_passengers: number;
}

export interface CrewAssignmentSimulated {
  crew_id: string;
  assigned_aircraft: string;
  captain: string;
  first_officer: string;
  cabin_lead: string;
  cabin_crew_count: number;
  duty_start_time: string;
  max_fdp_minutes: number;
  rest_period_required_minutes: number;
  assigned_flight_ids: string[];
  home_base: string;
  actual_duty_minutes: number;
  remaining_duty_allowance_minutes: number;
  duty_violation: boolean;
  violation_flight_id: string | null;
  status: string;
}

export interface DisruptionInput {
  airport_code: string;
  start_time: string;
  duration_minutes: number;
  disruption_type: string;
  description?: string;
}

export interface NetworkMetrics {
  total_airports: number;
  total_flights: number;
  total_aircraft: number;
  on_time_flights: number;
  delayed_flights: number;
  cancelled_flights: number;
  recovered_flights: number;
  total_delay_minutes: number;
  average_delay_minutes: number;
  total_passengers: number;
  affected_passengers: number;
  stranded_passengers: number;
  missed_connections: number;
  successful_connections: number;
  aircraft_unavailable: number;
  crew_duty_violations: number;
  spare_aircraft_deployed: number;
  network_health_score: number;
  network_recovery_percentage: number;
  severity_level: 'NORMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DisruptionTimelineEvent {
  time: string;
  event_type: string;
  flight_id: string | null;
  airport: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface AirportRanking {
  code: string;
  name: string;
  city: string;
  total_delay_minutes: number;
  delayed_departures: number;
  delayed_arrivals: number;
  cancelled_flights: number;
  affected_passengers: number;
  is_closed: boolean;
}

export interface SimulationResult {
  simulation_id: string;
  created_at: string;
  disruption: DisruptionInput;
  metrics: NetworkMetrics;
  flights: FlightSimulated[];
  connections: PassengerConnectionSimulated[];
  crew_status: CrewAssignmentSimulated[];
  timeline: DisruptionTimelineEvent[];
  airport_disruption_ranking: AirportRanking[];
  delay_distribution: Record<string, number>;
  is_baseline: boolean;
}

export interface RecoveryRecommendation {
  recommendation_id: string;
  title: string;
  action_type: string;
  action_details: Record<string, any>;
  why_recommended: string;
  expected_impact: {
    total_delay_saved_minutes: number;
    passengers_recovered: number;
    connections_restored: number;
    crew_violations_prevented: number;
    feasibility?: string;
    network_recovery_score?: number;
  };
  trade_offs: string;
  affected_flights: string[];
  passenger_impact: Record<string, any>;
  operational_feasibility: boolean;
  confidence_evidence: string;
  candidate_id: string;
}

export interface RecoveryComparison {
  before_simulation_id: string;
  after_simulation_id: string;
  applied_action: RecoveryRecommendation;
  before_metrics: NetworkMetrics;
  after_metrics: NetworkMetrics;
  delay_reduction_minutes: number;
  delay_reduction_percentage: number;
  passengers_recovered: number;
  connections_restored: number;
  flights_recovered: number;
  crew_violations_resolved: number;
  remaining_disruptions: number;
}

export interface RouteNetworkItem {
  origin: string;
  destination: string;
  origin_coords: [number, number];
  destination_coords: [number, number];
  flight_count: number;
  flight_ids: string[];
}

export interface DominoExplanation {
  summary: string;
  root_cause: string;
  propagation_steps: {
    step: number;
    phase: string;
    title: string;
    detail: string;
  }[];
}
