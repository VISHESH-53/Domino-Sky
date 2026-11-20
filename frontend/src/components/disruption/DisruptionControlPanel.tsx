import React, { useState } from 'react';
import { Airport, DisruptionInput } from '../../types';
import { AlertTriangle, Play, RefreshCw, Zap, CloudLightning, Clock } from 'lucide-react';

interface Props {
  airports: Airport[];
  onInitiate: (input: DisruptionInput) => void;
  onReset: () => void;
  isLoading: boolean;
  currentDisruption?: DisruptionInput;
}

const PRESET_DURATIONS = [30, 60, 90, 120, 180];

const DISRUPTION_TYPES = [
  'Thunderstorm',
  'Heavy rainfall',
  'Fog',
  'Runway maintenance',
  'Airport infrastructure failure',
  'Air traffic control restrictions',
  'Custom disruption'
];

export const DisruptionControlPanel: React.FC<Props> = ({
  airports,
  onInitiate,
  onReset,
  isLoading,
  currentDisruption
}) => {
  const [selectedAirport, setSelectedAirport] = useState<string>(currentDisruption?.airport_code || 'BOM');
  const [startTime, setStartTime] = useState<string>(currentDisruption?.start_time || '08:00');
  const [duration, setDuration] = useState<number>(currentDisruption?.duration_minutes || 90);
  const [disruptionType, setDisruptionType] = useState<string>(currentDisruption?.disruption_type || 'Thunderstorm');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInitiate({
      airport_code: selectedAirport,
      start_time: startTime,
      duration_minutes: duration,
      disruption_type: disruptionType
    });
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CloudLightning className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
              Airport Disruption Simulator
            </h2>
            <p className="text-[11px] text-slate-400">
              Configure deterministic network shock conditions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="px-2.5 py-1 text-xs font-mono text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Target Airport */}
          <div>
            <label htmlFor="target-airport-select" className="block text-[11px] font-mono text-slate-400 mb-1">
              TARGET AIRPORT
            </label>
            <select
              id="target-airport-select"
              aria-label="Select target airport for disruption"
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {airports.map((apt) => (
                <option key={apt.code} value={apt.code}>
                  {apt.code} — {apt.city} ({apt.name.length > 25 ? apt.name.substring(0, 25) + '...' : apt.name})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Disruption Type */}
          <div>
            <label htmlFor="disruption-reason-select" className="block text-[11px] font-mono text-slate-400 mb-1">
              DISRUPTION REASON
            </label>
            <select
              id="disruption-reason-select"
              aria-label="Select disruption cause or reason"
              value={disruptionType}
              onChange={(e) => setDisruptionType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {DISRUPTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Closure Start Time */}
          <div>
            <label htmlFor="closure-start-time-input" className="block text-[11px] font-mono text-slate-400 mb-1">
              CLOSURE START TIME
            </label>
            <div className="relative">
              <input
                id="closure-start-time-input"
                aria-label="Closure start time in HH:MM"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* 4. Duration Controls */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>CLOSURE DURATION</span>
              <span className="font-bold text-cyan-400">{duration} MIN</span>
            </div>
            <div className="flex items-center gap-1">
              {PRESET_DURATIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDuration(preset)}
                  className={`flex-1 py-1 text-[11px] font-mono rounded border transition-colors ${
                    duration === preset
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Duration Slider */}
        <div className="pt-1">
          <input
            type="range"
            min={15}
            max={360}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
            <span>15 min</span>
            <span>90 min (Hackathon Demo)</span>
            <span>360 min (6 hrs)</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simulation Window: {startTime} → +{duration}m</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating Cascades...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>INITIATE DISRUPTION</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
