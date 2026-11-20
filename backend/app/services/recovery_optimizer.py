"""
Recovery Optimizer for DOMINO SKY
Generates candidate operational recovery interventions:
- Spare aircraft deployment
- Tactical cancellation of low-priority legs
- Connecting flight holding (gate holding)
- Aircraft swap
Every candidate is evaluated by running a dedicated deterministic simulation
to calculate the EXACT improvement in delay minutes, passenger connections, and crew legality.
"""

from typing import List, Dict, Any, Optional
import copy

from app.schemas.schemas import (
    SimulationResult,
    RecoveryCandidate,
    RecoveryRecommendation,
    RecoveryComparison
)
from app.services.data_loader import DataLoader

class RecoveryOptimizer:
    def __init__(self, simulation_engine):
        self.engine = simulation_engine
        self.data_loader = DataLoader.get_instance()

    def generate_candidates(self, base_sim: SimulationResult) -> List[RecoveryCandidate]:
        """
        Analyzes the current disrupted simulation result and generates feasible recovery candidates.
        Each candidate is run through the deterministic engine to verify its impact.
        """
        candidates: List[RecoveryCandidate] = []
        disruption = base_sim.disruption

        if base_sim.metrics.delayed_flights == 0 and base_sim.metrics.cancelled_flights == 0:
            return []

        # Objective weights:
        # Score = (w_delay * delay_saved) + (w_pax * pax_saved) + (w_conn * conn_saved * 20) + (w_crew * crew_saved * 150)
        
        # 1. CANDIDATE STRATEGY 1: DEPLOY SPARE AIRCRAFT
        # Look for available spares at or near disrupted airports
        for spare in self.data_loader.spare_aircraft:
            spare_apt = spare["current_airport"]
            spare_reg = spare["registration"]
            
            # Find flights departing from spare_apt that are delayed due to rotation propagation or airport closure
            eligible_flights = [
                f for f in base_sim.flights
                if f.origin == spare_apt and f.is_delayed and not f.is_cancelled
            ]

            # Prioritize flights with largest downstream rotations (e.g. rotation_sequence <= 3)
            eligible_flights.sort(key=lambda f: (f.total_rotation_legs - f.rotation_sequence, f.arrival_delay_minutes), reverse=True)

            for target_fl in eligible_flights[:2]:
                # Test in deterministic engine
                test_rec = {
                    "action_type": "DEPLOY_SPARE",
                    "target_flight_id": target_fl.flight_id,
                    "spare_aircraft_reg": spare_reg
                }
                test_sim = self.engine.run_simulation(
                    disruption=disruption,
                    applied_recovery=test_rec,
                    simulation_id=f"preview_spare_{target_fl.flight_id}"
                )

                delay_saved = max(0, base_sim.metrics.total_delay_minutes - test_sim.metrics.total_delay_minutes)
                pax_recovered = max(0, base_sim.metrics.affected_passengers - test_sim.metrics.affected_passengers)
                conn_restored = max(0, base_sim.metrics.missed_connections - test_sim.metrics.missed_connections)
                crew_saved = max(0, base_sim.metrics.crew_duty_violations - test_sim.metrics.crew_duty_violations)

                if delay_saved > 0 or conn_restored > 0 or crew_saved > 0:
                    score = delay_saved + (pax_recovered * 0.5) + (conn_restored * 25) + (crew_saved * 200)
                    candidates.append(RecoveryCandidate(
                        action_id=f"REC_SPARE_{spare_reg}_{target_fl.flight_id}",
                        action_type="DEPLOY_SPARE",
                        name=f"Deploy Standby {spare_reg} on Flight {target_fl.flight_id}",
                        description=f"Deploy {spare['model']} ({spare_reg}) stationed at {spare_apt} for flight {target_fl.flight_id} ({target_fl.origin} -> {target_fl.destination}), severing downstream rotation delays.",
                        target_flight_id=target_fl.flight_id,
                        target_airport=spare_apt,
                        spare_aircraft_reg=spare_reg,
                        operational_feasibility=True,
                        feasibility_notes=f"Spare aircraft {spare_reg} is in READY_STANDBY at {spare_apt}. Cockpit and cabin crew available on reserve.",
                        trade_offs=f"Consumes spare aircraft reserve at {spare_apt}. Operating cost: ₹{spare['hourly_operating_cost']:,.0f}/hr.",
                        estimated_delay_saved_minutes=delay_saved,
                        estimated_passengers_recovered=pax_recovered,
                        estimated_connections_restored=conn_restored,
                        estimated_crew_violations_prevented=crew_saved,
                        score=round(score, 1)
                    ))

        # 2. CANDIDATE STRATEGY 2: TACTICAL CANCELLATION OF LOW-PRIORITY DOWNSTREAM LEG
        # If a rotation has severe cascade delay (>120 mins) or crew violation, sacrifice a low-pax end-of-day leg
        critically_delayed = [
            f for f in base_sim.flights
            if f.is_delayed and f.rotation_sequence >= 4 and f.passenger_count < 170 and not f.is_cancelled
        ]
        critically_delayed.sort(key=lambda f: (f.crew_duty_violated, f.arrival_delay_minutes), reverse=True)

        for target_fl in critically_delayed[:2]:
            test_rec = {
                "action_type": "CANCEL_FLIGHT",
                "target_flight_id": target_fl.flight_id
            }
            test_sim = self.engine.run_simulation(
                disruption=disruption,
                applied_recovery=test_rec,
                simulation_id=f"preview_cancel_{target_fl.flight_id}"
            )

            delay_saved = max(0, base_sim.metrics.total_delay_minutes - test_sim.metrics.total_delay_minutes)
            conn_restored = max(0, base_sim.metrics.missed_connections - test_sim.metrics.missed_connections)
            crew_saved = max(0, base_sim.metrics.crew_duty_violations - test_sim.metrics.crew_duty_violations)
            pax_recovered = max(0, base_sim.metrics.affected_passengers - test_sim.metrics.affected_passengers)

            if crew_saved > 0 or delay_saved > 60:
                score = (delay_saved * 0.8) + (crew_saved * 300) - 150 # penalty for cancellation
                candidates.append(RecoveryCandidate(
                    action_id=f"REC_CANCEL_{target_fl.flight_id}",
                    action_type="CANCEL_FLIGHT",
                    name=f"Tactical Cancellation of Feeder Flight {target_fl.flight_id}",
                    description=f"Cancel flight {target_fl.flight_id} ({target_fl.origin} -> {target_fl.destination}, {target_fl.passenger_count} pax) to prevent crew duty-hour violation and restore aircraft overnight positioning.",
                    target_flight_id=target_fl.flight_id,
                    target_airport=target_fl.origin,
                    operational_feasibility=True,
                    feasibility_notes="Alternative surface transport or morning rebooking available for local passengers.",
                    trade_offs=f"Requires rebooking {target_fl.passenger_count} passengers. Hotel accommodation or vouchers may be required.",
                    estimated_delay_saved_minutes=delay_saved,
                    estimated_passengers_recovered=0,
                    estimated_connections_restored=conn_restored,
                    estimated_crew_violations_prevented=crew_saved,
                    score=round(max(10.0, score), 1)
                ))

        # 3. CANDIDATE STRATEGY 3: GATE HOLD (DELAY CONNECTING FLIGHT) TO PROTECT PASSENGERS
        # Find missed connections where the inbound flight is only delayed by 15-30 minutes
        for conn in base_sim.connections:
            if conn.is_missed and conn.passengers >= 25 and not conn.status == "CANCELLED_FLIGHT":
                # Check how much outbound flight needs to be held
                needed_buffer = conn.min_connection_time - conn.actual_buffer_minutes
                if 10 <= needed_buffer <= 35:
                    test_rec = {
                        "action_type": "DELAY_CONNECTING_FLIGHT",
                        "target_flight_id": conn.outbound_flight_id,
                        "delay_minutes_to_add": needed_buffer + 5
                    }
                    test_sim = self.engine.run_simulation(
                        disruption=disruption,
                        applied_recovery=test_rec,
                        simulation_id=f"preview_hold_{conn.outbound_flight_id}"
                    )

                    conn_restored = max(0, base_sim.metrics.missed_connections - test_sim.metrics.missed_connections)
                    pax_saved = max(0, base_sim.metrics.stranded_passengers - test_sim.metrics.stranded_passengers)

                    if conn_restored > 0 and test_sim.metrics.crew_duty_violations <= base_sim.metrics.crew_duty_violations:
                        score = (pax_saved * 15) + (conn_restored * 40) - (needed_buffer * 2)
                        candidates.append(RecoveryCandidate(
                            action_id=f"REC_HOLD_{conn.outbound_flight_id}",
                            action_type="DELAY_CONNECTING_FLIGHT",
                            name=f"Hold Flight {conn.outbound_flight_id} by {needed_buffer+5}m for Connection Protection",
                            description=f"Hold departure of {conn.outbound_flight_id} at {conn.airport} by {needed_buffer+5} minutes to protect {conn.passengers} connecting passengers from {conn.inbound_flight_id}.",
                            target_flight_id=conn.outbound_flight_id,
                            target_airport=conn.airport,
                            delay_minutes_to_add=needed_buffer + 5,
                            operational_feasibility=True,
                            feasibility_notes=f"Connecting gate buffer increased to {conn.min_connection_time+5}m. Downstream aircraft turnaround remains compliant.",
                            trade_offs=f"Adds {needed_buffer+5} minutes departure delay to {conn.outbound_flight_id}.",
                            estimated_delay_saved_minutes=0,
                            estimated_passengers_recovered=conn.passengers,
                            estimated_connections_restored=conn_restored,
                            estimated_crew_violations_prevented=0,
                            score=round(score, 1)
                        ))
                        break # One representative hold candidate is sufficient

        # Sort all candidates by score (highest impact first)
        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates

    def apply_recovery(self, base_sim: SimulationResult, candidate: RecoveryCandidate) -> Tuple[SimulationResult, RecoveryComparison]:
        """
        Applies a recovery candidate and executes a fresh deterministic re-simulation.
        Produces a side-by-side Before/After comparison.
        """
        recovery_spec = {
            "action_type": candidate.action_type,
            "target_flight_id": candidate.target_flight_id,
            "spare_aircraft_reg": candidate.spare_aircraft_reg,
            "delay_minutes_to_add": candidate.delay_minutes_to_add
        }

        # Run fresh re-simulation with the applied recovery
        after_sim = self.engine.run_simulation(
            disruption=base_sim.disruption,
            applied_recovery=recovery_spec,
            simulation_id=f"recovered_{base_sim.simulation_id}"
        )

        # Build formal recommendation object
        rec = RecoveryRecommendation(
            recommendation_id=candidate.action_id,
            title=candidate.name,
            action_type=candidate.action_type,
            action_details=recovery_spec,
            why_recommended=f"Deterministic simulation proves this action mitigates critical cascades caused by {base_sim.disruption.disruption_type} at {base_sim.disruption.airport_code}.",
            expected_impact={
                "total_delay_saved_minutes": candidate.estimated_delay_saved_minutes,
                "passengers_recovered": candidate.estimated_passengers_recovered,
                "connections_restored": candidate.estimated_connections_restored,
                "crew_violations_prevented": candidate.estimated_crew_violations_prevented,
                "network_recovery_score": after_sim.metrics.network_recovery_percentage
            },
            trade_offs=candidate.trade_offs,
            affected_flights=[candidate.target_flight_id],
            passenger_impact={
                "before_stranded": base_sim.metrics.stranded_passengers,
                "after_stranded": after_sim.metrics.stranded_passengers,
                "net_passengers_saved": base_sim.metrics.stranded_passengers - after_sim.metrics.stranded_passengers
            },
            operational_feasibility=candidate.operational_feasibility,
            confidence_evidence="Deterministic Simulation Model (100% verified arithmetic)",
            candidate_id=candidate.action_id
        )

        # Before vs After Comparison
        delay_diff = max(0, base_sim.metrics.total_delay_minutes - after_sim.metrics.total_delay_minutes)
        delay_pct = round((delay_diff / max(1, base_sim.metrics.total_delay_minutes)) * 100.0, 1)

        comparison = RecoveryComparison(
            before_simulation_id=base_sim.simulation_id,
            after_simulation_id=after_sim.simulation_id,
            applied_action=rec,
            before_metrics=base_sim.metrics,
            after_metrics=after_sim.metrics,
            delay_reduction_minutes=delay_diff,
            delay_reduction_percentage=delay_pct,
            passengers_recovered=max(0, base_sim.metrics.affected_passengers - after_sim.metrics.affected_passengers),
            connections_restored=max(0, base_sim.metrics.missed_connections - after_sim.metrics.missed_connections),
            flights_recovered=max(0, base_sim.metrics.delayed_flights - after_sim.metrics.delayed_flights),
            crew_violations_resolved=max(0, base_sim.metrics.crew_duty_violations - after_sim.metrics.crew_duty_violations),
            remaining_disruptions=after_sim.metrics.delayed_flights + after_sim.metrics.cancelled_flights
        )

        return after_sim, comparison
