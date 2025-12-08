
import React, { useState, useEffect, useMemo } from 'react';
import { Flight, CrewMember, Aircraft, SystemSettings } from '../types';
import { BookOpen, Calendar, Save, Plane, CheckCircle2, RotateCcw, ArrowRight, Clock, User, AlertCircle } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { CalendarWidget } from './CalendarWidget';
import { updateFlight } from '../services/firebase';
import { calculateDuration } from '../utils/calculations';

interface VoyageReportManagerProps {
  flights: Flight[];
  fleet: Aircraft[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
}

// Local state interface for editing
interface FlightEditState {
    outTime: string;
    offTime: string;
    onTime: string;
    inTime: string;
    notes: string;
}

export const VoyageReportManager: React.FC<VoyageReportManagerProps> = ({ flights, fleet, crew, currentDate, isEnabled, onDateChange }) => {
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, FlightEditState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize edits when flights change or aircraft selected
  useEffect(() => {
      const newEdits: Record<string, FlightEditState> = {};
      flights.forEach(f => {
          // Ensure we initialize with empty strings to prevent controlled/uncontrolled warnings and default browser time values
          newEdits[f.id] = {
              outTime: f.outTime || '',
              offTime: f.offTime || '',
              onTime: f.onTime || '',
              inTime: f.inTime || '',
              notes: f.notes || ''
          };
      });
      setEdits(prev => ({ ...prev, ...newEdits }));
  }, [flights]);

  // Filter fleet to only show aircraft active on the selected date
  const activeFleet = useMemo(() => {
      const activeRegs = new Set(
          flights
              .filter(f => f.date === currentDate)
              .map(f => f.aircraftRegistration)
      );
      
      return fleet
        .filter(ac => activeRegs.has(ac.registration))
        .sort((a, b) => a.registration.localeCompare(b.registration));
  }, [fleet, flights, currentDate]);

  // Filter flights for the selected aircraft and date
  const aircraftFlights = useMemo(() => {
      return flights
        .filter(f => f.date === currentDate && f.aircraftRegistration === selectedAircraftReg)
        .sort((a, b) => (a.etd || '').localeCompare(b.etd || ''));
  }, [flights, currentDate, selectedAircraftReg]);

  // --- Handlers ---

  const handleEdit = (flightId: string, field: keyof FlightEditState, value: string) => {
      setEdits(prev => ({
          ...prev,
          [flightId]: {
              ...prev[flightId],
              [field]: value
          }
      }));
      setSaveSuccess(false);
  };

  const handleTimeBlur = (flightId: string, field: keyof FlightEditState, value: string) => {
      let formatted = value.trim();
      // Remove non-digits except colon
      formatted = formatted.replace(/[^0-9:]/g, '');
      
      // Handle 3 or 4 digits raw (e.g. 800 -> 08:00, 1430 -> 14:30)
      if (!formatted.includes(':') && formatted.length >= 3 && formatted.length <= 4) {
          if (formatted.length === 3) formatted = '0' + formatted; // 830 -> 0830
          formatted = formatted.slice(0, 2) + ':' + formatted.slice(2);
      }
      
      // Handle simple hours (e.g. 8 -> 08:00, 14 -> 14:00)
      if (!formatted.includes(':') && formatted.length > 0 && formatted.length <= 2) {
          formatted = formatted.padStart(2, '0') + ':00';
      }
  
      handleEdit(flightId, field, formatted);
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const promises = aircraftFlights.map(f => {
              const edit = edits[f.id];
              if (!edit) return Promise.resolve();

              // Calculate finals (Decimal hours for database/analytics)
              const actualFlightTime = calculateDuration(edit.offTime, edit.onTime);
              const actualBlockTime = calculateDuration(edit.outTime, edit.inTime);

              // Update fields
              return updateFlight(f.id, {
                  outTime: edit.outTime,
                  offTime: edit.offTime,
                  onTime: edit.onTime,
                  inTime: edit.inTime,
                  notes: edit.notes,
                  actualFlightTime: actualFlightTime > 0 ? actualFlightTime : undefined,
                  actualBlockTime: actualBlockTime > 0 ? actualBlockTime : undefined,
                  status: (edit.inTime && edit.onTime) ? 'Completed' : f.status
              });
          });

          await Promise.all(promises);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error) {
          console.error("Failed to save journey log", error);
          alert("Failed to save changes. Please try again.");
      } finally {
          setIsSaving(false);
      }
  };

  // --- Helpers for H:MM Display ---
  const getMinutesDiff = (start: string, end: string): number => {
      if (!start || !end) return 0;
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
      
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60; // Handle midnight crossing
      return diff;
  };

  const formatDuration = (minutes: number): string => {
      if (minutes <= 0) return '';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // --- Styles ---
  const inputCellClass = "p-1 border-r border-slate-100 last:border-r-0";
  const inputClass = "w-full text-center font-mono font-bold text-sm bg-transparent border border-transparent rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all py-2 text-slate-700 placeholder:text-slate-300 hover:bg-slate-50";
  const calcCellClass = "px-2 py-3 text-center font-mono font-bold text-sm border-r border-white/50";
  const superHeaderClass = "px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-200 first:border-l-0 bg-slate-50/80";
  const subHeaderClass = "px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center border-t border-slate-200";

  return (
    <FeatureGate isEnabled={isEnabled}>
        <div className="flex h-full bg-slate-50 relative overflow-hidden flex-col md:flex-row">
            
            {/* Sidebar Selection */}
            <div className="w-full md:w-72 bg-white border-r border-slate-200 p-0 flex flex-col shadow-sm z-10 shrink-0">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-1">
                        <BookOpen className="text-blue-600" size={20} />
                        Journey Log
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">Daily Flight Records</p>
                    <CalendarWidget selectedDate={currentDate} onDateSelect={(d) => { onDateChange(d); setSelectedAircraftReg(''); }} />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Active Fleet</div>
                    {activeFleet.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-100 mx-2">
                            <AlertCircle size={16} className="mx-auto mb-2 opacity-50"/>
                            No aircraft active on this date.
                        </div>
                    ) : (
                        activeFleet.map(ac => {
                            const isSelected = selectedAircraftReg === ac.registration;
                            
                            return (
                                <button
                                    key={ac.registration}
                                    onClick={() => setSelectedAircraftReg(ac.registration)}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all group
                                        ${isSelected 
                                            ? 'bg-slate-900 text-white shadow-md' 
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500`}></div>
                                        <span className="font-bold text-sm font-mono tracking-tight">{ac.registration}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}>{ac.type}</span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Log Sheet */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                {selectedAircraftReg ? (
                    <div className="flex flex-col h-full">
                        {/* Action Header */}
                        <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-20">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                                        <Plane size={20} />
                                    </div>
                                    <div>
                                        <span className="block text-2xl font-black text-slate-900 leading-none tracking-tight">
                                            {selectedAircraftReg}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500">Log Sheet Entry</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                                <div className="hidden sm:block">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Date</span>
                                    <div className="text-sm font-bold text-slate-700">{new Date(currentDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 items-center">
                                {saveSuccess && (
                                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100 animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle2 size={14} /> Saved
                                    </span>
                                )}
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 disabled:opacity-70"
                                >
                                    {isSaving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Log
                                </button>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 min-w-[1000px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        {/* Grouping Header */}
                                        <tr className="bg-slate-50">
                                            <th className={superHeaderClass} colSpan={1}>Identity</th>
                                            <th className={superHeaderClass} colSpan={2}>Crew</th>
                                            <th className={`${superHeaderClass} bg-blue-50/30 text-blue-600`} colSpan={4}>Block Times (Local)</th>
                                            <th className={`${superHeaderClass} bg-emerald-50/30 text-emerald-600`} colSpan={2}>Duration (H:MM)</th>
                                            <th className={superHeaderClass} colSpan={1}>Notes</th>
                                        </tr>
                                        {/* Column Header */}
                                        <tr className="bg-white">
                                            <th className={`${subHeaderClass} text-left pl-4`}>Flight / Route</th>
                                            <th className={subHeaderClass}>PIC</th>
                                            <th className={subHeaderClass}>SIC</th>
                                            
                                            <th className={`${subHeaderClass} bg-blue-50/10 w-24`}>Out</th>
                                            <th className={`${subHeaderClass} bg-blue-50/10 w-24`}>Off</th>
                                            <th className={`${subHeaderClass} bg-blue-50/10 w-24`}>On</th>
                                            <th className={`${subHeaderClass} bg-blue-50/10 w-24 border-r border-slate-200`}>In</th>
                                            
                                            <th className={`${subHeaderClass} bg-emerald-50/20 text-emerald-700 w-24`}>Flight</th>
                                            <th className={`${subHeaderClass} bg-blue-50/20 text-blue-700 w-24 border-r border-slate-200`}>Block</th>
                                            
                                            <th className={`${subHeaderClass} text-left pl-3`}>Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {aircraftFlights.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-24 text-center text-slate-400">
                                                    <div className="flex flex-col items-center">
                                                        <Plane className="opacity-20 mb-4" size={48} />
                                                        <p className="font-medium text-slate-600">No flights scheduled today</p>
                                                        <p className="text-xs mt-1">Use Flight Planning to add sectors for {selectedAircraftReg}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            aircraftFlights.map((flight) => {
                                                const edit = edits[flight.id] || { outTime: '', offTime: '', onTime: '', inTime: '', notes: '' };
                                                
                                                // Calculate minutes directly for H:MM display
                                                const flightMinutes = getMinutesDiff(edit.offTime, edit.onTime);
                                                const blockMinutes = getMinutesDiff(edit.outTime, edit.inTime);
                                                
                                                const routeParts = flight.route.split('-');

                                                return (
                                                    <tr key={flight.id} className="hover:bg-slate-50 transition-colors group">
                                                        {/* Identity */}
                                                        <td className="px-4 py-3 border-r border-slate-100">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-sm">{flight.flightNumber}</span>
                                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mt-0.5">
                                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{routeParts[0] || '---'}</span>
                                                                    <ArrowRight size={10} className="opacity-50" />
                                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{routeParts[1] || '---'}</span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Crew */}
                                                        <td className="px-2 py-3 text-center border-r border-slate-100">
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 min-w-[60px] justify-center">
                                                                <User size={10} className="opacity-50"/> {flight.pic}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-center border-r border-slate-100">
                                                            {flight.sic ? (
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-100 text-xs font-medium text-slate-500 min-w-[60px] justify-center">
                                                                    {flight.sic}
                                                                </div>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </td>

                                                        {/* Times Inputs */}
                                                        <td className={inputCellClass}>
                                                            <input 
                                                                type="text" 
                                                                className={inputClass} 
                                                                value={edit.outTime} 
                                                                onChange={e => handleEdit(flight.id, 'outTime', e.target.value)} 
                                                                onBlur={e => handleTimeBlur(flight.id, 'outTime', e.target.value)}
                                                                placeholder="-" 
                                                                maxLength={5}
                                                            />
                                                        </td>
                                                        <td className={inputCellClass}>
                                                            <input 
                                                                type="text" 
                                                                className={inputClass} 
                                                                value={edit.offTime} 
                                                                onChange={e => handleEdit(flight.id, 'offTime', e.target.value)} 
                                                                onBlur={e => handleTimeBlur(flight.id, 'offTime', e.target.value)}
                                                                placeholder="-" 
                                                                maxLength={5}
                                                            />
                                                        </td>
                                                        <td className={inputCellClass}>
                                                            <input 
                                                                type="text" 
                                                                className={inputClass} 
                                                                value={edit.onTime} 
                                                                onChange={e => handleEdit(flight.id, 'onTime', e.target.value)} 
                                                                onBlur={e => handleTimeBlur(flight.id, 'onTime', e.target.value)}
                                                                placeholder="-" 
                                                                maxLength={5}
                                                            />
                                                        </td>
                                                        <td className={`${inputCellClass} border-r border-slate-200`}>
                                                            <input 
                                                                type="text" 
                                                                className={inputClass} 
                                                                value={edit.inTime} 
                                                                onChange={e => handleEdit(flight.id, 'inTime', e.target.value)} 
                                                                onBlur={e => handleTimeBlur(flight.id, 'inTime', e.target.value)}
                                                                placeholder="-" 
                                                                maxLength={5}
                                                            />
                                                        </td>

                                                        {/* Calculations (Formatted H:MM) */}
                                                        <td className={`${calcCellClass} bg-emerald-50/40 text-emerald-700`}>
                                                            {flightMinutes > 0 ? formatDuration(flightMinutes) : <span className="text-emerald-200">-</span>}
                                                        </td>
                                                        <td className={`${calcCellClass} bg-blue-50/40 text-blue-700 border-r border-slate-200`}>
                                                            {blockMinutes > 0 ? formatDuration(blockMinutes) : <span className="text-blue-200">-</span>}
                                                        </td>

                                                        {/* Notes */}
                                                        <td className="px-3 py-2">
                                                            <input 
                                                                type="text" 
                                                                className="w-full text-xs font-medium border-0 border-b border-slate-200 bg-transparent focus:bg-white focus:border-blue-500 focus:ring-0 text-slate-600 placeholder:text-slate-300 px-1 py-1.5 transition-colors" 
                                                                placeholder="Add remarks..."
                                                                value={edit.notes}
                                                                onChange={e => handleEdit(flight.id, 'notes', e.target.value)}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                    {aircraftFlights.length > 0 && (
                                        <tfoot className="bg-slate-50 border-t border-slate-200 shadow-inner">
                                            <tr>
                                                <td colSpan={7} className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock size={14} /> Total Daily Hours
                                                    </div>
                                                </td>
                                                <td className="px-2 py-4 text-center">
                                                    <div className="bg-emerald-100 text-emerald-800 font-black font-mono text-lg py-1 px-3 rounded-lg border border-emerald-200 shadow-sm inline-block min-w-[80px]">
                                                        {formatDuration(aircraftFlights.reduce((acc, f) => {
                                                            const edit = edits[f.id];
                                                            return acc + (edit ? getMinutesDiff(edit.offTime, edit.onTime) : 0);
                                                        }, 0))}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-4 text-center border-r border-slate-200">
                                                    <div className="bg-blue-100 text-blue-800 font-black font-mono text-lg py-1 px-3 rounded-lg border border-blue-200 shadow-sm inline-block min-w-[80px]">
                                                        {formatDuration(aircraftFlights.reduce((acc, f) => {
                                                            const edit = edits[f.id];
                                                            return acc + (edit ? getMinutesDiff(edit.outTime, edit.inTime) : 0);
                                                        }, 0))}
                                                    </div>
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 animate-in zoom-in duration-500">
                            <Plane size={40} className="opacity-20 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">Select an Aircraft</h3>
                        <p className="text-sm max-w-xs text-center mt-2 text-slate-500">
                            Select an aircraft from the sidebar to access the digital journey log.
                        </p>
                    </div>
                )}
            </div>
        </div>
    </FeatureGate>
  );
};
