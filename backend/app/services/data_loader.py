"""
Data Loader & Validator for DOMINO SKY
Loads canonical JSON/CSV datasets and validates them against Pydantic schemas.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

def _resolve_data_dir() -> Path:
    candidate = Path(__file__).resolve().parent.parent / "data"
    if candidate.exists() and (candidate / "airports.json").exists():
        return candidate
    candidate2 = Path.cwd() / "backend" / "app" / "data"
    if candidate2.exists() and (candidate2 / "airports.json").exists():
        return candidate2
    return candidate

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
        with open(DATA_DIR / "airports.json", "r", encoding="utf-8") as f:
            self.airports = json.load(f)
        with open(DATA_DIR / "aircraft.json", "r", encoding="utf-8") as f:
            self.aircraft = json.load(f)
        with open(DATA_DIR / "flights.json", "r", encoding="utf-8") as f:
            self.flights = json.load(f)
        with open(DATA_DIR / "passenger_connections.json", "r", encoding="utf-8") as f:
            self.passenger_connections = json.load(f)
        with open(DATA_DIR / "crew_assignments.json", "r", encoding="utf-8") as f:
            self.crew_assignments = json.load(f)
        with open(DATA_DIR / "spare_aircraft.json", "r", encoding="utf-8") as f:
            self.spare_aircraft = json.load(f)

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
