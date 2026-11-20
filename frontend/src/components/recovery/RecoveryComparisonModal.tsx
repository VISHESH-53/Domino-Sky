import React, { useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  X, 
  ArrowRight, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  Clock, 
  Plane, 
  AlertOctagon, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { RecoveryComparison } from '../../types';

interface Props {
  comparison: RecoveryComparison | null;
  onClose: () => void;
}

export const RecoveryComparisonModal: React.FC<Props> = ({ comparison, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!comparison) return;
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element inside modal
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [comparison, onClose]);

  if (!comparison) return null;

  const b = comparison.before_metrics;
  const a = comparison.after_metrics;

  const metricRows = [
    { label: 'Delayed Flights', before: b.delayed_flights, after: a.delayed_flights, diff: b.delayed_flights - a.delayed_flights, unit: '', invert: false },
    { label: 'Total Delay Minutes', before: `${b.total_delay_minutes}m`, after: `${a.total_delay_minutes}m`, diff: `${comparison.delay_reduction_minutes}m`, unit: '', invert: false },
    { label: 'Average Delay', before: `${b.average_delay_minutes}m`, after: `${a.average_delay_minutes}m`, diff: `${(b.average_delay_minutes - a.average_delay_minutes).toFixed(1)}m`, unit: '', invert: false },
    { label: 'Stranded Passengers', before: b.stranded_passengers, after: a.stranded_passengers, diff: b.stranded_passengers - a.stranded_passengers, unit: '', invert: false },
    { label: 'Missed Connections', before: b.missed_connections, after: a.missed_connections, diff: b.missed_connections - a.missed_connections, unit: '', invert: false },
    { label: 'Crew Violations', before: b.crew_duty_violations, after: a.crew_duty_violations, diff: b.crew_duty_violations - a.crew_duty_violations, unit: '', invert: false },
    { label: 'Network Health Score', before: `${b.network_health_score.toFixed(1)}%`, after: `${a.network_health_score.toFixed(1)}%`, diff: `+${(a.network_health_score - b.network_health_score).toFixed(1)}%`, unit: '', invert: true },
    { label: 'Network Recovery Rate', before: `${b.network_recovery_percentage.toFixed(1)}%`, after: `${a.network_recovery_percentage.toFixed(1)}%`, diff: `+${(a.network_recovery_percentage - b.network_recovery_percentage).toFixed(1)}%`, unit: '', invert: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-modal-title"
        className="w-full max-w-4xl max-h-[90vh] bg-aviation-darkest border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="recovery-modal-title" className="text-lg font-bold font-display tracking-wider text-white">RECOVERY SIMULATION COMPLETE</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Deterministic Before / After Comparison
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Applied Strategy: <span className="text-white font-semibold">{comparison.applied_action.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close recovery comparison modal"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-900/40 border-b border-slate-800">
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
            <span className="text-[10px] text-slate-400 font-mono block">Delay Cut</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {comparison.delay_reduction_minutes}m
            </span>
            <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
              -{comparison.delay_reduction_percentage}% systemic delay
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
            <span className="text-[10px] text-slate-400 font-mono block">Flights Recovered</span>
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {comparison.flights_recovered}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Restored to on-time
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
            <span className="text-[10px] text-slate-400 font-mono block">Connections Saved</span>
            <span className="text-2xl font-bold font-mono text-purple-400">
              {comparison.connections_restored}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Transfers preserved
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
            <span className="text-[10px] text-slate-400 font-mono block">Crew Breaches Cleared</span>
            <span className="text-2xl font-bold font-mono text-amber-400">
              {comparison.crew_violations_resolved}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Legal compliance restored
            </span>
          </div>
        </div>

        {/* Side-by-Side Split Screen Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs">
            {/* Table Header */}
            <div className="grid grid-cols-12 py-2.5 px-4 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-5">Operational Metric</div>
              <div className="col-span-2 text-center text-red-400">Before Recovery</div>
              <div className="col-span-1 text-center"></div>
              <div className="col-span-2 text-center text-emerald-400">After Recovery</div>
              <div className="col-span-2 text-right text-cyan-400">Net Delta</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-800/60">
              {metricRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 py-3 px-4 items-center hover:bg-slate-900/30 transition-colors">
                  <div className="col-span-5 text-slate-300 font-semibold">{row.label}</div>
                  <div className="col-span-2 text-center font-bold text-slate-300">{row.before}</div>
                  <div className="col-span-1 text-center text-slate-600">
                    <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                  </div>
                  <div className="col-span-2 text-center font-bold text-emerald-400">{row.after}</div>
                  <div className="col-span-2 text-right font-bold text-cyan-300">
                    {row.diff}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="text-xs text-slate-400 font-mono">
            Deterministic Engine Run IDs: Before <span className="text-slate-200">{comparison.before_simulation_id}</span> • After <span className="text-emerald-400">{comparison.after_simulation_id}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            Accept & Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
