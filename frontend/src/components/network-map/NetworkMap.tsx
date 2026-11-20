import React, { useState } from 'react';
import { Airport, RouteNetworkItem, FlightSimulated, SimulationResult } from '../../types';
import { Plane, AlertTriangle, ShieldCheck, X, Users, Clock, ArrowRight } from 'lucide-react';

interface Props {
  airports: Airport[];
  routes: RouteNetworkItem[];
  sim: SimulationResult | null;
  onSelectFlight?: (flightId: string) => void;
}

export const NetworkMap: React.FC<Props> = ({ airports, routes, sim, onSelectFlight }) => {
  const [selectedAirportCode, setSelectedAirportCode] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  const closedAirportCode = sim?.disruption?.airport_code;
  const isBaseline = sim?.is_baseline ?? true;

  // Geographic projection bounds for India
  const projectCoords = (lat: number, lon: number): [number, number] => {
    const minLon = 71.0;
    const maxLon = 93.0;
    const minLat = 7.5;
    const maxLat = 32.5;

    const width = 850;
    const height = 750;

    const x = ((lon - minLon) / (maxLon - minLon)) * (width - 100) + 50;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 80) + 40;
    return [x, y];
  };

  // Compute airport operational status
  const getAirportStatus = (code: string) => {
    if (!isBaseline && code === closedAirportCode) {
      return { status: 'CLOSED', color: '#ef4444', label: 'CLOSED', badge: 'bg-red-500/20 text-red-400 border-red-500/50' };
    }

    const ranking = sim?.airport_disruption_ranking?.find(r => r.code === code);
    if (!ranking || isBaseline) {
      return { status: 'OPERATIONAL', color: '#10b981', label: 'OPERATIONAL', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }

    if (ranking.total_delay_minutes > 180 || ranking.cancelled_flights > 0) {
      return { status: 'SIGNIFICANT', color: '#f97316', label: 'SIGNIFICANT DELAY', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
    }
    if (ranking.total_delay_minutes > 45) {
      return { status: 'MINOR', color: '#facc15', label: 'MINOR DELAY', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
    }
    return { status: 'OPERATIONAL', color: '#10b981', label: 'OPERATIONAL', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  };

  const selectedAirport = airports.find(a => a.code === selectedAirportCode);
  const selectedRanking = sim?.airport_disruption_ranking?.find(r => r.code === selectedAirportCode);
  const selectedFlights = sim?.flights?.filter(f => f.origin === selectedAirportCode || f.destination === selectedAirportCode) || [];

  // Keyboard accessibility: Close panel on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAirportCode) {
        setSelectedAirportCode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAirportCode]);

  return (
    <div className="relative w-full h-[620px] rounded-xl border border-slate-800 bg-aviation-darkest overflow-hidden shadow-2xl flex">
      {/* Background Grid & Radar Circle Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* SVG Map Canvas */}
      <svg className="w-full h-full" viewBox="0 0 850 750">
        <defs>
          {/* Gradients for Flight Route Arcs */}
          <linearGradient id="route-normal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="route-delayed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="route-closed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. FLIGHT ROUTE ARCS */}
        {routes.map((route, i) => {
          const [x1, y1] = projectCoords(route.origin_coords[0], route.origin_coords[1]);
          const [x2, y2] = projectCoords(route.destination_coords[0], route.destination_coords[1]);

          // Compute quadratic curve control point for curved flight path
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const curvature = 0.15;
          const cx = midX - dy * curvature;
          const cy = midY + dx * curvature;

          const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

          // Check if any flight on this route is delayed or closed
          const routeFlights = sim?.flights?.filter(
            f => (f.origin === route.origin && f.destination === route.destination) ||
                 (f.origin === route.destination && f.destination === route.origin)
          ) || [];

          const hasDelayed = routeFlights.some(f => f.is_delayed);
          const isConnectedToClosed = !isBaseline && (route.origin === closedAirportCode || route.destination === closedAirportCode);
          
          let strokeColor = "rgba(56, 189, 248, 0.25)";
          let strokeDash = "none";
          let strokeWidth = 1.2;

          if (isConnectedToClosed) {
            strokeColor = "rgba(239, 68, 68, 0.75)";
            strokeDash = "4,4";
            strokeWidth = 2.2;
          } else if (hasDelayed) {
            strokeColor = "rgba(245, 158, 11, 0.65)";
            strokeDash = "6,3";
            strokeWidth = 1.8;
          }

          const isHovered = hoveredRoute === `${route.origin}-${route.destination}`;

          return (
            <g key={`route-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke={isHovered ? "#00f0ff" : strokeColor}
                strokeWidth={isHovered ? 2.5 : strokeWidth}
                strokeDasharray={strokeDash}
                className="transition-all duration-300"
                onMouseEnter={() => setHoveredRoute(`${route.origin}-${route.destination}`)}
                onMouseLeave={() => setHoveredRoute(null)}
              />
              {/* Pulse particle along route if active */}
              {(hasDelayed || isConnectedToClosed) && (
                <circle r="2.5" fill={isConnectedToClosed ? "#ef4444" : "#f59e0b"}>
                  <animateMotion
                    path={pathD}
                    dur={`${Math.max(4, 12 - route.flight_count * 2)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* 2. AIRPORT NODES */}
        {airports.map((airport) => {
          const [x, y] = projectCoords(airport.latitude, airport.longitude);
          const status = getAirportStatus(airport.code);
          const isSelected = selectedAirportCode === airport.code;
          const isClosed = status.status === 'CLOSED';
          const aptRanking = sim?.airport_disruption_ranking?.find(r => r.code === airport.code);

          return (
            <g
              key={airport.code}
              tabIndex={0}
              role="button"
              aria-label={`Airport ${airport.name} (${airport.code}), Status: ${status.label}, Total Delays: ${aptRanking?.total_delay_minutes || 0} mins`}
              className="cursor-pointer group outline-none focus:outline-none"
              onClick={() => setSelectedAirportCode(airport.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedAirportCode(airport.code);
                }
              }}
            >
              {/* Keyboard Focus Ring */}
              <circle
                cx={x}
                cy={y}
                r="16"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="2,2"
                className="opacity-0 group-focus-visible:opacity-100 transition-opacity pointer-events-none"
              />

              {/* Ripple animation for closed or heavily delayed airport */}
              {isClosed && (
                <>
                  <circle cx={x} cy={y} r="22" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6">
                    <animate attributeName="r" from="12" to="34" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r="14" fill="rgba(239, 68, 68, 0.25)" filter="url(#glow-red)" />
                </>
              )}

              {/* Selection Halo */}
              {isSelected && (
                <circle cx={x} cy={y} r="18" fill="none" stroke="#00f0ff" strokeWidth="2" strokeDasharray="3,3">
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="8s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Outer airport circle */}
              <circle
                cx={x}
                cy={y}
                r={airport.is_hub ? 9 : 6}
                fill="#0f172a"
                stroke={status.color}
                strokeWidth={isClosed ? 3 : 2}
                className="transition-all duration-300 group-hover:r-10"
              />

              {/* Inner core */}
              <circle
                cx={x}
                cy={y}
                r={airport.is_hub ? 4 : 2.5}
                fill={status.color}
              />

              {/* Airport IATA Code Label */}
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                className={`font-mono text-[11px] font-bold tracking-wider select-none pointer-events-none transition-colors ${
                  isClosed ? 'fill-red-400 font-extrabold' : isSelected ? 'fill-cyan-300' : 'fill-slate-200 group-hover:fill-cyan-400'
                }`}
              >
                {airport.code}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Map Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-xs shadow-lg space-y-1.5 pointer-events-auto">
        <div className="font-mono font-bold text-slate-300 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-cyan-400" /> Network Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-slate-300 text-[11px]">Normal Operations</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="text-slate-300 text-[11px]">Minor Disruption (&gt;15m)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-300 text-[11px]">Significant Disruption (&gt;60m)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
          <span className="text-red-400 font-semibold text-[11px]">Airport Closed / Grounded</span>
        </div>
      </div>

      {/* Airport Detail Drawer (Slide-over when airport is clicked) */}
      {selectedAirport && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Airport Details for ${selectedAirport.name} (${selectedAirport.code})`}
          className="absolute top-0 right-0 bottom-0 w-80 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-4 z-20 overflow-y-auto shadow-2xl flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-white">{selectedAirport.code}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getAirportStatus(selectedAirport.code).badge}`}>
                    {getAirportStatus(selectedAirport.code).label}
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate max-w-[200px]">{selectedAirport.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{selectedAirport.city}, {selectedAirport.state} • {selectedAirport.icao}</div>
              </div>
              <button
                onClick={() => setSelectedAirportCode(null)}
                aria-label="Close airport details panel"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Airport Operations Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">TOTAL FLIGHTS</div>
                <div className="text-lg font-bold font-mono text-cyan-400">{selectedFlights.length}</div>
                <div className="text-[10px] text-slate-500">
                  {selectedFlights.filter(f => f.origin === selectedAirport.code).length} dep • {selectedFlights.filter(f => f.destination === selectedAirport.code).length} arr
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">DELAYED FLIGHTS</div>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {selectedRanking ? selectedRanking.delayed_departures + selectedRanking.delayed_arrivals : 0}
                </div>
                <div className="text-[10px] text-slate-500">
                  {selectedRanking?.total_delay_minutes || 0} delay mins
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">AFFECTED PAX</div>
                <div className="text-lg font-bold font-mono text-slate-200">
                  {selectedRanking?.affected_passengers || 0}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">MIN TURNAROUND</div>
                <div className="text-lg font-bold font-mono text-slate-200">{selectedAirport.min_turnaround_time}m</div>
                <div className="text-[10px] text-slate-500">Cap: {selectedAirport.capacity_per_hour}/hr</div>
              </div>
            </div>

            {/* Flight movements for this airport */}
            <div>
              <div className="text-xs font-mono font-semibold uppercase text-slate-400 mb-2">
                Flight Schedule ({selectedFlights.length})
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {selectedFlights.map((fl) => (
                  <div
                    key={fl.flight_id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Flight ${fl.flight_id} from ${fl.origin} to ${fl.destination}, status: ${fl.is_delayed ? `Delayed by ${fl.arrival_delay_minutes} mins` : 'On time'}`}
                    onClick={() => onSelectFlight && onSelectFlight(fl.flight_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectFlight && onSelectFlight(fl.flight_id);
                      }
                    }}
                    className="p-2 rounded bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 cursor-pointer transition-all flex items-center justify-between text-xs outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-white">{fl.flight_id}</span>
                        <span className="text-[10px] text-slate-400">{fl.origin} → {fl.destination}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Dep: {fl.actual_departure} (Sched: {fl.scheduled_departure})
                      </div>
                    </div>
                    <div>
                      {fl.is_delayed ? (
                        <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
                          +{fl.arrival_delay_minutes}m
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400">ON TIME</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
            GPS: {selectedAirport.latitude.toFixed(4)}°N, {selectedAirport.longitude.toFixed(4)}°E
          </div>
        </div>
      )}
    </div>
  );
};
