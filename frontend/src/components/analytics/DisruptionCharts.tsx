import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { SimulationResult } from '../../types';
import { BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

interface Props {
  sim: SimulationResult | null;
}

export const DisruptionCharts: React.FC<Props> = ({ sim }) => {
  if (!sim) return null;

  // 1. Delay Distribution Histogram Data
  const dist = sim.delay_distribution || {};
  const delayData = [
    { name: 'On-Time (≤15m)', count: dist.on_time || 0, color: '#10b981' },
    { name: 'Minor (16-45m)', count: dist.minor_16_45 || 0, color: '#facc15' },
    { name: 'Moderate (46-90m)', count: dist.moderate_46_90 || 0, color: '#f97316' },
    { name: 'Severe (91-180m)', count: dist.severe_91_180 || 0, color: '#ef4444' },
    { name: 'Extreme (>180m)', count: dist.extreme_over_180 || 0, color: '#991b1b' },
    { name: 'Cancelled', count: dist.cancelled || 0, color: '#dc2626' },
  ];

  // 2. Top Disrupted Airports
  const topAirports = (sim.airport_disruption_ranking || [])
    .filter(a => a.total_delay_minutes > 0 || a.is_closed)
    .slice(0, 6)
    .map(a => ({
      name: a.code,
      delay: a.total_delay_minutes,
      pax: a.affected_passengers,
      isClosed: a.is_closed
    }));

  // 3. Passenger Breakdown
  const totalPax = sim.metrics.total_passengers || 1;
  const unaffected = Math.max(0, totalPax - sim.metrics.affected_passengers);
  const rebookablePax = Math.max(0, sim.metrics.affected_passengers - sim.metrics.stranded_passengers);
  
  const paxData = [
    { name: 'Normal / On-Time', value: unaffected, color: '#10b981' },
    { name: 'Delayed / Rebookable', value: rebookablePax, color: '#f59e0b' },
    { name: 'Stranded Overnight', value: sim.metrics.stranded_passengers, color: '#ef4444' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Chart 1: Delay Distribution Histogram */}
      <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Delay Distribution
          </div>
          <span className="text-[10px] font-mono text-slate-400">70 Sectors</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={delayData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'monospace' }} 
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {delayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Top Airport Disruption Ranking */}
      <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" /> Disrupted Hub Ranking
          </div>
          <span className="text-[10px] font-mono text-slate-400">Delay Mins</span>
        </div>
        <div className="h-48 w-full">
          {topAirports.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              All airports operating nominally.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAirports} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#f8fafc', fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="delay" radius={[0, 4, 4, 0]}>
                  {topAirports.map((entry, index) => (
                    <Cell key={`cell-apt-${index}`} fill={entry.isClosed ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 3: Passenger Impact Ratio */}
      <div className="p-4 rounded-xl border border-slate-800 bg-aviation-darkest shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <PieIcon className="w-3.5 h-3.5 text-purple-400" /> Passenger Impact
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {sim.metrics.total_passengers.toLocaleString()} Pax Total
          </span>
        </div>
        <div className="h-48 w-full flex items-center">
          <ResponsiveContainer width="60%" height="100%">
            <PieChart>
              <Pie
                data={paxData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={65}
                paddingAngle={3}
              >
                {paxData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '11px', fontFamily: 'monospace' }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="w-[40%] space-y-2 text-[10px] font-mono">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> On-Time
              </div>
              <div className="text-slate-300 pl-3.5">{unaffected.toLocaleString()}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Rebookable
              </div>
              <div className="text-slate-300 pl-3.5">{rebookablePax.toLocaleString()}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Stranded
              </div>
              <div className="text-slate-300 pl-3.5">{sim.metrics.stranded_passengers.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
