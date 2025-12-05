
import React from 'react';
import { DigitalClock } from '../components/DigitalClock';
import { CalendarWidget } from '../components/CalendarWidget';
import { StatsCards } from '../components/StatsCards';
import { FlightTable } from '../components/FlightTable';
import { OperationsStats, Flight, FlightStatus } from '../types';

interface DashboardPageProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  stats: OperationsStats;
  filteredFlights: Flight[];
  onStatusUpdate: (id: string, status: FlightStatus) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentDate,
  onDateChange,
  stats,
  filteredFlights,
  onStatusUpdate
}) => {
  return (
    <div className="relative min-h-full bg-slate-50">
      <div className="absolute top-0 left-0 w-full h-80 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900 z-10" />
      </div>
      <div className="relative z-20 max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-24">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 text-white">
          <div className="animate-in slide-in-from-left-2 duration-500">
            <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Daily Operations<br />Dashboard
            </h1>
          </div>
          <div className="hidden lg:block animate-in slide-in-from-right-2 duration-500">
            <DigitalClock />
          </div>
        </header>
        
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl shadow-slate-900/5 border border-white/20 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-100/80 p-1.5 rounded-xl">
            <button className="px-6 py-2.5 bg-white rounded-lg shadow-sm text-slate-900 font-bold text-sm">
              Flight Board
            </button>
          </div>
          <div className="w-full md:w-auto flex justify-end">
            <CalendarWidget selectedDate={currentDate} onDateSelect={onDateChange} />
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          <StatsCards stats={stats} />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center justify-between px-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Live Schedule
            </h3>
          </div>
          <FlightTable 
            flights={filteredFlights} 
            readOnly={true} 
            onStatusUpdate={onStatusUpdate} 
          />
        </div>
      </div>
    </div>
  );
};
