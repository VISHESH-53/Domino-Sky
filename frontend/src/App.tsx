import React, { useState, useEffect } from 'react';
import { CommandHeader } from './components/header/CommandHeader';
import { NetworkDashboard } from './components/dashboard/NetworkDashboard';
import { NetworkMap } from './components/network-map/NetworkMap';
import { DisruptionControlPanel } from './components/disruption/DisruptionControlPanel';
import { DominoPropagationTree } from './components/domino/DominoPropagationTree';
import { FlightIntelligenceTable } from './components/flight-table/FlightIntelligenceTable';
import { DisruptionCharts } from './components/analytics/DisruptionCharts';
import { SkyMindDispatcher } from './components/dispatcher/SkyMindDispatcher';
import { RecoveryComparisonModal } from './components/recovery/RecoveryComparisonModal';
import { ScenarioHistoryModal } from './components/history/ScenarioHistoryModal';

import {
  Airport,
  RouteNetworkItem,
  SimulationResult,
  DisruptionInput,
  RecoveryComparison
} from './types';

import {
  fetchAirports,
  fetchRoutes,
  fetchLatestSimulation,
  runSimulation,
  resetSimulation,
  ensureAuthenticated
} from './services/api';

export const App: React.FC = () => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [routes, setRoutes] = useState<RouteNetworkItem[]>([]);
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  // Modals
  const [isDispatcherOpen, setIsDispatcherOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [comparisonData, setComparisonData] = useState<RecoveryComparison | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      try {
        await ensureAuthenticated();
      } catch (authErr) {
        console.warn('Initial session auth notice:', authErr);
      }
      const [apts, rts, latestSim] = await Promise.all([
        fetchAirports(),
        fetchRoutes(),
        fetchLatestSimulation()
      ]);
      setAirports(apts);
      setRoutes(rts);
      setSim(latestSim);
    } catch (err) {
      console.error('Failed to initialize application:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateDisruption = async (input: DisruptionInput) => {
    setIsLoading(true);
    try {
      const res = await runSimulation(input);
      setSim(res);
    } catch (err) {
      console.error('Disruption simulation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const baseline = await resetSimulation();
      setSim(baseline);
      setComparisonData(null);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuccess = (comparison: RecoveryComparison) => {
    setComparisonData(comparison);
    // Refresh latest simulation
    fetchLatestSimulation().then(setSim);
  };

  return (
    <div className="min-h-screen bg-aviation-darkest text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. AOC Command Header */}
      <CommandHeader
        sim={sim}
        onReset={handleReset}
        onOpenDispatcher={() => setIsDispatcherOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isLoading={isLoading}
      />

      {/* 2. Main Command Center Container */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1720px] mx-auto w-full">
        {/* Module A: Network Operations Dashboard */}
        <NetworkDashboard metrics={sim?.metrics} />

        {/* Modules B & C: Network Map & Disruption Simulator Control Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Module B: Interactive Airport Network Map (8 cols) */}
          <div className="lg:col-span-8">
            <NetworkMap
              airports={airports}
              routes={routes}
              sim={sim}
              onSelectFlight={(flId) => setSelectedFlightId(flId)}
            />
          </div>

          {/* Module C: Disruption Control Panel (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <DisruptionControlPanel
              airports={airports}
              onInitiate={handleInitiateDisruption}
              onReset={handleReset}
              isLoading={isLoading}
              currentDisruption={sim?.disruption}
            />

            {/* Quick Demonstration Helper Card */}
            <div className="mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-cyan-300 font-bold uppercase">
                <span>Hackathon Demo Scenario</span>
                <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">1-Click Preset</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Mumbai (BOM) closed for 90m due to a severe thunderstorm. Observe how delay propagates along rotation VT-ABC (BLR → BOM → CCU → DEL), breaks connections at Delhi, and violates crew FDP.
              </p>
              <button
                type="button"
                onClick={() => handleInitiateDisruption({
                  airport_code: 'BOM',
                  start_time: '08:00',
                  duration_minutes: 90,
                  disruption_type: 'Thunderstorm'
                })}
                disabled={isLoading}
                className="w-full py-2 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white font-bold border border-cyan-500/40 transition-all text-center block"
              >
                Launch Mumbai 90m Thunderstorm Scenario
              </button>
            </div>
          </div>
        </div>

        {/* Module E: Domino Propagation Engine (Visual Node Graph & Timeline) */}
        <DominoPropagationTree
          sim={sim}
          onSelectFlight={(flId) => setSelectedFlightId(flId)}
        />

        {/* Analytics & Disruption Distribution Charts */}
        <DisruptionCharts sim={sim} />

        {/* Module H: Flight Intelligence Table */}
        <FlightIntelligenceTable
          flights={sim?.flights || []}
          selectedFlightId={selectedFlightId}
          onSelectFlight={(flId) => setSelectedFlightId(flId)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-aviation-darkest px-4 py-3 text-center text-xs font-mono text-slate-500">
        DOMINO SKY v1.0.0 • AI-Powered Airline Disruption & Recovery Simulator • 100% Deterministic Arithmetic Verification
      </footer>

      {/* Modals & Slide-Overs */}
      {/* Module F: SKY-MIND AI Dispatcher */}
      <SkyMindDispatcher
        isOpen={isDispatcherOpen}
        onClose={() => setIsDispatcherOpen(false)}
        sim={sim}
        onApplySuccess={handleApplySuccess}
      />

      {/* Module G: Recovery Before vs. After Comparison */}
      <RecoveryComparisonModal
        comparison={comparisonData}
        onClose={() => setComparisonData(null)}
      />

      {/* Module I: Scenario History & Cross-Comparison */}
      <ScenarioHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectScenario={(loadedSim) => setSim(loadedSim)}
      />
    </div>
  );
};

export default App;
