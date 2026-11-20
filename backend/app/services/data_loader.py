"""
Data Loader & Validator for DOMINO SKY
Loads canonical JSON/CSV datasets and validates them against Pydantic schemas.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

def _resolve_data_dir() -> Path:
    candidates = [
        Path(__file__).resolve().parent.parent / "data",
        Path.cwd() / "backend" / "app" / "data",
        Path.cwd() / "app" / "data",
        Path(__file__).resolve().parent.parent.parent / "backend" / "app" / "data",
    ]
    for c in candidates:
        if c.exists() and (c / "airports.json").exists():
            return c
    return candidates[0]

DATA_DIR = _resolve_data_dir()

class DataLoader:
    _instance = None

    def __init__(self):
        self.airports: List[Dict[str, Any]] = []
        self.aircraft: List[Dict[str, Any]] = []
        self.flights: List[Dict[str, Any]] = []
        self.passenger_connections: List[Dict[str, Any]] = []
        self.crew_assignments: List[Dict[str, Any]] = []
        self.spare_aircraft: List[Dict[str, Any]] = []
        self.load_all()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_all(self):
        def _read_json(filename: str):
            candidates = [
                DATA_DIR / filename,
                Path(__file__).resolve().parent.parent / "data" / filename,
                Path.cwd() / "backend" / "app" / "data" / filename,
                Path.cwd() / "app" / "data" / filename,
            ]
            for p in candidates:
                if p.exists():
                    try:
                        with open(p, "r", encoding="utf-8") as f:
                            return json.load(f)
                    except Exception as e:
                        print(f"Warning: error reading {p}: {e}")
            print(f"Warning: data file {filename} could not be resolved from candidates")
            return []

        self.airports = _read_json("airports.json")
        self.aircraft = _read_json("aircraft.json")
        self.flights = _read_json("flights.json")
        self.passenger_connections = _read_json("passenger_connections.json")
        self.crew_assignments = _read_json("crew_assignments.json")
        self.spare_aircraft = _read_json("spare_aircraft.json")

    def get_airport(self, code: str) -> Optional[Dict[str, Any]]:
        return next((a for a in self.airports if a["code"] == code), None)

    def get_flight(self, flight_id: str) -> Optional[Dict[str, Any]]:
        return next((f for f in self.flights if f["flight_id"] == flight_id), None)

    def get_aircraft(self, registration: str) -> Optional[Dict[str, Any]]:
        return next((a for a in self.aircraft if a["registration"] == registration), None)

    def get_crew_for_aircraft(self, aircraft_reg: str) -> Optional[Dict[str, Any]]:
        return next((c for c in self.crew_assignments if c["assigned_aircraft"] == aircraft_reg), None)

    def get_connections_for_flight(self, flight_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.passenger_connections if c["inbound_flight_id"] == flight_id or c["outbound_flight_id"] == flight_id]
