import React, { useState } from 'react';
import { FlightSimulated } from '../../types';
import { 
  Search, 
  Filter, 
  Plane, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  X,
  GitBranch,
  ShieldAlert
} from 'lucide-react';

interface Props {
  flights: FlightSimulated[];
  onSelectFlight?: (flightId: string) => void;
  selectedFlightId?: string | null;
}

type FilterCategory = 'ALL' | 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'CONNECTIONS_AFFECTED' | 'CREW_ISSUES';

export const FlightIntelligenceTable: React.FC<Props> = ({
  flights,
  onSelectFlight,
  selectedFlightId
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [inspectedFlight, setInspectedFlight] = useState<FlightSimulated | null>(null);

  // Filter flights based on category and search query
  const filteredFlights = flights.filter((fl) => {
    // Search match
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      fl.flight_id.toLowerCase().includes(q) ||
      fl.origin.toLowerCase().includes(q) ||
      fl.destination.toLowerCase().includes(q) ||
      fl.assigned_aircraft.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Category match
    switch (activeFilter) {
      case 'ON_TIME':
        return !fl.is_delayed && !fl.is_cancelled;
      case 'DELAYED':
        return fl.is_delayed && !fl.is_cancelled;
      case 'CANCELLED':
        return fl.is_cancelled;
      case 'CONNECTIONS_AFFECTED':
        return fl.missed_connections_count > 0 || fl.connecting_passengers_out > 0;
      case 'CREW_ISSUES':
        return fl.crew_duty_violated;
      default:
        return true;
    }
  });

  const getStatusBadge = (fl: FlightSimulated) => {
    if (fl.is_cancelled) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/60 text-red-400 border border-red-500/40">
          CANCELLED
        </span>
      );
    }
    if (fl.flight_status === 'RECOVERED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
          RECOVERED
        </span>
      );
    }
    if (fl.is_delayed) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-400 border border-amber-500/40">
          DELAYED (+{fl.arrival_delay_minutes}m)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
        ON TIME
      </span>
    );
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-xl space-y-4">
      {/* Title & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" />
            Flight Intelligence Table ({flights.length} Fleet Sectors)
          </h2>
          <p className="text-[11px] text-slate-400">
            Real-time sector schedule, actual turnaround tracking, and causal propagation status
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flight, route, aircraft..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { key: 'ALL', label: `All Flights (${flights.length})` },
          { key: 'ON_TIME', label: `On-Time (${flights.filter(f => !f.is_delayed && !f.is_cancelled).length})` },
          { key: 'DELAYED', label: `Delayed (${flights.filter(f => f.is_delayed).length})` },
          { key: 'CANCELLED', label: `Cancelled (${flights.filter(f => f.is_cancelled).length})` },
          { key: 'CONNECTIONS_AFFECTED', label: `Connections Impacted (${flights.filter(f => f.missed_connections_count > 0).length})` },
          { key: 'CREW_ISSUES', label: `Crew Breaches (${flights.filter(f => f.crew_duty_violated).length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as FilterCategory)}
            className={`px-3 py-1 rounded-md border whitespace-nowrap transition-colors ${
              activeFilter === tab.key
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase text-slate-400 font-bold tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Flight</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Aircraft</th>
                <th className="py-2.5 px-3">Sched Dep</th>
                <th className="py-2.5 px-3">Actual Dep</th>
                <th className="py-2.5 px-3">Sched Arr</th>
                <th className="py-2.5 px-3">Actual Arr</th>
                <th className="py-2.5 px-3 text-center">Delay</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Pax</th>
                <th className="py-2.5 px-3">Crew</th>
                <th className="py-2.5 px-3">Root Cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredFlights.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500">
                    No flights match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFlights.map((fl) => {
                  const isSelected = selectedFlightId === fl.flight_id || inspectedFlight?.flight_id === fl.flight_id;
                  return (
                    <tr
                      key={fl.flight_id}
                      onClick={() => {
                        setInspectedFlight(fl);
                        if (onSelectFlight) onSelectFlight(fl.flight_id);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/40 text-white'
                          : fl.is_delayed
                          ? 'hover:bg-amber-950/20 text-slate-300'
                          : 'hover:bg-slate-900/50 text-slate-400'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        {fl.flight_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {fl.origin} → {fl.destination}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {fl.assigned_aircraft}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {fl.scheduled_departure}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                        {fl.actual_departure}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {fl.scheduled_arrival}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                        {fl.actual_arrival}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                        {fl.arrival_delay_minutes > 0 ? (
                          <span className="text-amber-400">+{fl.arrival_delay_minutes}m</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(fl)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-300 whitespace-nowrap">
                        {fl.passenger_count}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {fl.crew_duty_violated ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> VIOLATED
                          </span>
                        ) : (
                          <span className="text-emerald-400">LEGAL</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">
                        {fl.root_cause || (fl.is_delayed ? 'Rotation cascade' : 'Nominal')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flight Detail Intelligence Drawer (Modal / Slide) */}
      {inspectedFlight && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold font-mono text-white">{inspectedFlight.flight_id}</span>
              <span className="text-xs font-mono text-cyan-400">({inspectedFlight.origin} → {inspectedFlight.destination})</span>
              <span className="text-xs text-slate-400">Airframe: {inspectedFlight.assigned_aircraft} ({inspectedFlight.aircraft_model})</span>
              {getStatusBadge(inspectedFlight)}
            </div>
            <p className="text-xs text-slate-300">
              <strong className="text-slate-200">Delay Lineage:</strong> {inspectedFlight.root_cause || 'Nominal on-time schedule'} • 
              Turnaround Buffer: {inspectedFlight.turnaround_buffer_used}m used • 
              Rotation Sequence: Sector {inspectedFlight.rotation_sequence} of {inspectedFlight.total_rotation_legs}
            </p>
          </div>
          <button
            onClick={() => setInspectedFlight(null)}
            className="self-start md:self-center px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
          >
            Close Detail
          </button>
        </div>
      )}
    </div>
  );
};
