import React, { useState, useEffect, useRef } from 'react';
import { Layers, X, Clock, AlertTriangle, ArrowRight, CheckCircle, RefreshCw, Download } from 'lucide-react';
import { fetchSimulationHistory, fetchSimulationResult, getExportCsvUrl, getExportJsonUrl } from '../../services/api';
import { SimulationResult } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (sim: SimulationResult) => void;
}

export const ScenarioHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectScenario
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [compareIdA, setCompareIdA] = useState<string | null>(null);
  const [compareIdB, setCompareIdB] = useState<string | null>(null);
  const [scenarioA, setScenarioA] = useState<SimulationResult | null>(null);
  const [scenarioB, setScenarioB] = useState<SimulationResult | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement;

    loadHistory();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const items = await fetchSimulationHistory();
      setHistory(items);
      if (items.length >= 2) {
        setCompareIdA(items[items.length - 2].simulation_id);
        setCompareIdB(items[items.length - 1].simulation_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadCompare = async () => {
    if (!compareIdA || !compareIdB) return;
    setIsLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetchSimulationResult(compareIdA),
        fetchSimulationResult(compareIdB)
      ]);
      setScenarioA(resA);
      setScenarioB(resB);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="w-full max-w-4xl max-h-[90vh] bg-aviation-darkest border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 id="history-modal-title" className="text-lg font-bold font-display tracking-wider text-white">
                SIMULATION HISTORY & SCENARIO COMPARATOR
              </h2>
              <p className="text-xs text-slate-400">
                Compare consequences across varying closure durations and target hubs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scenario history modal"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Past Executed Runs Table */}
          <div>
            <div className="text-xs font-mono font-bold uppercase text-slate-400 mb-2 flex items-center justify-between">
              <span>Saved Simulation Log ({history.length} Runs)</span>
              <button
                onClick={loadHistory}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Log
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs max-h-52 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-[10px] uppercase text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Run ID</th>
                    <th className="py-2 px-3">Scenario</th>
                    <th className="py-2 px-3">Disruption</th>
                    <th className="py-2 px-3">Delayed Flights</th>
                    <th className="py-2 px-3">Delay Mins</th>
                    <th className="py-2 px-3">Stranded Pax</th>
                    <th className="py-2 px-3">Health Score</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {history.map((item) => (
                    <tr key={item.simulation_id} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 font-bold text-white">{item.simulation_id}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {item.is_baseline ? 'Baseline' : `${item.airport_code} (${item.duration_minutes}m)`}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{item.disruption_type}</td>
                      <td className="py-2 px-3 text-amber-400">{item.delayed_flights}</td>
                      <td className="py-2 px-3 text-slate-200">{item.total_delay_minutes}m</td>
                      <td className="py-2 px-3 text-red-400">{item.stranded_passengers}</td>
                      <td className="py-2 px-3 text-cyan-400 font-bold">{item.health_score}%</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={async () => {
                            const res = await fetchSimulationResult(item.simulation_id);
                            onSelectScenario(res);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white text-[10px] transition-colors"
                        >
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Scenario Comparator */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Cross-Scenario Impact Comparator
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <select
                  value={compareIdA || ''}
                  onChange={(e) => setCompareIdA(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="">Select Scenario A</option>
                  {history.map((h) => (
                    <option key={h.simulation_id} value={h.simulation_id}>
                      {h.simulation_id}: {h.airport_code} ({h.duration_minutes}m)
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">vs</span>
                <select
                  value={compareIdB || ''}
                  onChange={(e) => setCompareIdB(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="">Select Scenario B</option>
                  {history.map((h) => (
                    <option key={h.simulation_id} value={h.simulation_id}>
                      {h.simulation_id}: {h.airport_code} ({h.duration_minutes}m)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLoadCompare}
                  disabled={!compareIdA || !compareIdB}
                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs"
                >
                  Compare
                </button>
              </div>
            </div>

            {scenarioA && scenarioB && (
              <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                {/* Scenario A Card */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="text-cyan-400 font-bold uppercase text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
                    <span>Scenario A: {scenarioA.disruption.airport_code} ({scenarioA.disruption.duration_minutes}m)</span>
                    <span className="text-slate-500">{scenarioA.simulation_id}</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delayed Flights:</span>
                      <span className="text-amber-400 font-bold">{scenarioA.metrics.delayed_flights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Delay Minutes:</span>
                      <span className="text-white font-bold">{scenarioA.metrics.total_delay_minutes}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stranded Passengers:</span>
                      <span className="text-red-400 font-bold">{scenarioA.metrics.stranded_passengers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Crew Violations:</span>
                      <span className="text-amber-400 font-bold">{scenarioA.metrics.crew_duty_violations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Network Health:</span>
                      <span className="text-emerald-400 font-bold">{scenarioA.metrics.network_health_score}%</span>
                    </div>
                  </div>
                </div>

                {/* Scenario B Card */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="text-purple-400 font-bold uppercase text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
                    <span>Scenario B: {scenarioB.disruption.airport_code} ({scenarioB.disruption.duration_minutes}m)</span>
                    <span className="text-slate-500">{scenarioB.simulation_id}</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delayed Flights:</span>
                      <span className="text-amber-400 font-bold">{scenarioB.metrics.delayed_flights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Delay Minutes:</span>
                      <span className="text-white font-bold">{scenarioB.metrics.total_delay_minutes}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stranded Passengers:</span>
                      <span className="text-red-400 font-bold">{scenarioB.metrics.stranded_passengers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Crew Violations:</span>
                      <span className="text-amber-400 font-bold">{scenarioB.metrics.crew_duty_violations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Network Health:</span>
                      <span className="text-emerald-400 font-bold">{scenarioB.metrics.network_health_score}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
