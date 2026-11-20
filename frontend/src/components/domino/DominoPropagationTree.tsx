import React, { useState, useEffect, useRef } from 'react';
import { SimulationResult, FlightSimulated, DisruptionTimelineEvent } from '../../types';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Clock, 
  GitCommit, 
  AlertTriangle, 
  Users, 
  ChevronRight, 
  Plane, 
  ShieldAlert,
  Info
} from 'lucide-react';

interface Props {
  sim: SimulationResult | null;
  onSelectFlight?: (flightId: string) => void;
}

export const DominoPropagationTree: React.FC<Props> = ({ sim, onSelectFlight }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const timeline = sim?.timeline || [];
  const totalEvents = timeline.length;
  const isBaseline = sim?.is_baseline ?? true;

  // Animation timer
  useEffect(() => {
    let timer: any;
    if (isPlaying && totalEvents > 0) {
      timer = setInterval(() => {
        setCurrentTimeIndex((prev) => {
          if (prev >= totalEvents - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalEvents, playbackSpeed]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTimeIndex(0);
  };

  const handleStep = () => {
    setIsPlaying(false);
    if (currentTimeIndex < totalEvents - 1) {
      setCurrentTimeIndex(currentTimeIndex + 1);
    }
  };

  // Extract visible events up to currentTimeIndex
  const visibleEvents = timeline.slice(0, currentTimeIndex + 1);
  const currentEvent = timeline[currentTimeIndex];

  // Disrupted flights with rotation cascade chain (e.g. VT-ABC rotation)
  const delayedFlights = sim?.flights?.filter(f => f.is_delayed) || [];
  
  // Group delayed flights by aircraft registration to show rotation cascade chain
  const cascadeRotations: Record<string, FlightSimulated[]> = {};
  delayedFlights.forEach(f => {
    cascadeRotations[f.assigned_aircraft] = cascadeRotations[f.assigned_aircraft] || [];
    cascadeRotations[f.assigned_aircraft].push(f);
  });

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-2xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              Domino Effect — Disruption Propagation Engine
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Interactive Timeline
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Chronological step-by-step delay propagation across aircraft rotations and passenger transfers
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Timeline Slider */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md px-3 py-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-white text-[11px]">
              {currentEvent ? currentEvent.time : '00:00'}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalEvents - 1)}
              value={currentTimeIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentTimeIndex(Number(e.target.value));
              }}
              className="w-24 sm:w-36 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] font-mono text-slate-400">
              {currentTimeIndex + 1}/{totalEvents || 1}
            </span>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Step Forward */}
          <button
            onClick={handleStep}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Step Forward"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset Timeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center border border-slate-800 rounded bg-slate-900 text-[10px] font-mono overflow-hidden">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-1 ${playbackSpeed === spd ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {isBaseline ? (
        <div className="p-8 text-center rounded-lg bg-slate-900/30 border border-slate-800/60">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-mono text-slate-300">Baseline Network State Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            No active disruption detected. Initiate an airport closure simulation above to observe how a single shock wave propagates cascading rotation delays.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Cols: Interactive Rotation Cascade Diagram */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Aircraft Rotation Delay Chains ({Object.keys(cascadeRotations).length} Disrupted Airframes)</span>
              <span className="text-[10px] text-cyan-400">Click node for deep causal inspection</span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {Object.entries(cascadeRotations).map(([acReg, flights]) => (
                <div
                  key={acReg}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-white">{acReg}</span>
                      <span className="text-[11px] text-slate-400">({flights[0].aircraft_model})</span>
                    </div>
                    <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      Total Delay: {flights.reduce((acc, f) => acc + f.arrival_delay_minutes, 0)}m
                    </span>
                  </div>

                  {/* Rotation Sequential Node Chain */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {flights.map((fl, fIdx) => {
                      const isSelected = selectedNode?.flight_id === fl.flight_id;
                      const isClosureFlight = fl.delay_reasons.includes('DIRECT_AIRPORT_CLOSURE');
                      const isRotationCascade = fl.delay_reasons.includes('ROTATION_PROPAGATION');

                      return (
                        <React.Fragment key={fl.flight_id}>
                          <div
                            onClick={() => {
                              setSelectedNode(fl);
                              if (onSelectFlight) onSelectFlight(fl.flight_id);
                            }}
                            className={`p-2 rounded border cursor-pointer transition-all flex-shrink-0 w-36 ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                                : isClosureFlight
                                ? 'bg-red-950/40 border-red-500/50 hover:border-red-400'
                                : isRotationCascade
                                ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400'
                                : 'bg-slate-800/50 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-white">{fl.flight_id}</span>
                              <span className={`text-[10px] font-bold ${isClosureFlight ? 'text-red-400' : 'text-amber-400'}`}>
                                +{fl.arrival_delay_minutes}m
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                              {fl.origin} → {fl.destination}
                            </div>
                            <div className="text-[9px] text-slate-400 font-sans truncate mt-1">
                              {isClosureFlight ? 'Airport Grounded' : isRotationCascade ? 'Turnaround Cascade' : 'Delayed'}
                            </div>
                          </div>

                          {fIdx < flights.length - 1 && (
                            <div className="flex items-center text-slate-600">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 1 Col: Selected Node Deep Root-Cause Inspector */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="font-mono text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5" /> Root Cause Inspector
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedNode.flight_id}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Flight Route</span>
                    <span className="text-white font-mono font-bold text-sm">
                      {selectedNode.origin} → {selectedNode.destination}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Primary Root Cause</span>
                    <span className="text-amber-300 font-semibold">
                      {selectedNode.root_cause || 'Network propagation'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Propagation Source</span>
                    <span className="text-slate-300 font-mono">
                      {selectedNode.propagation_source || 'Direct closure shock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                    <div className="p-2 rounded bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Sched Departure</span>
                      <span className="text-slate-200">{selectedNode.scheduled_departure}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Actual Departure</span>
                      <span className="text-amber-400 font-bold">{selectedNode.actual_departure}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="p-2 rounded bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Turnaround Buffer Used</span>
                      <span className="text-cyan-400">{selectedNode.turnaround_buffer_used}m</span>
                    </div>
                    <div className="p-2 rounded bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block">Crew Legality</span>
                      <span className={selectedNode.crew_duty_violated ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {selectedNode.crew_duty_violated ? 'VIOLATED' : 'LEGAL'}
                      </span>
                    </div>
                  </div>

                  {selectedNode.connecting_passengers_out > 0 && (
                    <div className="p-2 rounded bg-red-950/20 border border-red-500/20 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 text-red-400 font-bold mb-0.5">
                        <Users className="w-3.5 h-3.5" /> Connecting Passengers Impacted
                      </div>
                      {selectedNode.connecting_passengers_out} passengers transferring onward; {selectedNode.missed_connections_count} connection transfers breached.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Select any flight node on the left to inspect its complete causal delay lineage.</p>
              </div>
            )}

            {/* Current Timeline Event Banner */}
            {currentEvent && (
              <div className="mt-3 p-2.5 rounded bg-slate-950 border border-cyan-500/30 text-xs">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold mb-1">
                  <Clock className="w-3 h-3" /> Event Time: {currentEvent.time} • {currentEvent.event_type}
                </div>
                <div className="text-slate-300 text-[11px] leading-relaxed">
                  {currentEvent.description}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
