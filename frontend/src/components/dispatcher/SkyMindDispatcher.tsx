import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  Plane, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { 
  SimulationResult, 
  RecoveryRecommendation, 
  RecoveryComparison 
} from '../../types';
import { fetchRecommendations, applyRecovery, previewRecovery } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sim: SimulationResult | null;
  onApplySuccess: (comparison: RecoveryComparison) => void;
}

export const SkyMindDispatcher: React.FC<Props> = ({
  isOpen,
  onClose,
  sim,
  onApplySuccess
}) => {
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement;

    if (sim && !sim.is_baseline) {
      loadRecommendations();
    }

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
  }, [isOpen, sim]);

  const loadRecommendations = async () => {
    if (!sim) return;
    setIsLoading(true);
    setPreviewData(null);
    try {
      const recs = await fetchRecommendations(sim.simulation_id);
      setRecommendations(recs);
      if (recs.length > 0) {
        setSelectedRecId(recs[0].recommendation_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (candidateId: string) => {
    if (!sim) return;
    setIsLoading(true);
    try {
      const data = await previewRecovery(sim.simulation_id, candidateId);
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (candidateId: string) => {
    if (!sim) return;
    setIsApplying(true);
    try {
      const comparison = await applyRecovery(sim.simulation_id, candidateId);
      onApplySuccess(comparison);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const selectedRec = recommendations.find(r => r.recommendation_id === selectedRecId) || recommendations[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skymind-modal-title"
        className="w-full max-w-5xl max-h-[90vh] bg-aviation-darkest border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="skymind-modal-title" className="text-lg font-bold font-display tracking-wider text-white">SKY-MIND</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Autonomous Recovery Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Dispatch Advisory Layer • Deterministic Constraint-Checked Action Plans
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close SKY-MIND modal"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              <div className="text-sm font-mono text-slate-300">Evaluating Optimization Candidates...</div>
              <div className="text-xs text-slate-500 mt-1">Executing deterministic re-simulations across spare fleet & rotation graphs</div>
            </div>
          ) : sim?.is_baseline ? (
            <div className="py-20 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">All Flights Operating On-Time</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                The network is in nominal baseline state. No recovery intervention is currently required. Initiate a disruption to simulate recovery strategies.
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-20 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Feasible Recovery Candidates</h3>
              <p className="text-xs text-slate-400 mt-1">All available spares are committed or flights have departed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: List of Recommended Strategies */}
              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Candidate Strategies ({recommendations.length})</span>
                  <span className="text-[10px] text-cyan-400">Ranked by Net Impact</span>
                </div>

                <div className="space-y-2.5">
                  {recommendations.map((rec, idx) => {
                    const isSelected = selectedRec?.recommendation_id === rec.recommendation_id;
                    return (
                      <div
                        key={rec.recommendation_id}
                        onClick={() => {
                          setSelectedRecId(rec.recommendation_id);
                          setPreviewData(null);
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            {rec.action_type.replace('_', ' ')}
                          </span>
                          <span className="text-emerald-400 font-bold text-[11px]">
                            -{rec.expected_impact.total_delay_saved_minutes}m Delay
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                          {rec.title}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>Pax: +{rec.expected_impact.passengers_recovered}</span>
                          <span>Conn: +{rec.expected_impact.connections_restored}</span>
                          <span>Crew: +{rec.expected_impact.crew_violations_prevented}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 2 Columns: Detailed Operational Rationale & Deterministic Impact */}
              {selectedRec && (
                <div className="lg:col-span-2 space-y-4">
                  {/* Action Title Card */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> Strategy Specification
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">
                      {selectedRec.title}
                    </h3>
                    
                    {/* Key Deterministic Performance Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Delay Saved</span>
                        <span className="text-lg font-bold font-mono text-emerald-400">
                          {selectedRec.expected_impact.total_delay_saved_minutes} min
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Pax Rescued</span>
                        <span className="text-lg font-bold font-mono text-cyan-400">
                          {selectedRec.expected_impact.passengers_recovered}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Connections</span>
                        <span className="text-lg font-bold font-mono text-purple-400">
                          +{selectedRec.expected_impact.connections_restored}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono block">Crew Breaches</span>
                        <span className="text-lg font-bold font-mono text-amber-400">
                          -{selectedRec.expected_impact.crew_violations_prevented}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Rationale (Why Recommended) */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                    <div className="text-xs font-mono font-bold uppercase text-slate-300">
                      Operational Dispatch Rationale
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedRec.why_recommended}
                    </p>
                  </div>

                  {/* Trade-Offs & Feasibility */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                      <div className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Operational Trade-Offs
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedRec.trade_offs}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-1">
                      <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Regulatory Compliance
                      </div>
                      <p className="text-xs text-slate-400">
                        {selectedRec.confidence_evidence}
                      </p>
                    </div>
                  </div>

                  {/* Preview Comparison Callout if active */}
                  {previewData && (
                    <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-xs font-mono">
                      <div className="font-bold text-cyan-300 mb-1">Preview Simulation Verified:</div>
                      <div className="text-slate-300">
                        Executing this strategy will lower delayed flights from {previewData.comparison.before_metrics.delayed_flights} to {previewData.comparison.after_metrics.delayed_flights}, cutting total delay by {previewData.comparison.delay_reduction_minutes} minutes ({previewData.comparison.delay_reduction_percentage}%).
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handlePreview(selectedRec.candidate_id)}
                      disabled={isLoading || isApplying}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors"
                    >
                      Preview Impact
                    </button>

                    <button
                      onClick={() => handleApply(selectedRec.candidate_id)}
                      disabled={isLoading || isApplying}
                      className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                    >
                      {isApplying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Applying Recovery...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Apply & Re-Simulate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
