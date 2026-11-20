import React, { useState, useEffect } from 'react';
import { Plane, AlertTriangle, RefreshCw, Download, Brain, Activity, ShieldCheck, Layers, UserCheck } from 'lucide-react';
import { SimulationResult } from '../../types';
import { getExportJsonUrl, getExportCsvUrl, getStoredUser, loginAsRole, ensureAuthenticated, AuthUser } from '../../services/api';

interface Props {
  sim: SimulationResult | null;
  onReset: () => void;
  onOpenDispatcher: () => void;
  onOpenHistory: () => void;
  isLoading: boolean;
}

export const CommandHeader: React.FC<Props> = ({
  sim,
  onReset,
  onOpenDispatcher,
  onOpenHistory,
  isLoading
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());
  const isBaseline = sim?.is_baseline ?? true;
  const metrics = sim?.metrics;

  useEffect(() => {
    ensureAuthenticated().then(user => setCurrentUser(user)).catch(console.error);
  }, []);

  const handleRoleChange = async (newRole: 'ADMIN' | 'DISPATCHER' | 'ANALYST' | 'VIEWER') => {
    try {
      const user = await loginAsRole(newRole);
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to switch role', err);
    }
  };

  const getSeverityBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-aviation-darkest/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Plane className="w-6 h-6 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-wider text-white">DOMINO SKY</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                AOC Command Center
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              One disruption. Hundreds of consequences. One intelligent recovery system.
            </p>
          </div>
        </div>

        {/* Live Network Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {/* Active Disruption State */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            {isBaseline ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400">NOMINAL BASELINE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-mono text-amber-300">
                  {sim?.disruption.airport_code} CLOSED ({sim?.disruption.duration_minutes}m)
                </span>
              </>
            )}
          </div>

          {/* Health Score Meter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Health:</span>
              <span className="text-xs font-mono font-bold text-white">
                {metrics?.network_health_score.toFixed(1)}%
              </span>
            </div>
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getSeverityBadge(metrics?.severity_level)}`}>
              {metrics?.severity_level || 'NORMAL'}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* AI Dispatcher Button */}
            <button
              onClick={onOpenDispatcher}
              className="relative group px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all"
            >
              <Brain className="w-4 h-4 text-cyan-200" />
              <span>SKY-MIND</span>
              <span className="hidden lg:inline text-cyan-200 text-[10px]">AI Dispatch</span>
            </button>

            {/* Scenario History */}
            <button
              onClick={onOpenHistory}
              title="Simulation Scenarios & Comparison"
              className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Reset to Baseline */}
            <button
              onClick={onReset}
              disabled={isLoading || isBaseline}
              title="Reset Network to Nominal Baseline"
              className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Exports */}
            <div className="flex items-center border border-slate-800 rounded-md overflow-hidden bg-slate-900">
              <a
                href={getExportCsvUrl(sim?.simulation_id)}
                download
                title="Export Flights Table as CSV"
                className="px-2 py-1.5 text-[11px] font-mono text-slate-300 hover:text-cyan-400 hover:bg-slate-800 border-r border-slate-800 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> CSV
              </a>
              <a
                href={getExportJsonUrl(sim?.simulation_id)}
                download
                title="Export Complete Simulation as JSON"
                className="px-2 py-1.5 text-[11px] font-mono text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                JSON
              </a>
            </div>

            {/* RBAC Role Selector */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <label htmlFor="user-role-select" className="text-[10px] font-mono text-slate-400">ROLE:</label>
              <select
                id="user-role-select"
                aria-label="Active User RBAC Role"
                value={currentUser?.role || 'DISPATCHER'}
                onChange={(e) => handleRoleChange(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="DISPATCHER">DISPATCHER</option>
                <option value="ANALYST">ANALYST</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
