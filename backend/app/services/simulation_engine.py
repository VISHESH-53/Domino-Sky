"""
Deterministic Disruption & Simulation Engine for DOMINO SKY
Provides mathematically rigorous, reproducible calculations of:
- Aircraft rotation delay cascades
- Airport closure holding and queueing
- Passenger connection failures and stranded classifications
- Crew Flight Duty Period (FDP) constraints
- Spare aircraft deployment & recovery simulations
"""

from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import uuid
import copy

from app.services.data_loader import DataLoader
from app.schemas.schemas import (
    DisruptionInput,
    SimulationResult,
    NetworkMetrics,
    FlightSimulated,
    PassengerConnectionSimulated,
    CrewAssignmentSimulated,
    DisruptionTimelineEvent
)

def time_to_minutes(t_str: str) -> int:
    h, m = map(int, t_str.split(":"))
    return h * 60 + m

def minutes_to_time(mins: int) -> str:
    # Wrap to 24h
    norm = mins % (24 * 60)
    h = norm // 60
    m = norm % 60
    return f"{h:02d}:{m:02d}"

class SimulationEngine:
    def __init__(self):
        self.data_loader = DataLoader.get_instance()
        self.saved_simulations: Dict[str, SimulationResult] = {}

    def run_simulation(
        self,
        disruption: Optional[DisruptionInput] = None,
        applied_recovery: Optional[Dict[str, Any]] = None,
        simulation_id: Optional[str] = None
    ) -> SimulationResult:
        """
        Runs a fully deterministic simulation of the airline network.
        If disruption is None, runs the baseline on-time schedule.
        applied_recovery can contain:
          - action_type: DEPLOY_SPARE, SWAP_AIRCRAFT, CANCEL_FLIGHT, DELAY_CONNECTING_FLIGHT
          - target_flight_id: str
          - spare_aircraft_reg: str
          - delay_minutes_to_add: int
        """
        sim_id = simulation_id or str(uuid.uuid4())[:8]
        created_at = datetime.now().isoformat()
        
        # Default baseline if no disruption
        if disruption is None:
            disruption = DisruptionInput(
                airport_code="NONE",
                start_time="00:00",
                duration_minutes=0,
                disruption_type="Baseline Schedule",
                description="Normal operations baseline"
            )
            is_baseline = True
        else:
            is_baseline = (disruption.airport_code == "NONE" or disruption.duration_minutes == 0)

        closure_start = time_to_minutes(disruption.start_time)
        closure_end = closure_start + disruption.duration_minutes
        closed_airport = disruption.airport_code

        # Load fresh copy of source data
        raw_flights = copy.deepcopy(self.data_loader.flights)
        raw_airports = {a["code"]: a for a in self.data_loader.airports}
        raw_connections = copy.deepcopy(self.data_loader.passenger_connections)
        raw_crews = copy.deepcopy(self.data_loader.crew_assignments)
        
        # Track timeline events
        timeline: List[DisruptionTimelineEvent] = []
        if not is_baseline:
            timeline.append(DisruptionTimelineEvent(
                time=disruption.start_time,
                event_type="CLOSURE_START",
                airport=closed_airport,
                description=f"{closed_airport} Airport closed due to {disruption.disruption_type} for {disruption.duration_minutes} minutes (until {minutes_to_time(closure_end)})",
                severity="CRITICAL"
            ))

        # Handle pre-simulation recovery actions (e.g., flight cancellation, spare assignment)
        cancelled_flight_ids = set()
        spare_assignments: Dict[str, str] = {} # flight_id -> spare_reg
        held_flight_delays: Dict[str, int] = {} # flight_id -> extra_mins

        if applied_recovery:
            action_type = applied_recovery.get("action_type")
            target_fl = applied_recovery.get("target_flight_id")
            
            if action_type == "CANCEL_FLIGHT" and target_fl:
                cancelled_flight_ids.add(target_fl)
                timeline.append(DisruptionTimelineEvent(
                    time=disruption.start_time,
                    event_type="RECOVERY",
                    flight_id=target_fl,
                    airport="SYSTEM",
                    description=f"Strategic recovery: Cancelled flight {target_fl} to prevent downstream network collapse",
                    severity="WARNING"
                ))
            elif action_type == "DEPLOY_SPARE" and target_fl:
                spare_reg = applied_recovery.get("spare_aircraft_reg", "VT-SP1")
                spare_assignments[target_fl] = spare_reg
                timeline.append(DisruptionTimelineEvent(
                    time=disruption.start_time,
                    event_type="RECOVERY",
                    flight_id=target_fl,
                    airport=closed_airport,
                    description=f"Strategic recovery: Deployed standby aircraft {spare_reg} for flight {target_fl} to absorb cascade delay",
                    severity="INFO"
                ))
            elif action_type == "DELAY_CONNECTING_FLIGHT" and target_fl:
                extra_mins = applied_recovery.get("delay_minutes_to_add", 20)
                held_flight_delays[target_fl] = extra_mins
                timeline.append(DisruptionTimelineEvent(
                    time=disruption.start_time,
                    event_type="RECOVERY",
                    flight_id=target_fl,
                    airport="SYSTEM",
                    description=f"Strategic recovery: Held departure of {target_fl} by {extra_mins}m to protect incoming passenger connections",
                    severity="INFO"
                ))

        # 1. GROUP FLIGHTS BY AIRCRAFT ROTATION
        # An aircraft operates its flight sequence sequentially
        aircraft_rotations: Dict[str, List[Dict[str, Any]]] = {}
        for f in raw_flights:
            ac_reg = f["assigned_aircraft"]
            aircraft_rotations.setdefault(ac_reg, []).append(f)

        # Sort each rotation by rotation_sequence
        for ac_reg in aircraft_rotations:
            aircraft_rotations[ac_reg].sort(key=lambda x: x["rotation_sequence"])

        simulated_flights: List[FlightSimulated] = []
        flight_lookup: Dict[str, FlightSimulated] = {}

        # Counter for runway departure queueing at reopening (e.g. 3m spacing per flight)
        reopening_departure_queue = 0
        reopening_arrival_queue = 0

        # We simulate each aircraft rotation
        for ac_reg, rotation in aircraft_rotations.items():
            prev_actual_arrival: Optional[int] = None
            prev_flight_id: Optional[str] = None
            current_active_ac = ac_reg

            for flight in rotation:
                fl_id = flight["flight_id"]
                orig = flight["origin"]
                dest = flight["destination"]
                sched_dep = time_to_minutes(flight["scheduled_departure"])
                sched_arr = time_to_minutes(flight["scheduled_arrival"])
                duration = flight["duration_minutes"]
                
                # Check if flight was cancelled by recovery action
                if fl_id in cancelled_flight_ids:
                    sim_f = FlightSimulated(
                        **flight,
                        actual_departure=flight["scheduled_departure"],
                        actual_arrival=flight["scheduled_arrival"],
                        departure_delay_minutes=0,
                        arrival_delay_minutes=0,
                        flight_status="CANCELLED",
                        is_delayed=False,
                        is_cancelled=True,
                        delay_reasons=["TACTICAL_CANCELLATION"],
                        root_cause="Operational Recovery Intervention"
                    )
                    simulated_flights.append(sim_f)
                    flight_lookup[fl_id] = sim_f
                    continue

                # Check if spare aircraft was deployed for this flight or an earlier flight in this rotation
                if fl_id in spare_assignments:
                    current_active_ac = spare_assignments[fl_id]
                    # Spare aircraft resets the incoming rotation dependency!
                    prev_actual_arrival = None
                    prev_flight_id = None

                # Minimum turnaround time at origin airport
                orig_airport = raw_airports.get(orig, {})
                min_turnaround = orig_airport.get("min_turnaround_time", 40)

                delay_reasons: List[str] = []
                root_cause = None
                propagation_source = None

                # Calculate earliest possible departure based on inbound aircraft rotation
                if prev_actual_arrival is None:
                    # First leg of rotation or spare reset
                    earliest_aircraft_dep = sched_dep
                else:
                    earliest_aircraft_dep = prev_actual_arrival + min_turnaround
                    if earliest_aircraft_dep > sched_dep:
                        delay_reasons.append("ROTATION_PROPAGATION")
                        root_cause = f"Inbound aircraft {current_active_ac} turnaround from {prev_flight_id}"
                        propagation_source = prev_flight_id

                # Calculate airport closure constraint on departure
                earliest_airport_dep = sched_dep
                if not is_baseline and orig == closed_airport:
                    # If departure is scheduled or delayed into the closure window
                    potential_dep = max(sched_dep, earliest_aircraft_dep)
                    if closure_start <= potential_dep < closure_end:
                        # Flight is grounded until airport reopens
                        earliest_airport_dep = closure_end + reopening_departure_queue
                        reopening_departure_queue += 3 # 3 minutes runway separation
                        delay_reasons.append("DIRECT_AIRPORT_CLOSURE")
                        root_cause = f"Airport {orig} closed due to {disruption.disruption_type}"
                        propagation_source = f"AIRPORT:{orig}"
                        
                        timeline.append(DisruptionTimelineEvent(
                            time=flight["scheduled_departure"],
                            event_type="FLIGHT_HOLD",
                            flight_id=fl_id,
                            airport=orig,
                            description=f"Flight {fl_id} ({orig} -> {dest}) grounded at gate until {minutes_to_time(closure_end)}",
                            severity="WARNING"
                        ))

                # Check if held manually for connections
                held_extra = held_flight_delays.get(fl_id, 0)

                # Actual departure
                actual_dep_min = max(sched_dep, earliest_aircraft_dep, earliest_airport_dep) + held_extra
                
                # Destination airport closure constraint on arrival
                # Standard flight duration
                tentative_arr_min = actual_dep_min + duration
                actual_arr_min = tentative_arr_min

                if not is_baseline and dest == closed_airport:
                    # If tentative arrival falls inside closure window
                    if closure_start <= tentative_arr_min < closure_end:
                        # Aircraft cannot land during closure -> held in airborne pattern or held at gate before departure
                        actual_arr_min = closure_end + reopening_arrival_queue
                        reopening_arrival_queue += 4 # 4 min arrival slot
                        delay_reasons.append("DESTINATION_AIRPORT_CLOSED")
                        if not root_cause:
                            root_cause = f"Destination {dest} closed due to {disruption.disruption_type}"
                            propagation_source = f"AIRPORT:{dest}"
                        
                        # In real airline dispatch, departure is delayed at origin so pax don't run out of fuel holding
                        actual_dep_min = actual_arr_min - duration
                        
                        timeline.append(DisruptionTimelineEvent(
                            time=minutes_to_time(actual_dep_min),
                            event_type="ARRIVAL_DELAY",
                            flight_id=fl_id,
                            airport=dest,
                            description=f"Flight {fl_id} arrival held until {minutes_to_time(actual_arr_min)} due to {dest} closure",
                            severity="WARNING"
                        ))

                dep_delay = max(0, actual_dep_min - sched_dep)
                arr_delay = max(0, actual_arr_min - sched_arr)
                is_delayed = arr_delay > 15
                
                status = "DELAYED" if is_delayed else "ON_TIME"
                if applied_recovery and fl_id in spare_assignments and not is_delayed:
                    status = "RECOVERED"

                if is_delayed and "ROTATION_PROPAGATION" in delay_reasons and not root_cause:
                    root_cause = f"Cascading turnaround delay from {prev_flight_id}"

                flight_data = dict(flight)
                flight_data["assigned_aircraft"] = current_active_ac
                sim_f = FlightSimulated(
                    **flight_data,
                    actual_departure=minutes_to_time(actual_dep_min),
                    actual_arrival=minutes_to_time(actual_arr_min),
                    departure_delay_minutes=dep_delay,
                    arrival_delay_minutes=arr_delay,
                    flight_status=status,
                    is_delayed=is_delayed,
                    is_cancelled=False,
                    delay_reasons=delay_reasons,
                    root_cause=root_cause,
                    propagation_source=propagation_source,
                    turnaround_buffer_used=max(0, sched_dep - earliest_aircraft_dep) if earliest_aircraft_dep < sched_dep else 0
                )

                simulated_flights.append(sim_f)
                flight_lookup[fl_id] = sim_f

                # Update rotation tracker
                prev_actual_arrival = actual_arr_min
                prev_flight_id = fl_id

        # 2. EVALUATE PASSENGER CONNECTIONS & STRANDED PASSENGERS
        simulated_connections: List[PassengerConnectionSimulated] = []
        total_missed_connections = 0
        total_stranded_passengers = 0
        total_rebookable_passengers = 0
        successful_connections = 0

        # Build downstream destination map to check if alternative flights exist same day
        dest_flight_schedule: Dict[Tuple[str, str], List[FlightSimulated]] = {}
        for sf in simulated_flights:
            if not sf.is_cancelled:
                dest_flight_schedule.setdefault((sf.origin, sf.destination), []).append(sf)

        for conn in raw_connections:
            in_fl = flight_lookup.get(conn["inbound_flight_id"])
            out_fl = flight_lookup.get(conn["outbound_flight_id"])

            if not in_fl or not out_fl:
                continue

            sched_in_arr = time_to_minutes(in_fl.scheduled_arrival)
            sched_out_dep = time_to_minutes(out_fl.scheduled_departure)
            scheduled_buffer = sched_out_dep - sched_in_arr

            actual_in_arr = time_to_minutes(in_fl.actual_arrival)
            actual_out_dep = time_to_minutes(out_fl.actual_departure)
            actual_buffer = actual_out_dep - actual_in_arr

            mct = conn["min_connection_time"]
            pax = conn["passengers"]

            # Connection check
            if in_fl.is_cancelled or out_fl.is_cancelled:
                conn_status = "CANCELLED_FLIGHT"
                is_missed = True
            elif actual_buffer < mct:
                conn_status = "MISSED"
                is_missed = True
            else:
                conn_status = "SUCCESSFUL"
                is_missed = False

            stranded_pax = 0
            rebookable_pax = 0
            alt_avail = False

            if is_missed:
                total_missed_connections += 1
                in_fl.missed_connections_count += 1
                
                # Check for alternative same-day flight from connection airport to final destination
                alt_flights = [
                    f for f in dest_flight_schedule.get((out_fl.origin, out_fl.destination), [])
                    if f.flight_id != out_fl.flight_id and time_to_minutes(f.actual_departure) >= actual_in_arr + mct
                ]

                if alt_flights:
                    alt_avail = True
                    rebookable_pax = pax
                    total_rebookable_passengers += pax
                else:
                    # No onward flight same day -> Stranded overnight!
                    alt_avail = False
                    stranded_pax = pax
                    total_stranded_passengers += pax

                timeline.append(DisruptionTimelineEvent(
                    time=in_fl.actual_arrival,
                    event_type="CASCADE_PROPAGATION",
                    flight_id=in_fl.flight_id,
                    airport=conn["airport"],
                    description=f"{pax} passengers missed connection to {out_fl.flight_id} at {conn['airport']} (Buffer: {actual_buffer}m < {mct}m required). {'STRANDED OVERNIGHT' if not alt_avail else 'Rebookable on alternate flight'}",
                    severity="CRITICAL" if not alt_avail else "WARNING"
                ))
            else:
                successful_connections += 1

            in_fl.connecting_passengers_out += pax
            out_fl.connecting_passengers_in += pax

            simulated_connections.append(PassengerConnectionSimulated(
                **conn,
                scheduled_buffer_minutes=scheduled_buffer,
                actual_buffer_minutes=actual_buffer,
                status=conn_status,
                is_missed=is_missed,
                alternative_flight_available=alt_avail,
                stranded_passengers=stranded_pax,
                rebookable_passengers=rebookable_pax
            ))

        # 3. EVALUATE CREW DUTY LIMITS (DGCA 600m FDP)
        simulated_crews: List[CrewAssignmentSimulated] = []
        total_crew_violations = 0

        for crew in raw_crews:
            assigned_fl_ids = crew["assigned_flight_ids"]
            duty_start = time_to_minutes(crew["duty_start_time"])
            max_fdp = crew["max_fdp_minutes"] # 600 mins

            latest_arr = duty_start
            violation = False
            violation_fl = None

            for fl_id in assigned_fl_ids:
                fl = flight_lookup.get(fl_id)
                if not fl or fl.is_cancelled:
                    continue

                fl_arr = time_to_minutes(fl.actual_arrival)
                total_duty = fl_arr - duty_start

                if total_duty > max_fdp and not violation:
                    violation = True
                    violation_fl = fl_id
                    fl.crew_duty_violated = True
                    fl.delay_reasons.append("CREW_DUTY_VIOLATION")
                    total_crew_violations += 1

                    timeline.append(DisruptionTimelineEvent(
                        time=fl.actual_departure,
                        event_type="CREW_LIMIT",
                        flight_id=fl_id,
                        airport=fl.origin,
                        description=f"{crew['crew_id']} ({crew['captain']}) exceeded legal Flight Duty Period ({total_duty}m > {max_fdp}m limit) on flight {fl_id}",
                        severity="CRITICAL"
                    ))

                if fl_arr > latest_arr:
                    latest_arr = fl_arr

            actual_duty = max(0, latest_arr - duty_start)
            remaining_allowance = max(0, max_fdp - actual_duty)

            crew_data = dict(crew)
            crew_data["status"] = "VIOLATION" if violation else "ON_DUTY"
            simulated_crews.append(CrewAssignmentSimulated(
                **crew_data,
                actual_duty_minutes=actual_duty,
                remaining_duty_allowance_minutes=remaining_allowance,
                duty_violation=violation,
                violation_flight_id=violation_fl
            ))

        # Reopen timeline event
        if not is_baseline:
            timeline.append(DisruptionTimelineEvent(
                time=minutes_to_time(closure_end),
                event_type="CLOSURE_END",
                airport=closed_airport,
                description=f"{closed_airport} Airport reopened. Recovery operations and queued departures underway.",
                severity="INFO"
            ))

        # Sort timeline chronologically
        timeline.sort(key=lambda e: time_to_minutes(e.time) if ":" in e.time else 0)

        # 4. CALCULATE AGGREGATE NETWORK METRICS
        total_fl = len(simulated_flights)
        delayed_fl = sum(1 for f in simulated_flights if f.is_delayed and not f.is_cancelled)
        cancelled_fl = sum(1 for f in simulated_flights if f.is_cancelled)
        recovered_fl = sum(1 for f in simulated_flights if f.flight_status == "RECOVERED")
        ontime_fl = total_fl - delayed_fl - cancelled_fl

        total_delay_mins = sum(f.arrival_delay_minutes for f in simulated_flights)
        avg_delay = round(total_delay_mins / max(1, total_fl - cancelled_fl), 1)

        total_pax = sum(f.passenger_count for f in simulated_flights)
        affected_pax = sum(f.passenger_count for f in simulated_flights if f.is_delayed or f.is_cancelled)

        # Calculate network health score
        # 100 - (delay_rate * 40) - (cancel_rate * 80) - (stranded_rate * 50) - (crew_violations * 4)
        delay_ratio = delayed_fl / total_fl
        cancel_ratio = cancelled_fl / total_fl
        stranded_ratio = total_stranded_passengers / max(1, total_pax)
        health_penalty = (delay_ratio * 40.0) + (cancel_ratio * 80.0) + (stranded_ratio * 100.0) + (total_crew_violations * 4.0)
        health_score = max(0.0, round(100.0 - health_penalty, 1))

        if health_score >= 90:
            severity = "NORMAL"
        elif health_score >= 75:
            severity = "LOW"
        elif health_score >= 60:
            severity = "MEDIUM"
        elif health_score >= 45:
            severity = "HIGH"
        else:
            severity = "CRITICAL"

        # Recovery percentage
        recovery_pct = round(((total_fl - delayed_fl - cancelled_fl + recovered_fl) / total_fl) * 100.0, 1)

        metrics = NetworkMetrics(
            total_airports=len(raw_airports),
            total_flights=total_fl,
            total_aircraft=len(self.data_loader.aircraft),
            on_time_flights=ontime_fl,
            delayed_flights=delayed_fl,
            cancelled_flights=cancelled_fl,
            recovered_flights=recovered_fl,
            total_delay_minutes=total_delay_mins,
            average_delay_minutes=avg_delay,
            total_passengers=total_pax,
            affected_passengers=affected_pax,
            stranded_passengers=total_stranded_passengers,
            missed_connections=total_missed_connections,
            successful_connections=successful_connections,
            aircraft_unavailable=1 if not is_baseline else 0,
            crew_duty_violations=total_crew_violations,
            spare_aircraft_deployed=len(spare_assignments),
            network_health_score=health_score,
            network_recovery_percentage=recovery_pct,
            severity_level=severity
        )

        # 5. AIRPORT DISRUPTION RANKING
        airport_impact: Dict[str, Dict[str, Any]] = {}
        for apt_code, apt in raw_airports.items():
            airport_impact[apt_code] = {
                "code": apt_code,
                "name": apt["name"],
                "city": apt["city"],
                "total_delay_minutes": 0,
                "delayed_departures": 0,
                "delayed_arrivals": 0,
                "cancelled_flights": 0,
                "affected_passengers": 0,
                "is_closed": (apt_code == closed_airport and not is_baseline)
            }

        for sf in simulated_flights:
            if sf.is_delayed:
                if sf.origin in airport_impact:
                    airport_impact[sf.origin]["total_delay_minutes"] += sf.departure_delay_minutes
                    airport_impact[sf.origin]["delayed_departures"] += 1
                    airport_impact[sf.origin]["affected_passengers"] += sf.passenger_count
                if sf.destination in airport_impact:
                    airport_impact[sf.destination]["total_delay_minutes"] += sf.arrival_delay_minutes
                    airport_impact[sf.destination]["delayed_arrivals"] += 1
            if sf.is_cancelled:
                if sf.origin in airport_impact:
                    airport_impact[sf.origin]["cancelled_flights"] += 1
                if sf.destination in airport_impact:
                    airport_impact[sf.destination]["cancelled_flights"] += 1

        airport_ranking = sorted(
            airport_impact.values(),
            key=lambda x: (x["is_closed"], x["total_delay_minutes"], x["affected_passengers"]),
            reverse=True
        )

        # 6. DELAY DISTRIBUTION HISTOGRAM
        delay_dist = {
            "on_time": ontime_fl,
            "minor_16_45": sum(1 for f in simulated_flights if 15 < f.arrival_delay_minutes <= 45 and not f.is_cancelled),
            "moderate_46_90": sum(1 for f in simulated_flights if 45 < f.arrival_delay_minutes <= 90 and not f.is_cancelled),
            "severe_91_180": sum(1 for f in simulated_flights if 90 < f.arrival_delay_minutes <= 180 and not f.is_cancelled),
            "extreme_over_180": sum(1 for f in simulated_flights if f.arrival_delay_minutes > 180 and not f.is_cancelled),
            "cancelled": cancelled_fl
        }

        result = SimulationResult(
            simulation_id=sim_id,
            created_at=created_at,
            disruption=disruption,
            metrics=metrics,
            flights=simulated_flights,
            connections=simulated_connections,
            crew_status=simulated_crews,
            timeline=timeline,
            airport_disruption_ranking=airport_ranking,
            delay_distribution=delay_dist,
            is_baseline=is_baseline
        )

        self.saved_simulations[sim_id] = result
        return result

    def get_simulation(self, sim_id: str) -> Optional[SimulationResult]:
        return self.saved_simulations.get(sim_id)
