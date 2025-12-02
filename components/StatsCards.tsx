
import React from 'react';
import { OperationsStats } from '../types';
import { Plane, Users, Clock, Activity, CheckCircle2, AlertCircle, PlayCircle, StopCircle, Clock as ClockIcon } from 'lucide-react';

interface StatsCardsProps {
  stats: OperationsStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Flights */}
      <StatCard 
        label="Total Flights" 
        value={stats.totalFlights.toString()} 
        icon={<Plane size={24} className="text-white" />}
        color="bg-blue-600"
        subtext="Scheduled Operations"
      />
      
      {/* Active Crew */}
      <StatCard 
        label="Active Crew" 
        value={stats.activeCrew.toString()} 
        icon={<Users size={24} className="text-white" />}
        color="bg-indigo-600"
        subtext="Pilots & Cabin Crew"
      />
      
      {/* Flight Hours */}
      <StatCard 
        label="Flight Hours" 
        value={stats.flightHours.toFixed(1)} 
        unit="hrs"
        icon={<Clock size={24} className="text-white" />}
        color="bg-emerald-600"
        subtext="Total Block Time"
      />

      {/* Flight Status Breakdown - Double Width or Special Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
         <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Activity size={14} /> Live Status
            </span>
         </div>
         <div className="grid grid-cols-3 gap-2">
            <StatusPill count={stats.outbound} label="Outbound" color="bg-blue-100 text-blue-700" icon={<PlayCircle size={10}/>} />
            <StatusPill count={stats.inbound} label="Inbound" color="bg-indigo-100 text-indigo-700" icon={<Plane size={10} className="rotate-180"/>} />
            <StatusPill count={stats.onGround} label="On Grnd" color="bg-emerald-100 text-emerald-700" icon={<StopCircle size={10}/>} />
            <StatusPill count={stats.delayed} label="Delayed" color="bg-amber-100 text-amber-700" icon={<AlertCircle size={10}/>} />
            <StatusPill count={stats.completed} label="Done" color="bg-slate-100 text-slate-600" icon={<CheckCircle2 size={10}/>} />
            <StatusPill count={stats.scheduled} label="Sched" color="bg-slate-100 text-slate-500" icon={<ClockIcon size={10}/>} />
         </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
    label: string; 
    value: string; 
    unit?: string; 
    icon: React.ReactNode; 
    color: string; 
    subtext: string 
}> = ({ label, value, unit, icon, color, subtext }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {unit && <span className="text-sm font-bold text-slate-500">{unit}</span>}
                </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 ${color} transform group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
            <p className="text-xs font-medium text-slate-500">{subtext}</p>
        </div>
    </div>
);

const StatusPill: React.FC<{ count: number; label: string; color: string; icon: React.ReactNode }> = ({ count, label, color, icon }) => (
    <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${color} transition-transform hover:scale-105`}>
        <span className="text-lg font-black leading-none mb-0.5">{count}</span>
        <div className="flex items-center gap-1 opacity-80">
            {icon}
            <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
        </div>
    </div>
);
