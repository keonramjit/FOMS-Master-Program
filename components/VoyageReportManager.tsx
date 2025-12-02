import React, { useState, useEffect, useMemo } from 'react';
import { Flight, CrewMember, SystemSettings, VoyageReport, VoyageEntry } from '../types';
import { BookOpen, User, Calendar, Save, Calculator, Clock, MapPin, Plane, AlertCircle, ArrowRight } from 'lucide-react';
import { FeatureGate } from './FeatureGate';
import { CalendarWidget } from './CalendarWidget';

interface VoyageReportManagerProps {
  flights: Flight[];
  crew: (CrewMember & { _docId?: string })[];
  currentDate: string;
  isEnabled: boolean;
  onDateChange: (date: string) => void;
}

export const VoyageReportManager: React.FC<VoyageReportManagerProps> = ({ flights, crew, currentDate, isEnabled, onDateChange }) => {
  const [selectedPilot, setSelectedPilot] = useState<string>('');
  
  // Note: We use currentDate from props as the source of truth for the date selection.
  // The CalendarWidget will update the global app state via onDateChange.
  
  const [report, setReport] = useState<VoyageReport | null>(null);

  // Smart Filter: Only show pilots scheduled for the selected date
  const activeCrewForDay = useMemo(() => {
      // 1. Get all flights for the selected date
      const daysFlights = flights.filter(f => f.date === currentDate);
      
      // 2. Extract unique crew codes (PIC and SIC)
      const activeCodes = new Set<string>();
      daysFlights.forEach(f => {
          if (f.pic) activeCodes.add(f.pic);
          if (f.sic) activeCodes.add(f.sic);
      });

      // 3. Filter the full crew roster against these codes
      return crew
        .filter(c => activeCodes.has(c.code))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [flights, crew, currentDate]);

  // Calculate Duration Helper (HH:MM -> Decimal Hours)
  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Handle midnight crossing
    return parseFloat((diff / 60).toFixed(2));
  };

  const handlePilotChange = (pilotCode: string) => {
    setSelectedPilot(pilotCode);
    if (pilotCode && currentDate) {
        initializeReport(pilotCode, currentDate);
    }
  };

  const handleDateChange = (date: string) => {
    onDateChange(date); // Sync Global State
    setSelectedPilot(''); // Reset selection when changing days to prevent mismatch
    setReport(null);
  };

  const initializeReport = (pilotCode: string, date: string) => {
    // 1. Find flights for this pilot on this date
    const pilotFlights = flights.filter(f => 
        f.date === date && (f.pic === pilotCode || f.sic === pilotCode)
    ).sort((a,b) => (a.etd || '').localeCompare(b.etd || ''));

    // 2. Map to entries
    const entries: VoyageEntry[] = pilotFlights.map(f => {
        const routeParts = f.route.split('-');
        return {
            id: f.id,
            flightId: f.id,
            flightNumber: f.flightNumber,
            aircraftReg: f.aircraftRegistration,
            from: routeParts[0] || '',
            to: routeParts[1] || '',
            outTime: '', 
            offTime: '',
            onTime: '',
            inTime: '',
            blockTime: 0,
            flightTime: 0,
            dayLandings: 0,
            nightLandings: 0,
            approaches: { ils: 0, rnav: 0, loc: 0, vor: 0, visual: 0 }
        };
    });

    setReport({
        id: `${date}-${pilotCode}`,
        date: date,
        crewCode: pilotCode,
        status: 'Open',
        entries: entries
    });
  };

  const updateEntry = (entryId: string, field: keyof VoyageEntry, value: any) => {
    setReport(prev => {
        if (!prev) return null;
        const newEntries = prev.entries.map(e => {
            if (e.id === entryId) {
                const updated = { ...e, [field]: value };
                
                // Auto Calculate Times
                if (['outTime', 'inTime'].includes(field as string)) {
                    updated.blockTime = calculateDuration(updated.outTime, updated.inTime);
                }
                if (['offTime', 'onTime'].includes(field as string)) {
                    updated.flightTime = calculateDuration(updated.offTime, updated.onTime);
                }
                
                return updated;
            }
            return e;
        });
        return { ...prev, entries: newEntries };
    });
  };

  const updateApproach = (entryId: string, type: keyof VoyageEntry['approaches'], val: number) => {
      setReport(prev => {
          if (!prev) return null;
          const newEntries = prev.entries.map(e => {
              if (e.id === entryId) {
                  return { 
                      ...e, 
                      approaches: { ...e.approaches, [type]: val } 
                  };
              }
              return e;
          });
          return { ...prev, entries: newEntries };
      });
  };

  // Totals
  const totalBlock = report?.entries.reduce((acc, e) => acc + e.blockTime, 0) || 0;
  const totalFlight = report?.entries.reduce((acc, e) => acc + e.flightTime, 0) || 0;
  const totalDayLdgs = report?.entries.reduce((acc, e) => acc + e.dayLandings, 0) || 0;
  const totalNightLdgs = report?.entries.reduce((acc, e) => acc + e.nightLandings, 0) || 0;

  // Styles
  const inputBase = "w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block px-1 py-1.5 text-center font-mono transition-all shadow-sm hover:border-slate-300";
  const timeInputClass = `${inputBase} placeholder:text-slate-300 font-bold`;
  const numberInputClass = `${inputBase} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold`;
  const smallLabelClass = "text-[9px] font-bold text-slate-400 uppercase text-center block mb-0.5";
  const thClass = "px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 text-center whitespace-nowrap align-bottom";

  return (
    <FeatureGate isEnabled={isEnabled}>
        <div className="flex h-full bg-slate-50 relative overflow-hidden flex-col md:flex-row">
            {/* Sidebar Selection */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-5 flex flex-col gap-6 shadow-sm z-10 shrink-0">
                <div>
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-1">
                        <BookOpen className="text-blue-600" size={20} />
                        Voyage Report
                    </h2>
                    <p className="text-xs text-slate-500">Daily Flight Logbook</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Operation Date</label>
                    <div className="w-full">
                        <CalendarWidget selectedDate={currentDate} onDateSelect={handleDateChange} />
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                        <span>Scheduled Crew</span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 rounded text-[10px]">{activeCrewForDay.length} Active</span>
                    </label>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                        {activeCrewForDay.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
                                <p className="text-xs text-slate-500 font-medium">No flights found for this date.</p>
                            </div>
                        ) : (
                            activeCrewForDay.map(p => (
                                <button
                                    key={p.code}
                                    onClick={() => handlePilotChange(p.code)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedPilot === p.code ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${selectedPilot === p.code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                        {p.code}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-medium truncate">{p.role}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Log Sheet */}
            <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
                {report ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-w-[1200px]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
                            <div className="flex items-center gap-10">
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pilot In Command</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shadow-sm border border-slate-200">
                                            {selectedPilot}
                                        </div>
                                        <div>
                                            <span className="block text-lg font-black text-slate-800 leading-tight">
                                                {crew.find(c => c.code === selectedPilot)?.name}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {crew.find(c => c.code === selectedPilot)?.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200"></div>
                                <div>
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Operation</span>
                                    <span className="text-lg font-mono font-bold text-slate-800 flex items-center gap-2">
                                        <Calendar size={18} className="text-blue-500" />
                                        {new Date(currentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm shadow-lg shadow-blue-200 transition-all transform active:scale-95">
                                    <Save size={18}/> Save Report
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className={`${thClass} text-left pl-6 w-64`}>Flight Details</th>
                                        <th className={thClass}>Out</th>
                                        <th className={thClass}>Off</th>
                                        <th className={thClass}>On</th>
                                        <th className={thClass}>In</th>
                                        <th className={`${thClass} bg-blue-50 text-blue-700 border-b-blue-100`}>Block<br/><span className="text-[9px] opacity-70">Ramp Time</span></th>
                                        <th className={`${thClass} bg-emerald-50 text-emerald-700 border-b-emerald-100`}>Flight<br/><span className="text-[9px] opacity-70">Air Time</span></th>
                                        <th className={thClass} colSpan={2}>Landings<br/><span className="text-[9px] opacity-70">Day / Night</span></th>
                                        <th className={thClass} colSpan={4}>Instrument Approaches<br/><span className="text-[9px] opacity-70">ILS / RNAV / LOC / VOR</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {report.entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className="py-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center">
                                                    <Plane className="opacity-20 mb-2" size={32} />
                                                    <p>No flights scheduled for this pilot on this date.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        report.entries.map((entry, idx) => (
                                            <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                                                {/* Flight Details */}
                                                <td className="p-4 pl-6 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-800 text-sm tracking-tight">{entry.flightNumber}</span>
                                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 border border-slate-200 font-mono">{entry.aircraftReg}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                                                            <span>{entry.from}</span>
                                                            <ArrowRight size={10} className="text-slate-400" />
                                                            <span>{entry.to}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Times */}
                                                <td className="p-3 w-20 align-middle"><input className={timeInputClass} placeholder="--" value={entry.outTime} onChange={e => updateEntry(entry.id, 'outTime', e.target.value)} maxLength={5} /></td>
                                                <td className="p-3 w-20 align-middle"><input className={timeInputClass} placeholder="--" value={entry.offTime} onChange={e => updateEntry(entry.id, 'offTime', e.target.value)} maxLength={5} /></td>
                                                <td className="p-3 w-20 align-middle"><input className={timeInputClass} placeholder="--" value={entry.onTime} onChange={e => updateEntry(entry.id, 'onTime', e.target.value)} maxLength={5} /></td>
                                                <td className="p-3 w-20 align-middle"><input className={timeInputClass} placeholder="--" value={entry.inTime} onChange={e => updateEntry(entry.id, 'inTime', e.target.value)} maxLength={5} /></td>
                                                
                                                {/* Calculations */}
                                                <td className="p-3 w-20 bg-blue-50/30 align-middle text-center">
                                                    <div className="font-black font-mono text-blue-700 text-sm">{entry.blockTime > 0 ? entry.blockTime.toFixed(1) : '-'}</div>
                                                </td>
                                                <td className="p-3 w-20 bg-emerald-50/30 align-middle text-center">
                                                    <div className="font-black font-mono text-emerald-700 text-sm">{entry.flightTime > 0 ? entry.flightTime.toFixed(1) : '-'}</div>
                                                </td>
                                                
                                                {/* Landings */}
                                                <td className="p-2 w-16 align-middle">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>Day</span>
                                                        <input type="number" min="0" className={numberInputClass} value={entry.dayLandings || ''} onChange={e => updateEntry(entry.id, 'dayLandings', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                                <td className="p-2 w-16 align-middle border-r border-slate-100">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>Ngt</span>
                                                        <input type="number" min="0" className={numberInputClass + " bg-slate-50 text-slate-700"} value={entry.nightLandings || ''} onChange={e => updateEntry(entry.id, 'nightLandings', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                                
                                                {/* Approaches */}
                                                <td className="p-2 w-14 align-middle">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>ILS</span>
                                                        <input type="number" min="0" className={numberInputClass} value={entry.approaches.ils || ''} onChange={e => updateApproach(entry.id, 'ils', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                                <td className="p-2 w-14 align-middle">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>RNAV</span>
                                                        <input type="number" min="0" className={numberInputClass} value={entry.approaches.rnav || ''} onChange={e => updateApproach(entry.id, 'rnav', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                                <td className="p-2 w-14 align-middle">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>LOC</span>
                                                        <input type="number" min="0" className={numberInputClass} value={entry.approaches.loc || ''} onChange={e => updateApproach(entry.id, 'loc', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                                <td className="p-2 w-14 align-middle pr-4">
                                                    <div className="flex flex-col items-center">
                                                        <span className={smallLabelClass}>VOR</span>
                                                        <input type="number" min="0" className={numberInputClass} value={entry.approaches.vor || ''} onChange={e => updateApproach(entry.id, 'vor', Number(e.target.value))} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-widest">Daily Totals</td>
                                        <td className="px-3 py-4 text-center font-black font-mono text-blue-800 text-lg bg-blue-100/50 border-t border-blue-200">{totalBlock.toFixed(1)}</td>
                                        <td className="px-3 py-4 text-center font-black font-mono text-emerald-800 text-lg bg-emerald-100/50 border-t border-emerald-200">{totalFlight.toFixed(1)}</td>
                                        <td className="px-3 py-4 text-center font-bold text-slate-700">{totalDayLdgs}</td>
                                        <td className="px-3 py-4 text-center font-bold text-slate-700 border-r border-slate-200">{totalNightLdgs}</td>
                                        <td colSpan={4} className="text-center text-xs text-slate-400 font-medium italic">
                                            Auto-calculated from inputs
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                            <User size={40} className="opacity-20 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">Select a Pilot</h3>
                        <p className="text-sm max-w-xs text-center mt-2 text-slate-500">
                            Select a scheduled crew member from the sidebar to view or edit their voyage report for 
                            <span className="font-bold text-slate-700 ml-1">{new Date(currentDate).toLocaleDateString()}</span>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    </FeatureGate>
  );
};