"""
Dataset Generator for DOMINO SKY
Generates the canonical dataset matching the problem statement specifications:
- 16 Airports across India
- 16 Aircraft (14 active + 2 ready spares)
- 70 Flights forming realistic daily aircraft rotations
- Passenger Connections with minimum connection times
- Crew Assignments with DGCA-aligned Flight Duty Period (FDP) limits
- Spare Aircraft available at key hubs (BOM, DEL)
"""

import json
import csv
from pathlib import Path

DATA_DIR = Path(__file__).parent

# 1. 16 AIRPORTS
AIRPORTS = [
    {
        "code": "BOM",
        "icao": "VABB",
        "name": "Chhatrapati Shivaji Maharaj International Airport",
        "city": "Mumbai",
        "state": "Maharashtra",
        "latitude": 19.0896,
        "longitude": 72.8656,
        "runways": 2,
        "capacity_per_hour": 38,
        "min_turnaround_time": 45,
        "is_hub": True
    },
    {
        "code": "DEL",
        "icao": "VIDP",
        "name": "Indira Gandhi International Airport",
        "city": "Delhi",
        "state": "Delhi",
        "latitude": 28.5562,
        "longitude": 77.1000,
        "runways": 3,
        "capacity_per_hour": 50,
        "min_turnaround_time": 45,
        "is_hub": True
    },
    {
        "code": "BLR",
        "icao": "VOBL",
        "name": "Kempegowda International Airport",
        "city": "Bengaluru",
        "state": "Karnataka",
        "latitude": 13.1986,
        "longitude": 77.7066,
        "runways": 2,
        "capacity_per_hour": 35,
        "min_turnaround_time": 40,
        "is_hub": True
    },
    {
        "code": "CCU",
        "icao": "VECC",
        "name": "Netaji Subhash Chandra Bose International Airport",
        "city": "Kolkata",
        "state": "West Bengal",
        "latitude": 22.6547,
        "longitude": 88.4467,
        "runways": 2,
        "capacity_per_hour": 30,
        "min_turnaround_time": 40,
        "is_hub": True
    },
    {
        "code": "MAA",
        "icao": "VOMM",
        "name": "Chennai International Airport",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "latitude": 12.9941,
        "longitude": 80.1709,
        "runways": 2,
        "capacity_per_hour": 32,
        "min_turnaround_time": 40,
        "is_hub": True
    },
    {
        "code": "HYD",
        "icao": "VOHS",
        "name": "Rajiv Gandhi International Airport",
        "city": "Hyderabad",
        "state": "Telangana",
        "latitude": 17.2403,
        "longitude": 78.4294,
        "runways": 2,
        "capacity_per_hour": 32,
        "min_turnaround_time": 40,
        "is_hub": True
    },
    {
        "code": "GOI",
        "icao": "VOGO",
        "name": "Dabolim International Airport",
        "city": "Goa",
        "state": "Goa",
        "latitude": 15.3808,
        "longitude": 73.8314,
        "runways": 1,
        "capacity_per_hour": 18,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "PNQ",
        "icao": "VAPO",
        "name": "Pune International Airport",
        "city": "Pune",
        "state": "Maharashtra",
        "latitude": 18.5822,
        "longitude": 73.9197,
        "runways": 1,
        "capacity_per_hour": 20,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "AMD",
        "icao": "VAAH",
        "name": "Sardar Vallabhbhai Patel International Airport",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "latitude": 23.0734,
        "longitude": 72.6347,
        "runways": 1,
        "capacity_per_hour": 24,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "COK",
        "icao": "VOCI",
        "name": "Cochin International Airport",
        "city": "Kochi",
        "state": "Kerala",
        "latitude": 10.1518,
        "longitude": 76.3930,
        "runways": 1,
        "capacity_per_hour": 22,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "JAI",
        "icao": "VIJP",
        "name": "Jaipur International Airport",
        "city": "Jaipur",
        "state": "Rajasthan",
        "latitude": 26.8242,
        "longitude": 75.8122,
        "runways": 1,
        "capacity_per_hour": 20,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "LKO",
        "icao": "VILK",
        "name": "Chaudhary Charan Singh International Airport",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "latitude": 26.7606,
        "longitude": 80.8893,
        "runways": 1,
        "capacity_per_hour": 18,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "GAU",
        "icao": "VEGT",
        "name": "Lokpriya Gopinath Bordoloi International Airport",
        "city": "Guwahati",
        "state": "Assam",
        "latitude": 26.1061,
        "longitude": 91.5859,
        "runways": 1,
        "capacity_per_hour": 16,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "PAT",
        "icao": "VEPT",
        "name": "Jay Prakash Narayan Airport",
        "city": "Patna",
        "state": "Bihar",
        "latitude": 25.5913,
        "longitude": 85.0880,
        "runways": 1,
        "capacity_per_hour": 15,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "TRV",
        "icao": "VOTV",
        "name": "Trivandrum International Airport",
        "city": "Thiruvananthapuram",
        "state": "Kerala",
        "latitude": 8.4821,
        "longitude": 76.9200,
        "runways": 1,
        "capacity_per_hour": 16,
        "min_turnaround_time": 35,
        "is_hub": False
    },
    {
        "code": "IXC",
        "icao": "VICG",
        "name": "Shaheed Bhagat Singh International Airport",
        "city": "Chandigarh",
        "state": "Punjab / Haryana",
        "latitude": 30.6735,
        "longitude": 76.7885,
        "runways": 1,
        "capacity_per_hour": 16,
        "min_turnaround_time": 35,
        "is_hub": False
    }
]

# 2. 16 AIRCRAFT (14 Active Rotations + 2 Dedicated Spares)
AIRCRAFT = [
    {"registration": "VT-ABC", "model": "Airbus A320neo", "capacity": 186, "base_airport": "BLR", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-DEF", "model": "Airbus A320neo", "capacity": 186, "base_airport": "BOM", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-GHI", "model": "Airbus A321neo", "capacity": 222, "base_airport": "DEL", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-JKL", "model": "Airbus A320neo", "capacity": 180, "base_airport": "CCU", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-MNO", "model": "Boeing 737 MAX 8", "capacity": 189, "base_airport": "HYD", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-PQR", "model": "Airbus A320neo", "capacity": 180, "base_airport": "MAA", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-STU", "model": "Airbus A321neo", "capacity": 222, "base_airport": "DEL", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-VWX", "model": "Airbus A320neo", "capacity": 186, "base_airport": "BOM", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-YZA", "model": "Boeing 737-800", "capacity": 180, "base_airport": "BLR", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-BCD", "model": "Airbus A320neo", "capacity": 186, "base_airport": "PNQ", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-EFG", "model": "Airbus A320neo", "capacity": 180, "base_airport": "AMD", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-HIJ", "model": "Airbus A321neo", "capacity": 222, "base_airport": "DEL", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-KLM", "model": "Airbus A320neo", "capacity": 186, "base_airport": "COK", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-NOP", "model": "Boeing 737 MAX 8", "capacity": 189, "base_airport": "JAI", "is_spare": False, "status": "AVAILABLE"},
    {"registration": "VT-SP1", "model": "Airbus A320neo", "capacity": 186, "base_airport": "BOM", "is_spare": True, "status": "READY_STANDBY"},
    {"registration": "VT-SP2", "model": "Airbus A320neo", "capacity": 186, "base_airport": "DEL", "is_spare": True, "status": "READY_STANDBY"},
]

# 3. 70 FLIGHTS (14 Aircraft x 5 Leg Daily Rotations)
# Exactly matching the prompt's reference rotation:
# VT-ABC: BLR -> BOM -> CCU -> DEL, and connecting downline
FLIGHT_ROTATIONS = [
    # VT-ABC (Base: BLR)
    [
        ("DS-101", "BLR", "BOM", "06:00", "07:40", 168),
        ("DS-102", "BOM", "CCU", "08:30", "11:15", 175),
        ("DS-103", "CCU", "DEL", "12:05", "14:35", 182),
        ("DS-104", "DEL", "BLR", "15:30", "18:15", 179),
        ("DS-105", "BLR", "HYD", "19:10", "20:20", 152),
    ],
    # VT-DEF (Base: BOM)
    [
        ("DS-111", "BOM", "DEL", "06:30", "08:45", 178),
        ("DS-112", "DEL", "BOM", "09:35", "11:50", 182),
        ("DS-113", "BOM", "MAA", "12:45", "14:40", 165),
        ("DS-114", "MAA", "BOM", "15:35", "17:30", 170),
        ("DS-115", "BOM", "GOI", "18:25", "19:30", 155),
    ],
    # VT-GHI (Base: DEL)
    [
        ("DS-121", "DEL", "BLR", "06:15", "09:00", 210),
        ("DS-122", "BLR", "DEL", "09:50", "12:35", 215),
        ("DS-123", "DEL", "BOM", "13:25", "15:35", 208),
        ("DS-124", "BOM", "PNQ", "16:25", "17:20", 165),
        ("DS-125", "PNQ", "DEL", "18:15", "20:30", 195),
    ],
    # VT-JKL (Base: CCU)
    [
        ("DS-131", "CCU", "GAU", "06:45", "08:00", 150),
        ("DS-132", "GAU", "CCU", "08:45", "10:00", 158),
        ("DS-133", "CCU", "BOM", "10:50", "13:35", 172),
        ("DS-134", "BOM", "PAT", "14:25", "16:55", 164),
        ("DS-135", "PAT", "CCU", "17:45", "18:55", 148),
    ],
    # VT-MNO (Base: HYD)
    [
        ("DS-141", "HYD", "BOM", "07:00", "08:30", 175),
        ("DS-142", "BOM", "AMD", "09:20", "10:35", 168),
        ("DS-143", "AMD", "DEL", "11:25", "13:00", 172),
        ("DS-144", "DEL", "HYD", "13:50", "16:05", 180),
        ("DS-145", "HYD", "MAA", "17:00", "18:15", 160),
    ],
    # VT-PQR (Base: MAA)
    [
        ("DS-151", "MAA", "COK", "06:30", "07:45", 155),
        ("DS-152", "COK", "BLR", "08:30", "09:35", 162),
        ("DS-153", "BLR", "BOM", "10:25", "12:05", 174),
        ("DS-154", "BOM", "IXC", "12:55", "15:15", 165),
        ("DS-155", "IXC", "BOM", "16:05", "18:25", 168),
    ],
    # VT-STU (Base: DEL)
    [
        ("DS-161", "DEL", "JAI", "07:15", "08:15", 190),
        ("DS-162", "JAI", "BOM", "09:00", "10:50", 195),
        ("DS-163", "BOM", "BLR", "11:45", "13:30", 212),
        ("DS-164", "BLR", "CCU", "14:20", "16:55", 205),
        ("DS-165", "CCU", "DEL", "17:45", "20:15", 214),
    ],
    # VT-VWX (Base: BOM)
    [
        ("DS-171", "BOM", "GOI", "07:30", "08:35", 160),
        ("DS-172", "GOI", "BOM", "09:20", "10:25", 158),
        ("DS-173", "BOM", "LKO", "11:15", "13:25", 174),
        ("DS-174", "LKO", "DEL", "14:15", "15:25", 165),
        ("DS-175", "DEL", "BOM", "16:15", "18:30", 176),
    ],
    # VT-YZA (Base: BLR)
    [
        ("DS-181", "BLR", "TRV", "06:30", "07:45", 152),
        ("DS-182", "TRV", "BLR", "08:30", "09:45", 156),
        ("DS-183", "BLR", "BOM", "10:30", "12:15", 168),
        ("DS-184", "BOM", "HYD", "13:05", "14:35", 162),
        ("DS-185", "HYD", "BLR", "15:25", "16:35", 158),
    ],
    # VT-BCD (Base: PNQ)
    [
        ("DS-191", "PNQ", "DEL", "07:30", "09:45", 170),
        ("DS-192", "DEL", "PAT", "11:45", "13:25", 165),
        ("DS-193", "PAT", "DEL", "14:10", "15:50", 168),
        ("DS-194", "DEL", "BOM", "16:40", "18:55", 178),
        ("DS-195", "BOM", "PNQ", "19:40", "20:35", 160),
    ],
    # VT-EFG (Base: AMD)
    [
        ("DS-201", "AMD", "BOM", "06:30", "07:45", 165),
        ("DS-202", "BOM", "DEL", "08:35", "10:50", 174),
        ("DS-203", "DEL", "LKO", "11:40", "12:50", 162),
        ("DS-204", "LKO", "CCU", "13:35", "15:15", 158),
        ("DS-205", "CCU", "AMD", "16:05", "18:45", 166),
    ],
    # VT-HIJ (Base: DEL)
    [
        ("DS-211", "DEL", "COK", "06:00", "09:15", 210),
        ("DS-212", "COK", "DEL", "10:05", "13:20", 205),
        ("DS-213", "DEL", "BOM", "14:10", "16:20", 215),
        ("DS-214", "BOM", "CCU", "17:10", "19:55", 208),
        ("DS-215", "CCU", "GAU", "20:45", "22:00", 185),
    ],
    # VT-KLM (Base: COK)
    [
        ("DS-221", "COK", "BOM", "06:15", "08:15", 170),
        ("DS-222", "BOM", "JAI", "09:05", "10:55", 165),
        ("DS-223", "JAI", "DEL", "11:40", "12:40", 158),
        ("DS-224", "DEL", "BLR", "13:30", "16:15", 176),
        ("DS-225", "BLR", "COK", "17:05", "18:15", 160),
    ],
    # VT-NOP (Base: JAI)
    [
        ("DS-231", "JAI", "DEL", "06:30", "07:30", 168),
        ("DS-232", "DEL", "BOM", "08:20", "10:35", 178),
        ("DS-233", "BOM", "MAA", "11:25", "13:20", 170),
        ("DS-234", "MAA", "HYD", "14:10", "15:25", 164),
        ("DS-235", "HYD", "DEL", "16:15", "18:30", 172),
    ],
]

FLIGHTS = []
active_aircraft = [ac for ac in AIRCRAFT if not ac["is_spare"]]

for idx, rotation in enumerate(FLIGHT_ROTATIONS):
    aircraft = active_aircraft[idx]
    for leg_seq, leg in enumerate(rotation):
        flight_id, origin, dest, dep_time, arr_time, pax = leg
        
        # Calculate flight duration in minutes
        dep_h, dep_m = map(int, dep_time.split(":"))
        arr_h, arr_m = map(int, arr_time.split(":"))
        duration_mins = (arr_h * 60 + arr_m) - (dep_h * 60 + dep_m)
        if duration_mins < 0:
            duration_mins += 24 * 60
            
        FLIGHTS.append({
            "flight_id": flight_id,
            "flight_number": flight_id,
            "origin": origin,
            "destination": dest,
            "scheduled_departure": dep_time,
            "scheduled_arrival": arr_time,
            "duration_minutes": duration_mins,
            "assigned_aircraft": aircraft["registration"],
            "aircraft_model": aircraft["model"],
            "rotation_sequence": leg_seq + 1,
            "total_rotation_legs": len(rotation),
            "passenger_count": pax,
            "capacity": aircraft["capacity"],
            "load_factor": round((pax / aircraft["capacity"]) * 100, 1),
            "priority": "HIGH" if pax >= 175 else "MEDIUM"
        })

# 4. PASSENGER CONNECTIONS (Itineraries with inbound & outbound flights)
# All connections in baseline schedule have >= 45m connection buffer
PASSENGER_CONNECTIONS = [
    # BOM connections (Crucial hub cascade test cases)
    {"connection_id": "CONN-101-102", "inbound_flight_id": "DS-101", "outbound_flight_id": "DS-102", "airport": "BOM", "passengers": 42, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 3},
    {"connection_id": "CONN-101-142", "inbound_flight_id": "DS-101", "outbound_flight_id": "DS-142", "airport": "BOM", "passengers": 28, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-141-173", "inbound_flight_id": "DS-141", "outbound_flight_id": "DS-173", "airport": "BOM", "passengers": 35, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-141-142", "inbound_flight_id": "DS-141", "outbound_flight_id": "DS-142", "airport": "BOM", "passengers": 22, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-201-102", "inbound_flight_id": "DS-201", "outbound_flight_id": "DS-102", "airport": "BOM", "passengers": 25, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-201-202", "inbound_flight_id": "DS-201", "outbound_flight_id": "DS-202", "airport": "BOM", "passengers": 38, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 4},
    {"connection_id": "CONN-221-173", "inbound_flight_id": "DS-221", "outbound_flight_id": "DS-173", "airport": "BOM", "passengers": 30, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-221-222", "inbound_flight_id": "DS-221", "outbound_flight_id": "DS-222", "airport": "BOM", "passengers": 26, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-172-173", "inbound_flight_id": "DS-172", "outbound_flight_id": "DS-173", "airport": "BOM", "passengers": 32, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-162-163", "inbound_flight_id": "DS-162", "outbound_flight_id": "DS-163", "airport": "BOM", "passengers": 36, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-183-184", "inbound_flight_id": "DS-183", "outbound_flight_id": "DS-184", "airport": "BOM", "passengers": 29, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-153-154", "inbound_flight_id": "DS-153", "outbound_flight_id": "DS-154", "airport": "BOM", "passengers": 24, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-112-113", "inbound_flight_id": "DS-112", "outbound_flight_id": "DS-113", "airport": "BOM", "passengers": 40, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 3},
    {"connection_id": "CONN-133-134", "inbound_flight_id": "DS-133", "outbound_flight_id": "DS-134", "airport": "BOM", "passengers": 31, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    
    # DEL connections
    {"connection_id": "CONN-202-192", "inbound_flight_id": "DS-202", "outbound_flight_id": "DS-192", "airport": "DEL", "passengers": 32, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-191-192", "inbound_flight_id": "DS-191", "outbound_flight_id": "DS-192", "airport": "DEL", "passengers": 25, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-231-232", "inbound_flight_id": "DS-231", "outbound_flight_id": "DS-232", "airport": "DEL", "passengers": 34, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-143-144", "inbound_flight_id": "DS-143", "outbound_flight_id": "DS-144", "airport": "DEL", "passengers": 27, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-103-104", "inbound_flight_id": "DS-103", "outbound_flight_id": "DS-104", "airport": "DEL", "passengers": 44, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 3},
    {"connection_id": "CONN-122-123", "inbound_flight_id": "DS-122", "outbound_flight_id": "DS-123", "airport": "DEL", "passengers": 38, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-202-203", "inbound_flight_id": "DS-202", "outbound_flight_id": "DS-203", "airport": "DEL", "passengers": 29, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-223-224", "inbound_flight_id": "DS-223", "outbound_flight_id": "DS-224", "airport": "DEL", "passengers": 31, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-212-213", "inbound_flight_id": "DS-212", "outbound_flight_id": "DS-213", "airport": "DEL", "passengers": 33, "min_connection_time": 45, "baggage_transfer": True, "vip_pax": 1},

    # CCU, BLR, HYD, MAA connections
    {"connection_id": "CONN-102-103", "inbound_flight_id": "DS-102", "outbound_flight_id": "DS-103", "airport": "CCU", "passengers": 37, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-132-133", "inbound_flight_id": "DS-132", "outbound_flight_id": "DS-133", "airport": "CCU", "passengers": 26, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-164-165", "inbound_flight_id": "DS-164", "outbound_flight_id": "DS-165", "airport": "CCU", "passengers": 30, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-121-122", "inbound_flight_id": "DS-121", "outbound_flight_id": "DS-122", "airport": "BLR", "passengers": 39, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 2},
    {"connection_id": "CONN-152-153", "inbound_flight_id": "DS-152", "outbound_flight_id": "DS-153", "airport": "BLR", "passengers": 28, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-182-183", "inbound_flight_id": "DS-182", "outbound_flight_id": "DS-183", "airport": "BLR", "passengers": 22, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-144-145", "inbound_flight_id": "DS-144", "outbound_flight_id": "DS-145", "airport": "HYD", "passengers": 32, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 1},
    {"connection_id": "CONN-113-114", "inbound_flight_id": "DS-113", "outbound_flight_id": "DS-114", "airport": "MAA", "passengers": 27, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 0},
    {"connection_id": "CONN-233-234", "inbound_flight_id": "DS-233", "outbound_flight_id": "DS-234", "airport": "MAA", "passengers": 25, "min_connection_time": 40, "baggage_transfer": True, "vip_pax": 1},
]

# 5. CREW ASSIGNMENTS (Pilots and Cabin Crew with DGCA Duty Limits)
# In real airlines, a crew pairing typically covers 3 consecutive legs (approx 8-9 hours FDP).
# Legs 1-3 are operated by Crew Shift A, with scheduled duty ~520-550 mins (safely under 600m max).
# If a disruption adds >50-80 mins delay, it pushes them over 600 mins, causing a violation!
CREW_ASSIGNMENTS = []
for idx, aircraft in enumerate(active_aircraft):
    crew_id = f"CREW-{idx+1:02d}"
    captain_name = f"Capt. {['Sharma', 'Verma', 'Kapoor', 'Rao', 'Iyer', 'Patel', 'Sen', 'Singh', 'Nair', 'Mehta', 'Gupta', 'Menon', 'Reddy', 'Bose'][idx]}"
    fo_name = f"FO {['Saxena', 'Deshmukh', 'Chopra', 'Natarajan', 'Pillai', 'Joshi', 'Mukherjee', 'Kaur', 'Kurian', 'Shah', 'Agarwal', 'Mathew', 'Yadav', 'Ghosh'][idx]}"
    
    # Assign standard airline duty pairings: 2 to 3 legs so that baseline duty is ~450-520 mins.
    all_rot_fls = [f["flight_id"] for f in FLIGHTS if f["assigned_aircraft"] == aircraft["registration"]]
    first_fl = next(f for f in FLIGHTS if f["flight_id"] == all_rot_fls[0])
    second_fl = next(f for f in FLIGHTS if f["flight_id"] == all_rot_fls[1])
    third_fl = next(f for f in FLIGHTS if f["flight_id"] == all_rot_fls[2])

    dep_h, dep_m = map(int, first_fl["scheduled_departure"].split(":"))
    duty_start_mins = (dep_h * 60 + dep_m) - 45
    duty_start_str = f"{duty_start_mins // 60:02d}:{duty_start_mins % 60:02d}"

    arr_3_h, arr_3_m = map(int, third_fl["scheduled_arrival"].split(":"))
    duty_3_mins = (arr_3_h * 60 + arr_3_m) - duty_start_mins

    # Threshold: up to 570 minutes in baseline is acceptable (under 600m max FDP).
    # This allows 3-leg pairings like VT-ABC (560m baseline) which will legally violate FDP when delayed.
    if duty_3_mins > 570:
        rotation_flights = all_rot_fls[:2]
    else:
        rotation_flights = all_rot_fls[:3]
    
    CREW_ASSIGNMENTS.append({
        "crew_id": crew_id,
        "assigned_aircraft": aircraft["registration"],
        "captain": captain_name,
        "first_officer": fo_name,
        "cabin_lead": f"Lead CC {idx+1}",
        "cabin_crew_count": 4,
        "duty_start_time": duty_start_str,
        "max_fdp_minutes": 600,  # 10 hours regulatory limit
        "rest_period_required_minutes": 720, # 12 hours minimum rest
        "assigned_flight_ids": rotation_flights,
        "home_base": aircraft["base_airport"],
        "status": "ON_DUTY"
    })

# 6. SPARE AIRCRAFT
SPARE_AIRCRAFT = [
    {
        "registration": "VT-SP1",
        "model": "Airbus A320neo",
        "capacity": 186,
        "current_airport": "BOM",
        "available_from": "06:00",
        "turnaround_ready_minutes": 30,
        "hourly_operating_cost": 250000,
        "compatible_aircraft_models": ["Airbus A320neo", "Airbus A321neo", "Boeing 737-800"],
        "status": "READY_STANDBY"
    },
    {
        "registration": "VT-SP2",
        "model": "Airbus A320neo",
        "capacity": 186,
        "current_airport": "DEL",
        "available_from": "06:00",
        "turnaround_ready_minutes": 30,
        "hourly_operating_cost": 250000,
        "compatible_aircraft_models": ["Airbus A320neo", "Airbus A321neo", "Boeing 737 MAX 8"],
        "status": "READY_STANDBY"
    }
]

def save_datasets():
    # Save JSON files
    with open(DATA_DIR / "airports.json", "w") as f:
        json.dump(AIRPORTS, f, indent=2)
    with open(DATA_DIR / "aircraft.json", "w") as f:
        json.dump(AIRCRAFT, f, indent=2)
    with open(DATA_DIR / "flights.json", "w") as f:
        json.dump(FLIGHTS, f, indent=2)
    with open(DATA_DIR / "passenger_connections.json", "w") as f:
        json.dump(PASSENGER_CONNECTIONS, f, indent=2)
    with open(DATA_DIR / "crew_assignments.json", "w") as f:
        json.dump(CREW_ASSIGNMENTS, f, indent=2)
    with open(DATA_DIR / "spare_aircraft.json", "w") as f:
        json.dump(SPARE_AIRCRAFT, f, indent=2)

    # Save CSV files for transparency and data portability
    def write_csv(filename, data_list):
        if not data_list:
            return
        keys = data_list[0].keys()
        with open(DATA_DIR / filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for row in data_list:
                cleaned_row = {}
                for k, v in row.items():
                    if isinstance(v, (list, dict)):
                        cleaned_row[k] = json.dumps(v)
                    else:
                        cleaned_row[k] = v
                writer.writerow(cleaned_row)

    write_csv("airports.csv", AIRPORTS)
    write_csv("aircraft.csv", AIRCRAFT)
    write_csv("flights.csv", FLIGHTS)
    write_csv("passenger_connections.csv", PASSENGER_CONNECTIONS)
    write_csv("crew_assignments.csv", CREW_ASSIGNMENTS)
    write_csv("spare_aircraft.csv", SPARE_AIRCRAFT)

    print(f"Generated {len(AIRPORTS)} airports")
    print(f"Generated {len(AIRCRAFT)} aircraft")
    print(f"Generated {len(FLIGHTS)} flights")
    print(f"Generated {len(PASSENGER_CONNECTIONS)} passenger connections")
    print(f"Generated {len(CREW_ASSIGNMENTS)} crew assignments")
    print(f"Generated {len(SPARE_AIRCRAFT)} spare aircraft")

if __name__ == "__main__":
    save_datasets()
