import React from 'react';
import { 
  Building2, 
  Plane, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  Users, 
  UserX, 
  GitFork, 
  Wrench, 
  AlertOctagon, 
  Percent, 
  ShieldAlert 
} from 'lucide-react';
import { NetworkMetrics } from '../../types';

interface Props {
  metrics?: NetworkMetrics;
}

export const NetworkDashboard: React.FC<Props> = ({ metrics }) => {
  if (!metrics) return null;

  const cards = [
    {
      title: 'TOTAL AIRPORTS',
      value: metrics.total_airports,
      subtext: 'Indian network hubs',
      icon: Building2,
      color: 'text-slate-300',
      border: 'border-slate-800',
      highlight: 'bg-slate-800/40'
    },
    {
      title: 'ACTIVE FLIGHTS',
      value: metrics.total_flights,
      subtext: `${metrics.on_time_flights} on schedule`,
      icon: Plane,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      highlight: 'bg-cyan-950/20'
    },
    {
      title: 'TOTAL AIRCRAFT',
      value: metrics.total_aircraft,
      subtext: '14 Active • 2 Ready Spares',
      icon: Wrench,
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      highlight: 'bg-blue-950/20'
    },
    {
      title: 'ON-TIME FLIGHTS',
      value: metrics.on_time_flights,
      subtext: `${((metrics.on_time_flights / metrics.total_flights) * 100).toFixed(1)}% punctuality`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      highlight: 'bg-emerald-950/20'
    },
    {
      title: 'DELAYED FLIGHTS',
      value: metrics.delayed_flights,
      subtext: `${metrics.total_delay_minutes} total delay mins`,
      icon: Clock,
      color: metrics.delayed_flights > 0 ? 'text-amber-400' : 'text-slate-400',
      border: metrics.delayed_flights > 0 ? 'border-amber-500/40' : 'border-slate-800',
      highlight: metrics.delayed_flights > 0 ? 'bg-amber-950/30' : 'bg-slate-900/40',
      glow: metrics.delayed_flights > 0
    },
    {
      title: 'CANCELLED FLIGHTS',
      value: metrics.cancelled_flights,
      subtext: 'Tactical cancellations',
      icon: XCircle,
      color: metrics.cancelled_flights > 0 ? 'text-red-400' : 'text-slate-400',
      border: metrics.cancelled_flights > 0 ? 'border-red-500/40' : 'border-slate-800',
      highlight: metrics.cancelled_flights > 0 ? 'bg-red-950/30' : 'bg-slate-900/40',
      glow: metrics.cancelled_flights > 0
    },
    {
      title: 'AFFECTED PASSENGERS',
      value: metrics.affected_passengers.toLocaleString(),
      subtext: `Out of ${metrics.total_passengers.toLocaleString()} total`,
      icon: Users,
      color: metrics.affected_passengers > 0 ? 'text-amber-300' : 'text-slate-400',
      border: metrics.affected_passengers > 0 ? 'border-amber-500/30' : 'border-slate-800',
      highlight: 'bg-slate-900/40'
    },
    {
      title: 'STRANDED PASSENGERS',
      value: metrics.stranded_passengers.toLocaleString(),
      subtext: 'No onward flight same day',
      icon: UserX,
      color: metrics.stranded_passengers > 0 ? 'text-red-400' : 'text-slate-400',
      border: metrics.stranded_passengers > 0 ? 'border-red-500/50' : 'border-slate-800',
      highlight: metrics.stranded_passengers > 0 ? 'bg-red-950/40' : 'bg-slate-900/40',
      glow: metrics.stranded_passengers > 0
    },
    {
      title: 'MISSED CONNECTIONS',
      value: metrics.missed_connections,
      subtext: `${metrics.successful_connections} intact transfers`,
      icon: GitFork,
      color: metrics.missed_connections > 0 ? 'text-purple-400' : 'text-slate-400',
      border: metrics.missed_connections > 0 ? 'border-purple-500/40' : 'border-slate-800',
      highlight: metrics.missed_connections > 0 ? 'bg-purple-950/30' : 'bg-slate-900/40'
    },
    {
      title: 'AIRCRAFT UNAVAILABLE',
      value: metrics.aircraft_unavailable,
      subtext: metrics.spare_aircraft_deployed > 0 ? `${metrics.spare_aircraft_deployed} spares deployed` : 'Spares on standby',
      icon: ShieldAlert,
      color: metrics.aircraft_unavailable > 0 ? 'text-orange-400' : 'text-slate-400',
      border: metrics.aircraft_unavailable > 0 ? 'border-orange-500/40' : 'border-slate-800',
      highlight: 'bg-slate-900/40'
    },
    {
      title: 'CREW VIOLATIONS',
      value: metrics.crew_duty_violations,
      subtext: 'DGCA 600m FDP breaches',
      icon: AlertOctagon,
      color: metrics.crew_duty_violations > 0 ? 'text-red-500' : 'text-slate-400',
      border: metrics.crew_duty_violations > 0 ? 'border-red-500/60' : 'border-slate-800',
      highlight: metrics.crew_duty_violations > 0 ? 'bg-red-950/50' : 'bg-slate-900/40',
      glow: metrics.crew_duty_violations > 0
    },
    {
      title: 'RECOVERY RATE',
      value: `${metrics.network_recovery_percentage.toFixed(1)}%`,
      subtext: `Health Score: ${metrics.network_health_score.toFixed(1)}/100`,
      icon: Percent,
      color: metrics.network_recovery_percentage > 85 ? 'text-emerald-400' : 'text-amber-400',
      border: 'border-cyan-500/30',
      highlight: 'bg-cyan-950/20'
    }
  ];

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${card.border} ${card.highlight} transition-all duration-300 relative overflow-hidden group hover:scale-[1.02] ${card.glow ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''}`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-400 truncate">
                {card.title}
              </span>
              <Icon className={`w-3.5 h-3.5 ${card.color} opacity-80`} />
            </div>
            <div className={`text-xl font-bold font-mono ${card.color} tracking-tight`}>
              {card.value}
            </div>
            <div className="text-[10px] text-slate-400 font-sans truncate mt-0.5">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </section>
  );
};
