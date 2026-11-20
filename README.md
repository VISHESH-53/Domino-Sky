# DOMINO SKY — Airline Disruption Intelligence & Recovery Simulator

> **"One disruption. Hundreds of consequences. One intelligent recovery system."**

DOMINO SKY is a production-quality, interactive airline network operations command centre (AOC) and recovery simulator. It models the cascading "domino effect" of airport closures and weather disruptions across an airline network—and combines deterministic simulation with AI-assisted dispatch intelligence to recommend, preview, and apply mathematically verified recovery strategies.

---

## ✈️ Key System Capabilities

- **100% Deterministic Arithmetic Core**: Delays, turnaround buffers, passenger connection failures, stranded passenger counts, and crew duty violations are calculated exclusively by deterministic backend logic. AI is never permitted to calculate or invent operational figures.
- **Cascading Rotation Graph Engine**: Models aircraft tail rotations (e.g. VT-ABC: BLR → BOM → CCU → DEL). A single delay at Mumbai airport holds downline departures at Kolkata and Delhi, even with perfectly clear weather at those airports.
- **Strict DGCA Flight Duty Period (FDP) Compliance**: Tracks cumulative crew duty hours across assigned sectors against the 600-minute (10-hour) legal threshold, flagging downstream duty violations.
- **Passenger Connection & Stranded Pax Analyzer**: Evaluates hundreds of multi-leg passenger itineraries against 40-45 minute Minimum Connection Times (MCT). Distinguishes between stranded passengers (no onward same-day flight) and rebookable passengers without duplicate counting.
- **SKY-MIND AI Dispatcher**: Autonomous recovery intelligence layer that analyzes simulation outputs and recommends operational interventions (spare aircraft deployment, tactical cancellations, connection gate holds). Enforces strict numerical validation against simulation ground truth to guarantee zero hallucinations.
- **Side-by-Side Recovery Comparison**: Split-screen Before/After recovery dashboard displaying net deltas for delay minutes reduced, punctuality percentage, passengers rescued, and crew legality restored.
- **Aviation Command Center UI**: Built with a deep navy and electric cyan Bloomberg Terminal-inspired aesthetic, featuring an interactive SVG geospatial map of India, animated route pulses, and an interactive timeline scrub bar.

---

## 📊 Dataset Specification (Source of Truth)

The system is seeded with a comprehensive, canonical dataset located in `backend/app/data/` (available in both JSON and CSV formats):

1. **16 Airports Across India**:
   - `BOM` (Mumbai - Hub), `DEL` (Delhi - Hub), `BLR` (Bengaluru - Hub), `CCU` (Kolkata - Hub), `MAA` (Chennai - Hub), `HYD` (Hyderabad - Hub)
   - `GOI` (Goa), `PNQ` (Pune), `AMD` (Ahmedabad), `COK` (Kochi), `JAI` (Jaipur), `LKO` (Lucknow), `GAU` (Guwahati), `PAT` (Patna), `TRV` (Thiruvananthapuram), `IXC` (Chandigarh)
   - Real-world GPS coordinates, runway counts, hourly capacities, and minimum turnaround times (35-45 mins).
2. **16 Aircraft Fleet**:
   - 14 Active Aircraft: `VT-ABC`, `VT-DEF`, `VT-GHI`, `VT-JKL`, `VT-MNO`, `VT-PQR`, `VT-STU`, `VT-VWX`, `VT-YZA`, `VT-BCD`, `VT-EFG`, `VT-HIJ`, `VT-KLM`, `VT-NOP`
   - 2 Ready Reserve Spares: `VT-SP1` (Base: BOM, 186 seats), `VT-SP2` (Base: DEL, 186 seats)
3. **70 Flights (Daily Rotations)**:
   - 14 active rotations × 5 sectors daily (06:00 to 23:45).
   - Features the exact reference rotation: `VT-ABC` operating `BLR (06:00) → BOM (07:40/08:30) → CCU (11:15/12:05) → DEL (14:35/15:30) → BLR (18:15/19:10)`.
4. **32 Passenger Connections**:
   - Multi-leg connecting itineraries across key hubs with minimum connection times (40-45 mins).
5. **14 Crew Assignments**:
   - Captain, First Officer, Cabin Crew lead, and crew members assigned to pairings with 600-minute maximum Flight Duty Period (FDP) limits.
6. **2 Standby Spare Aircraft**:
   - Stationed at BOM and DEL with operating costs, model compatibility, and 30-minute deployment readiness.

---

## 🏛️ System Architecture

```
                                DOMINO SKY ARCHITECTURE
                                
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           REACT + VITE FRONTEND                        │
  │  - Network Operations Dashboard (12 Live Operational KPIs)             │
  │  - Interactive Airport Map (16 Indian Airports, Real GPS, Animated Arcs│
  │  - Airport Closure Simulator (Presets: 30m, 60m, 90m, 120m, 180m)      │
  │  - Domino Effect Propagation Engine & Chronological Timeline Player    │
  │  - SKY-MIND AI Dispatcher Advisory Interface                           │
  │  - Split-Screen Before vs. After Recovery Dashboard                    │
  │  - Flight Intelligence Table with Multi-Filter & Delay History Drawer  │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │ REST API / JSON
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                         FASTAPI BACKEND CORE                           │
  │                                                                        │
  │   ┌──────────────────────────────────────────────────────────────┐     │
  │   │                DETERMINISTIC SIMULATION ENGINE               │     │
  │   │  - Aircraft Rotation Graph & Turnaround Propagation          │     │
  │   │  - Airport Closure Constraints & Runway Departure Queues     │     │
  │   │  - Passenger Connection MCT & Stranded Passenger Classifier  │     │
  │   │  - DGCA 600m Flight Duty Period (FDP) Evaluator              │     │
  │   └──────────────────────────────┬───────────────────────────────┘     │
  │                                  │                                     │
  │   ┌──────────────────────────────▼───────────────────────────────┐     │
  │   │                     RECOVERY OPTIMIZER                       │     │
  │   │  - Spare Aircraft Allocation (VT-SP1 at BOM, VT-SP2 at DEL)  │     │
  │   │  - Tactical Downstream Cancellations                         │     │
  │   │  - Connection Holding (Gate Buffer Extensions)               │     │
  │   │  - Candidate Objective Scoring & Deterministic Re-Simulation │     │
  │   └──────────────────────────────┬───────────────────────────────┘     │
  │                                  │                                     │
  │   ┌──────────────────────────────▼───────────────────────────────┐     │
  │   │             SKY-MIND AI DISPATCHER INTELLIGENCE              │     │
  │   │  - Structured Ground-Truth Verification Guardrails           │     │
  │   │  - Operational Aviation Rationale Generation                 │     │
  │   │  - Deterministic Rule-Based Fallback (Zero Hallucination)    │     │
  │   └──────────────────────────────────────────────────────────────┘     │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ & npm

### Method 1: Single Unified Application (Recommended)
FastAPI directly serves the production frontend and all REST endpoints:

```bash
# 1. Start the unified server
run_backend.bat

# Or run directly in shell:
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open your browser to: **`http://localhost:8000`**

### Method 2: Dual Development Mode (Hot Reload)

```bash
# Terminal 1 - FastAPI Backend:
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Vite React Frontend:
cd frontend
npm run dev
```
Open your browser to: **`http://localhost:5173`**

---

## 🧪 Automated Test Suite

Run the comprehensive 19-test automated test suite:

```bash
run_tests.bat

# Or run directly:
python -m pytest backend/tests/ -v
```

### Verified Test Cases:
1. `test_baseline_simulation`: Verifies nominal state (70 flights on-time, 0 delayed, 0 stranded, 100% health).
2. `test_airport_closure_delays_departure`: Verifies flights during closure window cannot depart until reopen time.
3. `test_airport_closure_affects_inbound_flights`: Verifies airborne holding and delayed arrivals.
4. `test_flights_outside_closure_window_not_directly_delayed`: Ensures no false positive delays.
5. `test_aircraft_rotation_propagation`: Verifies turnaround time equation: `Earliest Dep = Actual Inbound Arr + Turnaround`.
6. `test_passenger_connections_calculated`: Verifies MCT calculation and missed connections.
7. `test_passenger_counts_not_duplicated`: Verifies distinct passenger counting.
8. `test_crew_duty_constraints`: Verifies DGCA 600m FDP violations are flagged.
9. `test_spare_aircraft_deployment`: Verifies spare aircraft deployment eliminates cascade delay.
10. `test_ai_dispatcher_numerical_consistency`: Verifies AI recommendations match ground truth numbers.
11. `test_deterministic_reproducibility`: Verifies identical inputs produce identical outputs every run.
12. `test_health_check`, `test_get_airports`, `test_get_aircraft`, `test_get_routes`, `test_exports_api`, `test_domino_explanation_api`: Full REST endpoint verification.

---

## ⛈️ Live Demonstration Walkthrough

Follow this step-by-step scenario to demonstrate DOMINO SKY:

### Step 1: Baseline Network Health
- Observe the top KPI bar: 16 Airports, 70 Flights, 16 Aircraft, 100% On-Time, 0 Stranded Pax, Health Score: 100.0%.
- Observe the interactive map: All 16 airports glow green with smooth blue route arcs.

### Step 2: Trigger the Mumbai Disruption
- In the **Disruption Simulator** panel:
  - Select **BOM (Mumbai)**
  - Reason: **Thunderstorm**
  - Start Time: **08:00**
  - Duration: **90 minutes** (preset button)
- Click **INITIATE DISRUPTION** (or click the 1-click demo button).

### Step 3: Observe the Cascading Domino Effect
- **Network Dashboard updates immediately**:
  - Delayed flights spike to 18.
  - Total delay minutes increase to ~897m.
  - Affected passengers jump to 3,000+.
  - Network health score drops.
- **Interactive Map**:
  - Mumbai (BOM) pulses red with expanding radar ripple rings.
  - Routes out of Mumbai shift to dashed amber and crimson arcs with moving pulse particles.
- **Domino Propagation Tree**:
  - Step through the timeline slider from 08:00 to 18:00:
    1. **08:00**: BOM closes due to thunderstorm.
    2. **08:30**: Flight DS-102 (BOM → CCU) held at gate until 09:30.
    3. **09:35**: DS-102 departs BOM delayed by 65 minutes.
    4. **12:20**: DS-102 arrives CCU late; aircraft VT-ABC turnaround forces downline flight DS-103 (CCU → DEL) to depart late at 13:00.
    5. **11:50**: Flight DS-202 arrives DEL late, missing connecting flight DS-192 (DEL → PAT) departing at 11:45, stranding 32 connecting passengers!
    6. **15:30**: Crew CREW-01 exceeds 600m legal duty limit on DS-103 arrival, flagging a DGCA duty violation!

### Step 4: Consult SKY-MIND AI Dispatcher
- Click the **SKY-MIND AI Dispatch** button in the top navigation.
- SKY-MIND evaluates the network and presents prioritized candidates:
  - **Strategy 1**: *Deploy Standby VT-SP1 on Flight DS-102 at BOM*
    - Expected Impact: Recovers 195 delay minutes, restores 32 connecting passengers, and prevents crew violations.
    - Clear trade-off analysis: Consumes BOM ready reserve aircraft.
- Click **Preview Impact** to inspect the simulated outcome.
- Click **Apply & Re-Simulate**.

### Step 5: Review Before / After Comparison Dashboard
- The split-screen modal pops up:
  - Left: Before Recovery (Disrupted)
  - Right: After Recovery (Optimized)
  - Key Deltas: Total delay minutes cut by ~22%, flights restored to on-time, passenger connections preserved.
- Click **Accept & Return to Dashboard** to see the updated network state.

### Step 6: Export Data & History
- Click **CSV** or **JSON** in the top navigation to download full audit reports of the simulation run.
- Click the **Scenario History** button to compare Mumbai 60m vs Mumbai 90m vs Bengaluru 120m.

---

## 📁 Repository Structure

```
promptwars/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entrypoint
│   │   ├── api/
│   │   │   ├── routes_network.py       # Airports, aircraft, routes endpoints
│   │   │   ├── routes_simulation.py    # Disruption run, reset, results endpoints
│   │   │   ├── routes_recovery.py      # Recommendations, preview, apply endpoints
│   │   │   └── routes_export.py        # CSV and JSON report downloads
│   │   ├── schemas/
│   │   │   └── schemas.py              # Pydantic data schemas
│   │   ├── services/
│   │   │   ├── data_loader.py          # Data ingestion & schema validation
│   │   │   ├── simulation_engine.py    # Deterministic rotation & cascade engine
│   │   │   ├── recovery_optimizer.py   # Candidate strategy generator & simulator
│   │   │   └── ai_dispatcher.py        # SKY-MIND ground-truth AI layer
│   │   └── data/
│   │       ├── generate_dataset.py     # Canonical dataset generator
│   │       ├── airports.json / .csv    # 16 Indian airports
│   │       ├── aircraft.json / .csv    # 16 aircraft (14 active + 2 spares)
│   │       ├── flights.json / .csv     # 70 flights
│   │       ├── passenger_connections.json / .csv # Connecting itineraries
│   │       ├── crew_assignments.json / .csv      # Crew pairings & FDP limits
│   │       └── spare_aircraft.json / .csv        # Standby aircraft
│   └── tests/
│       ├── test_simulation_engine.py   # 11 core simulation & arithmetic tests
│       └── test_api_and_exports.py     # 8 API integration & export tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── header/CommandHeader.tsx          # AOC system header & health status
│   │   │   ├── dashboard/NetworkDashboard.tsx    # 12 live operational metric cards
│   │   │   ├── network-map/NetworkMap.tsx        # Interactive SVG map of India
│   │   │   ├── disruption/DisruptionControlPanel.tsx # Disruption simulator panel
│   │   │   ├── domino/DominoPropagationTree.tsx  # Domino cascade graph & timeline
│   │   │   ├── dispatcher/SkyMindDispatcher.tsx  # SKY-MIND AI Dispatch drawer
│   │   │   ├── recovery/RecoveryComparisonModal.tsx # Before/After comparison modal
│   │   │   ├── flight-table/FlightIntelligenceTable.tsx # 70-flight intelligence table
│   │   │   ├── analytics/DisruptionCharts.tsx    # Delay histogram & hub rankings
│   │   │   └── history/ScenarioHistoryModal.tsx  # Simulation history & comparison
│   │   ├── services/api.ts                       # REST client
│   │   ├── types/index.ts                        # TypeScript data models
│   │   ├── App.tsx                               # Main layout container
│   │   └── main.tsx                              # React entrypoint
│   ├── dist/                                     # Production build assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── run_backend.bat                     # 1-Click launcher (Unified server)
├── run_frontend.bat                    # Frontend dev server launcher
├── run_tests.bat                       # Automated test suite runner
└── README.md                           # Documentation
```

---

## 🔒 Security & Reliability

- **No Arbitrary Code Execution**: Simulations run in a strictly sandboxed Python environment.
- **No Hallucinated Operations**: Numerical metrics are computed solely through deterministic mathematics. AI prompts receive strictly bound JSON and responses are validated against ground truth.
- **Fail-Safe Fallback**: If an external LLM is offline or unconfigured, the built-in deterministic heuristic dispatcher seamlessly supplies verified operational recommendations without interruption.
- **Zero Double-Counting**: Passenger connection tracking uses discrete set partitioning to prevent multi-counting across delayed sectors.

---

**DOMINO SKY** — Airline Disruption Intelligence & Recovery Simulator. Built for modern airline operations centers.
