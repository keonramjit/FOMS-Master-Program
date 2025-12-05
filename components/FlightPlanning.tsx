
import React, { useState, useEffect } from 'react';
import { Flight, Aircraft, CrewMember, RouteDefinition, CustomerDefinition } from '../types';
import { CalendarWidget } from './CalendarWidget';
import { Plus, Trash2, MapPin, User, Hash, Clock, AlertCircle, RefreshCw, CheckCircle2, Plane, Save, ChevronDown, X, Activity, FileDown, ArrowRightLeft } from 'lucide-react';
import { syncFlightSchedule } from '../services/firebase';

interface FlightPlanningProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  flights: Flight[];
  fleet: (Aircraft & { _docId?: string })[];
  crew: (CrewMember & { _docId?: string })[];
  routes: RouteDefinition[];
  customers: CustomerDefinition[];
  onAddFlight: (flight: Omit<Flight, 'id'>) => Promise<void>;
  onUpdateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  onDeleteFlight: (id: string) => Promise<void>;
}

export const FlightPlanning: React.FC<FlightPlanningProps> = ({
  currentDate,
  onDateChange,
  flights,
  fleet,
  crew,
  routes,
  customers,
  onAddFlight,
  onUpdateFlight,
  onDeleteFlight,
}) => {
  const [localFlights, setLocalFlights] = useState<Flight[]>([]);
  const [removedFlightIds, setRemovedFlightIds] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);

  useEffect(() => {
    if (!hasUnsavedChanges && removedFlightIds.length === 0) {
      // Sort by persistent 'order' field to maintain visual arrangement after sync
      const sortedFlights = flights
        .filter(f => f.date === currentDate)
        .sort((a, b) => (a.order ?? 99999) - (b.order ?? 99999));
        
      setLocalFlights(sortedFlights);
    }
  }, [currentDate, flights, hasUnsavedChanges, removedFlightIds.length]);

  const isSynced = !hasUnsavedChanges && removedFlightIds.length === 0;

  // Define sync button properties based on state
  const syncProps = {
    icon: isSyncing ? <RefreshCw size={18} className="animate-spin" /> : (isSynced ? <CheckCircle2 size={18} /> : <Save size={18} />),
    text: isSyncing ? 'Syncing...' : (isSynced ? 'Synced' : 'Sync Changes'),
    color: isSynced ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 border-blue-700 hover:bg-blue-700',
    tooltip: isSynced ? 'All changes saved to cloud' : 'Push local changes to cloud'
  };

  const handleSyncReq = () => {
    if (isSynced) return;
    setShowConfirmSync(true);
  };

  const handleExportPDF = async () => {
    try {
      const { generateDailySchedulePDF } = await import('../services/pdfService');
      generateDailySchedulePDF(currentDate, localFlights);
    } catch (e) {
      console.error("Failed to load PDF generator", e);
      alert("Could not generate PDF. Please check your connection.");
    }
  };

  const handleClearSchedule = () => {
    if (localFlights.length === 0) return;
    if (!window.confirm(`Are you sure you want to clear all ${localFlights.length} flights for ${currentDate}? This action requires syncing to take effect.`)) return;

    setHasUnsavedChanges(true);
    const persistedIds = localFlights
        .filter(f => !f.id.startsWith('temp-') && !f.id.startsWith('imported-'))
        .map(f => f.id);
    setRemovedFlightIds(prev => [...prev, ...persistedIds]);
    setLocalFlights([]);
  };

  const executeSync = async () => {
    setShowConfirmSync(false);
    setIsSyncing(true);
    try {
        // Capture the current visual order by assigning an index
        const orderedFlights = localFlights.map((f, i) => ({ ...f, order: i }));

        const adds: Omit<Flight, 'id'>[] = [];
        const updates: { id: string; data: Partial<Flight> }[] = [];
        
        orderedFlights.forEach(f => {
           if (f.id.startsWith('temp-') || f.id.startsWith('imported-')) {
             const { id, ...rest } = f;
             adds.push(rest);
           } else {
             const { id, ...rest } = f;
             // Include 'order' in the update to persist the visual arrangement
             updates.push({ id, data: rest });
           }
        });
        
        await syncFlightSchedule(adds, updates, removedFlightIds);
        setRemovedFlightIds([]);
        setHasUnsavedChanges(false);
    } catch (error) {
        console.error("Sync failed", error);
        alert("Failed to sync changes to dashboard. Please try again.");
    } finally {
        setIsSyncing(false);
    }
  };

  const handleAddRow = (aircraft: Aircraft) => {
    setHasUnsavedChanges(true);
    const newFlight: Flight = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      flightNumber: 'TGY',
      route: '',
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      etd: '',
      customer: '',
      customerId: '',
      pic: '',
      sic: '',
      status: 'Scheduled',
      date: currentDate,
      notes: '',
      commercialTime: ''
    };
    setLocalFlights(prev => [...prev, newFlight]);
  };

  const handleAddSegment = (sourceFlight: Flight) => {
    setHasUnsavedChanges(true);
    let newRoute = '';
    if (sourceFlight.route) {
        if (sourceFlight.route.includes('-')) {
            const parts = sourceFlight.route.split('-');
            if (parts[1]) newRoute = `${parts[1]}-`;
        } else {
            newRoute = `${sourceFlight.route}-`;
        }
    }

    let newFlightNum = 'TGY';
    const numMatch = sourceFlight.flightNumber.match(/(\d+)$/);
    if (numMatch) {
        const currentNum = parseInt(numMatch[0], 10);
        const prefix = sourceFlight.flightNumber.substring(0, numMatch.index);
        newFlightNum = `${prefix}${currentNum + 1}`;
    }

    const parentId = sourceFlight.parentId || sourceFlight.id;
    const newFlight: Flight = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      parentId: parentId, 
      flightNumber: newFlightNum,
      route: newRoute,
      aircraftRegistration: sourceFlight.aircraftRegistration,
      aircraftType: sourceFlight.aircraftType,
      etd: '',
      customer: '',
      customerId: '',
      pic: sourceFlight.pic,
      sic: sourceFlight.sic,
      status: 'Scheduled',
      date: currentDate,
      notes: '',
      commercialTime: ''
    };
    
    // Insert immediately after the source flight to maintain visual context
    setLocalFlights(prev => {
        const idx = prev.findIndex(f => f.id === sourceFlight.id);
        if (idx !== -1) {
            const newArr = [...prev];
            newArr.splice(idx + 1, 0, newFlight);
            return newArr;
        }
        return [...prev, newFlight];
    });
  };

  const handleAddReturn = (sourceFlight: Flight) => {
    setHasUnsavedChanges(true);
    let newRoute = '';
    if (sourceFlight.route) {
        if (sourceFlight.route.includes('-')) {
            const [a, b] = sourceFlight.route.split('-');
            newRoute = `${b}-${a}`;
        } else {
            newRoute = ''; 
        }
    }

    let newFlightNum = 'TGY';
    const numMatch = sourceFlight.flightNumber.match(/(\d+)$/);
    if (numMatch) {
        const currentNum = parseInt(numMatch[0], 10);
        const prefix = sourceFlight.flightNumber.substring(0, numMatch.index);
        newFlightNum = `${prefix}${currentNum + 1}`;
    }

    let newEtd = '';
    if (sourceFlight.etd) {
        const [h, m] = sourceFlight.etd.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
             const flightDurationMinutes = (sourceFlight.flightTime || 0) * 60;
             const turnaroundMinutes = 30; 
             const totalMinutes = (h * 60) + m + flightDurationMinutes + turnaroundMinutes;
             const newH = Math.floor(totalMinutes / 60) % 24;
             const newM = Math.floor(totalMinutes % 60);
             newEtd = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        }
    }

    const parentId = sourceFlight.parentId || sourceFlight.id;
    const newFlight: Flight = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      parentId: parentId,
      flightNumber: newFlightNum,
      route: newRoute,
      aircraftRegistration: sourceFlight.aircraftRegistration,
      aircraftType: sourceFlight.aircraftType,
      etd: newEtd,
      customer: sourceFlight.customer, 
      customerId: sourceFlight.customerId,
      pic: sourceFlight.pic,
      sic: sourceFlight.sic,
      status: 'Scheduled',
      date: currentDate,
      notes: `Return of ${sourceFlight.flightNumber}`,
      commercialTime: ''
    };
    
    // Insert immediately after the source flight to maintain visual context
    setLocalFlights(prev => {
        const idx = prev.findIndex(f => f.id === sourceFlight.id);
        if (idx !== -1) {
            const newArr = [...prev];
            newArr.splice(idx + 1, 0, newFlight);
            return newArr;
        }
        return [...prev, newFlight];
    });
  };

  const handleDeleteRow = (id: string) => {
    setHasUnsavedChanges(true);
    setLocalFlights(prev => prev.filter(f => f.id !== id));
    if (!id.startsWith('temp-') && !id.startsWith('imported-')) {
        setRemovedFlightIds(prev => [...prev, id]);
    }
  };

  const handleCellChange = (id: string, field: keyof Flight, value: string) => {
    setHasUnsavedChanges(true);
    setLocalFlights(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleCustomerChange = (id: string, name: string) => {
    setHasUnsavedChanges(true);
    const customer = customers.find(c => c.name === name);
    setLocalFlights(prev => prev.map(f => {
        if (f.id === id) {
            return {
                ...f,
                customer: name,
                customerId: customer ? customer.customerId : '' 
            };
        }
        return f;
    }));
  };

  const handleRouteChange = (id: string, val: string) => {
    setHasUnsavedChanges(true);
    const code = val.toUpperCase();
    setLocalFlights(prev => prev.map(f => {
        if (f.id === id) {
             return { ...f, route: code };
        }
        return f;
    }));
  };

  const aircraftGroups = ['C208B', 'C208EX', '1900D'];
  const pilots = crew.filter(c => !c.role?.toLowerCase().includes('cabin crew')).sort((a,b) => a.code.localeCompare(b.code));

  const getAircraftTheme = () => ({ 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200', 
      text: 'text-emerald-900', 
      accent: 'bg-emerald-600', 
      hover: 'hover:bg-emerald-100' 
  });

  const gridCols = "grid-cols-[1.3fr_0.5fr_0.35fr_0.35fr_0.5fr_0.5fr_0.4fr_0.6fr_0.7fr_0.5fr_0.8fr_0.9fr_96px]";
  const cellWrapperClass = "border-r border-slate-200 p-0 relative focus-within:z-10 bg-white transition-colors hover:bg-slate-50 flex items-center";
  const inputClass = "w-full h-full bg-transparent outline-none transition-all placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 text-sm px-3 py-2 text-slate-900 font-semibold rounded-sm";
  const selectClass = `${inputClass} appearance-none cursor-pointer pr-6`;

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'Outbound': return 'text-blue-700';
        case 'Inbound': return 'text-indigo-700';
        case 'On Ground': return 'text-emerald-700';
        case 'Delayed': return 'text-amber-600';
        case 'Cancelled': return 'text-rose-600';
        default: return 'text-slate-900';
    }
  };

  const getRouteParts = (route: string) => {
    if (route && route.includes('-')) {
        const [a, b] = route.split('-');
        return { from: a, to: b };
    }
    return { from: route, to: '' };
  };

  // Derive unique airports from existing routes for suggestions
  const uniqueAirports = Array.from(new Set(
      routes.flatMap(r => r.code.split('-'))
  )).sort();

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        {/* ... Header Buttons (Sync, etc) ... */}
        <div className="flex items-center gap-6">
            <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Flight Planning
            </h1>
            {!isSynced && (
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    <p className="text-xs text-red-600 font-bold">Edits Pending</p>
                </div>
            )}
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <CalendarWidget selectedDate={currentDate} onDateSelect={(date) => {
                if(!isSynced) {
                    if(window.confirm("You have unsaved changes. Discard them?")) {
                        setHasUnsavedChanges(false);
                        setRemovedFlightIds([]);
                        onDateChange(date);
                    }
                } else {
                    onDateChange(date);
                }
            }} />

            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            
            <button
                onClick={handleExportPDF}
                className="p-2.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-all shadow-sm"
                title="Export Schedule as PDF"
            >
                <FileDown size={20} />
            </button>

            <button
                onClick={handleClearSchedule}
                disabled={localFlights.length === 0}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                title="Clear Entire Schedule"
            >
                <Trash2 size={20} />
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            <button 
                onClick={handleSyncReq}
                disabled={isSyncing || isSynced}
                title={syncProps.tooltip}
                className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all border text-white
                    ${syncProps.color}
                    disabled:opacity-90 disabled:cursor-not-allowed
                `}
            >
                {syncProps.icon}
                {syncProps.text}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:px-6 lg:py-4 custom-scrollbar">
        <div className="min-w-[1300px] flex flex-col pb-10">
            
            <div className={`grid ${gridCols} bg-slate-800 text-slate-200 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-20 shadow-md rounded-t-lg border-x border-t border-slate-800`}>
                <div className="px-3 py-3 border-r border-slate-700/50 flex items-center">Customer</div>
                <div className="px-3 py-3 border-r border-slate-700/50 flex items-center gap-1.5"><Hash size={12} className="text-slate-400"/> Cus #</div>
                <div className="px-3 py-3 border-r border-slate-700/50 flex items-center gap-1.5 justify-center"><MapPin size={12} className="text-slate-400"/> From</div>
                <div className="px-3 py-3 border-r border-slate-700/50 flex items-center gap-1.5 justify-center"><MapPin size={12} className="text-slate-400"/> To</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center flex items-center justify-center gap-1.5"><User size={12} className="text-slate-400"/> PIC</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center flex items-center justify-center gap-1.5"><User size={12} className="text-slate-400"/> SIC</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center text-slate-400">OC</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center flex items-center justify-center gap-1.5"><Clock size={12} className="text-slate-400"/> ETD</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center flex items-center justify-center gap-1.5"><Activity size={12} className="text-slate-400"/> Status</div>
                <div className="px-3 py-3 border-r border-slate-700/50 text-center">C/Time</div>
                <div className="px-3 py-3 border-r border-slate-700/50">Flight #</div>
                <div className="px-3 py-3 border-r border-slate-700/50">Comments</div>
                <div className="px-3 py-3 text-center"></div>
            </div>

            <div className="flex flex-col gap-8 mt-0 bg-slate-100/50 pt-2">
            {aircraftGroups.map((groupType) => {
                const groupFleet = fleet.filter(f => f.type === groupType).sort((a,b) => a.registration.localeCompare(b.registration));
                if (groupFleet.length === 0) return null;

                return (
                    <div key={groupType} className="flex flex-col gap-5">
                        <div className="flex items-center gap-4 px-3 py-2 mt-4 bg-slate-200/50 border-y border-slate-200 backdrop-blur-sm sticky top-[42px] z-10">
                            <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest">{groupType} Fleet</h3>
                            <div className="h-1 bg-slate-300 flex-1 rounded-full opacity-50"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-300">{groupFleet.length} Aircraft</span>
                        </div>

                        <div className="flex flex-col gap-5 px-1">
                        {groupFleet.map((aircraft) => {
                            // Filter specifically for this aircraft
                            // The relative order from localFlights is preserved, which is sorted by 'order'
                            const aircraftFlights = localFlights.filter(f => f.aircraftRegistration === aircraft.registration);
                            
                            const isMaintenance = aircraft.status !== 'Active';
                            const theme = getAircraftTheme();
                            
                            return (
                                <div key={aircraft.registration} className={`group/section bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-400 transition-all duration-300`}>
                                    <div className={`flex items-center justify-between px-4 py-2 border-b border-slate-200 transition-colors ${isMaintenance ? 'bg-amber-50/80 border-l-[6px] border-l-amber-500' : `${theme.bg} border-l-[6px] border-l-${theme.accent.replace('bg-', '')}`}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-white ${isMaintenance ? 'bg-amber-500' : theme.accent}`}>
                                                    <Plane size={16} fill="currentColor" className="opacity-90" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`block font-extrabold text-base leading-tight ${isMaintenance ? 'text-amber-900' : theme.text}`}>{aircraft.registration}</span>
                                                    <span className="block text-[10px] font-bold opacity-60 uppercase tracking-wide leading-tight">{aircraft.type}</span>
                                                </div>
                                            </div>
                                            {isMaintenance && (<span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shadow-sm"><AlertCircle size={10} /> {aircraft.status}</span>)}
                                        </div>
                                        <button onClick={() => handleAddRow(aircraft)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isMaintenance ? 'text-amber-800 hover:bg-amber-100 bg-amber-50 border border-amber-200' : `text-slate-600 bg-white border border-slate-200 hover:border-${theme.accent.replace('bg-', '')} hover:text-${theme.accent.replace('bg-', '')} shadow-sm`}`} title="Add Flight Row"><Plus size={14} strokeWidth={3} /> Add Flight</button>
                                    </div>
                
                                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                                    {aircraftFlights.map((flight) => {
                                        const routeParts = getRouteParts(flight.route);
                                        const isSegment = !!flight.parentId;

                                        return (
                                        <div key={flight.id} className={`grid ${gridCols} transition-all group/row hover:bg-blue-50/30`}>
                                            <div className={`${cellWrapperClass} relative`}>
                                                {isSegment && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col items-center pointer-events-none z-20">
                                                        <div className="h-1/2 w-px bg-slate-300 border-l border-slate-300 absolute top-0 left-3"></div>
                                                        <div className="w-3 h-px bg-slate-300 border-t border-slate-300 absolute top-1/2 left-3"></div>
                                                    </div>
                                                )}
                                                <div className={`relative w-full h-full ${isSegment ? 'pl-5' : ''}`}>
                                                    <select value={flight.customer || ''} onChange={(e) => handleCustomerChange(flight.id, e.target.value)} className={`${selectClass} ${isSegment ? 'text-slate-600 font-medium' : 'font-bold'}`}>
                                                        <option value="">Select Customer...</option>
                                                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className={cellWrapperClass}><input value={flight.customerId || ''} onChange={(e) => handleCellChange(flight.id, 'customerId', e.target.value)} className={`${inputClass} text-slate-600 font-mono text-center`} placeholder="---" /></div>
                                            
                                            <div className={cellWrapperClass}>
                                                <input list="airport-options" value={routeParts.from} onChange={(e) => { const newVal = e.target.value.toUpperCase(); handleRouteChange(flight.id, `${newVal}-${routeParts.to}`); }} className={`${inputClass} text-blue-800 font-bold font-mono uppercase tracking-wide text-center`} placeholder="DEP" />
                                            </div>
                                            <div className={cellWrapperClass}>
                                                <input list="airport-options" value={routeParts.to} onChange={(e) => { const newVal = e.target.value.toUpperCase(); handleRouteChange(flight.id, `${routeParts.from}-${newVal}`); }} className={`${inputClass} text-blue-800 font-bold font-mono uppercase tracking-wide text-center`} placeholder="ARR" />
                                            </div>
                
                                            <div className={cellWrapperClass}><select value={flight.pic} onChange={(e) => handleCellChange(flight.id, 'pic', e.target.value)} className={`${selectClass} text-center font-bold text-slate-800 uppercase`}><option value="">--</option>{pilots.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}</select><ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" /></div>
                                            <div className={cellWrapperClass}><select value={flight.sic} onChange={(e) => handleCellChange(flight.id, 'sic', e.target.value)} className={`${selectClass} text-center font-medium text-slate-600 uppercase`}><option value="">--</option>{pilots.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}</select><ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" /></div>
                                            <div className="border-r border-slate-100 p-0 relative bg-slate-50/50"><div className="w-full h-full flex items-center justify-center text-[10px] text-slate-300 select-none cursor-not-allowed">--</div></div>
                                            <div className={cellWrapperClass}>
                                                <input type="text" value={flight.etd} placeholder="HH:MM" maxLength={5} onChange={(e) => handleCellChange(flight.id, 'etd', e.target.value)} onBlur={(e) => { let val = e.target.value.trim(); if (val.length === 4 && !val.includes(':') && /^\d+$/.test(val)) { val = `${val.slice(0, 2)}:${val.slice(2)}`; handleCellChange(flight.id, 'etd', val); } else if (val.includes(':') && val.split(':')[0].length === 1) { val = val.padStart(5, '0'); handleCellChange(flight.id, 'etd', val); } }} className={`${inputClass} text-center font-bold text-slate-950`} />
                                            </div>
                                            <div className={cellWrapperClass}>
                                                <select value={flight.status} onChange={(e) => handleCellChange(flight.id, 'status', e.target.value as any)} className={`${selectClass} ${getStatusColor(flight.status)} text-[11px] font-bold uppercase tracking-tight`}><option value="Scheduled">Scheduled</option><option value="Outbound">Outbound</option><option value="Inbound">Inbound</option><option value="On Ground">On Ground</option><option value="Delayed">Delayed</option><option value="Cancelled">Cancelled</option><option value="Completed">Completed</option></select><ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
                                            </div>
                                            <div className={cellWrapperClass}><input value={flight.commercialTime || ''} onChange={(e) => handleCellChange(flight.id, 'commercialTime', e.target.value)} className={`${inputClass} text-center font-mono text-slate-700`} placeholder="H:MM" /></div>
                                            <div className={`${cellWrapperClass} flex items-center pl-3`}><span className="text-slate-400 font-bold text-sm mr-0.5 select-none">TGY</span><input value={flight.flightNumber.replace(/^TGY/i, '')} onChange={(e) => { const num = e.target.value.replace(/[^0-9]/g, ''); handleCellChange(flight.id, 'flightNumber', num ? `TGY${num}` : ''); }} className={`${inputClass} !px-0 !w-full font-bold text-slate-950 uppercase`} placeholder="----" /></div>
                                            <div className={cellWrapperClass}><input value={flight.notes || ''} onChange={(e) => handleCellChange(flight.id, 'notes', e.target.value)} className={`${inputClass} text-slate-700 truncate`} placeholder="Notes..." /></div>
                                            <div className="flex items-center justify-center gap-1 bg-slate-50 border-r border-transparent px-1">
                                                <button onClick={() => handleAddSegment(flight)} className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-all opacity-0 group-hover/row:opacity-100" title="Add Segment"><Plus size={16} /></button>
                                                <button onClick={() => handleAddReturn(flight)} className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-all opacity-0 group-hover/row:opacity-100" title="Create Return Flight"><ArrowRightLeft size={16} /></button>
                                                <button onClick={() => handleDeleteRow(flight.id)} className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all opacity-0 group-hover/row:opacity-100" title="Delete Row"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                );
            })}
            </div>
            
            <datalist id="airport-options">
                {uniqueAirports.map(code => (
                    <option key={code} value={code} />
                ))}
            </datalist>

        </div>
      </div>

      {/* Sync Modal */}
      {showConfirmSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Save size={20} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Sync to Dashboard?</h3>
                </div>
                
                <p className="text-slate-600 mb-6 leading-relaxed">
                    You are about to push unsaved changes for <strong>{new Date(currentDate).toLocaleDateString()}</strong> to the main dashboard. This will immediately update the live schedule for all users.
                </p>
                
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowConfirmSync(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">Cancel</button>
                    <button onClick={executeSync} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-sm transform active:scale-95">Confirm Sync</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
