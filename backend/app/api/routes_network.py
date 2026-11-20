"""
Network & Static Data API Routes
Provides airports, aircraft, and baseline route topology.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.services.data_loader import DataLoader
from app.schemas.schemas import AirportBase, AircraftBase

router = APIRouter(prefix="/api/network", tags=["Network"])
data_loader = DataLoader.get_instance()

@router.get("/airports", response_model=List[Dict[str, Any]])
def get_airports():
    """Retrieve all 16 network airports with coordinates and capacities."""
    return data_loader.airports

@router.get("/airports/{code}")
def get_airport(code: str):
    """Retrieve detailed metadata for a single airport."""
    apt = data_loader.get_airport(code.upper())
    if not apt:
        raise HTTPException(status_code=404, detail=f"Airport {code} not found")
    return apt

@router.get("/aircraft", response_model=List[Dict[str, Any]])
def get_aircraft():
    """Retrieve all 16 aircraft in the fleet (14 active + 2 spare aircraft)."""
    return data_loader.aircraft

@router.get("/spare-aircraft")
def get_spare_aircraft():
    """Retrieve standby spare aircraft details."""
    return data_loader.spare_aircraft

@router.get("/routes")
def get_route_network():
    """
    Returns unique airport-pair flight routes with geographic lines,
    frequency, and assigned aircraft rotations for map rendering.
    """
    routes_dict = {}
    airports_map = {a["code"]: a for a in data_loader.airports}

    for f in data_loader.flights:
        orig = f["origin"]
        dest = f["destination"]
        pair_key = tuple(sorted([orig, dest]))

        if pair_key not in routes_dict:
            orig_apt = airports_map.get(orig)
            dest_apt = airports_map.get(dest)
            if orig_apt and dest_apt:
                routes_dict[pair_key] = {
                    "origin": orig,
                    "destination": dest,
                    "origin_coords": [orig_apt["latitude"], orig_apt["longitude"]],
                    "destination_coords": [dest_apt["latitude"], dest_apt["longitude"]],
                    "flight_count": 0,
                    "flight_ids": []
                }
        if pair_key in routes_dict:
            routes_dict[pair_key]["flight_count"] += 1
            routes_dict[pair_key]["flight_ids"].append(f["flight_id"])

    return list(routes_dict.values())
