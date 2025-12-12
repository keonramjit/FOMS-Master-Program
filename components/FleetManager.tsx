
import React, { useState, useMemo, useEffect } from 'react';
import { Aircraft, Flight, SystemSettings, AircraftType } from '../types';
import { Plane, Plus, Edit2, Search, X, Save, AlertTriangle, Wrench, CheckCircle2, Activity, AlertOctagon, History, Timer, Lock, Loader2, Gauge, Filter, BookOpen, RotateCcw, ArrowRight, User, Clock, ClipboardList, FileText } from 'lucide-react';
import { FLEET_INVENTORY } from '../constants';
import { FeatureGate } from './FeatureGate';
import { fetchAircraftHistory, updateFlight } from '../services/firebase';
import { CalendarWidget } from './CalendarWidget';
import { calculateDuration } from '../utils/calculations';
import { AirworthinessTracker } from './fleet/AirworthinessTracker'; // Imported New Component

interface FleetManagerProps {
  fleet: (Aircraft & { _docId?: string })[];
  flights: Flight[];
  aircraftTypes: AircraftType[];
  onAdd: (aircraft: Aircraft) => void;
  onUpdate: (docId: string, updates: Partial<Aircraft>) => void;
  features: SystemSettings;
}

// Local state interface for editing log
interface FlightEditState {
    outTime: string;
    offTime: string;
    onTime: string;
    inTime: string;
    notes: string;
}

export const FleetManager: React.FC<FleetManagerProps> = ({ fleet, flights, aircraftTypes, onAdd, onUpdate, features }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'daily-logs'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Navigation State - Store ID only to ensure reactivity
  const [viewingAircraftId, setViewingAircraftId] = useState<string | null>(null);

  // Derive the active aircraft object from the live fleet prop
  const viewingAircraft = useMemo(() => 
    fleet.find(a => a._docId === viewingAircraftId) || null,
  [fleet, viewingAircraftId]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<(Aircraft & { _docId?: string }) | null>(null);
  
  // Legacy History State (kept for direct access if needed, but mainly replaced by Tracker)
  const [historyData, setHistoryData] = useState<Flight[]>([]);
  
  // Daily Logs Tab State
  const [airworthinessDate, setAirworthinessDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAirworthinessReg, setSelectedAirworthinessReg] = useState<string>('');
  const [logEdits, setLogEdits] = useState<Record<string, FlightEditState>>({});
  const [isLogSaving, setIsLogSaving] = useState(false);
  const [logSaveSuccess, setLogSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Aircraft>>({
    registration: '',
    type: 'C208B',
    status: 'Active',
    currentHours: 0,
    nextCheckHours: 0
  });

  const filteredFleet = fleet.filter(f => {
    const matchesSearch = f.registration.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  // --- Daily Logs Logic ---
  
  // Filter fleet to only show aircraft active on the selected date
  const activeLogFleet = useMemo(() => {
      const activeRegs = new Set(
          flights
              .filter(f => f.date === airworthinessDate)
              .map(f => f.aircraftRegistration)
      );
      
      // If no flights, show full fleet to allow checking logs
      if (activeRegs.size === 0) return fleet.sort((a, b) => a.registration.localeCompare(b.registration));

      return fleet
        .filter(ac => activeRegs.has(ac.registration))
        .sort((a, b) => a.registration.localeCompare(b.registration));
  }, [fleet, flights, airworthinessDate]);

  // Filter flights for the selected aircraft and date
  const aircraftLogFlights = useMemo(() => {
      return flights
        .filter(f => f.date === airworthinessDate && f.aircraftRegistration === selectedAirworthinessReg)
        .sort((a, b) => (a.etd || '').localeCompare(b.etd || ''));
  }, [flights, airworthinessDate, selectedAirworthinessReg]);

  // Initialize log edits
  useEffect(() => {
      const newEdits: Record<string, FlightEditState> = {};
      aircraftLogFlights.forEach(f => {
          newEdits[f.id] = {
              outTime: f.outTime || '',
              offTime: f.offTime || '',
              onTime: f.onTime || '',
              inTime: f.inTime || '',
              notes: f.notes || ''
          };
      });
      setLogEdits(prev => ({ ...prev, ...newEdits }));
  }, [aircraftLogFlights]);

  const handleLogEdit = (flightId: string, field: keyof FlightEditState, value: string) => {
      setLogEdits(prev => ({
          ...prev,
          [flightId]: {
              ...prev[flightId],
              [field]: value
          }
      }));
      setLogSaveSuccess(false);
  };

  const handleLogTimeBlur = (flightId: string, field: keyof FlightEditState, value: string) => {
      let formatted = value.trim();
      formatted = formatted.replace(/[^0-9:]/g, '');
      if (!formatted.includes(':') && formatted.length >= 3 && formatted.length <= 4) {
          if (formatted.length === 3) formatted = '0' + formatted;
          formatted = formatted.slice(0, 2) + ':' + formatted.slice(2);
      }
      if (!formatted.includes(':') && formatted.length > 0 && formatted.length <= 2) {
          formatted = formatted.padStart(2, '0') + ':00';
      }
      handleLogEdit(flightId, field, formatted);
  };

  const handleLogSave = async () => {
      setIsLogSaving(true);
      try {
          const promises = aircraftLogFlights.map(f => {
              const edit = logEdits[f.id];
              if (!edit) return Promise.resolve();
              const actualFlightTime = calculateDuration(edit.offTime, edit.onTime);
              const actualBlockTime = calculateDuration(edit.outTime, edit.inTime);
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
          setLogSaveSuccess(true);
          setTimeout(() => setLogSaveSuccess(false), 3000);
      } catch (error) {
          console.error("Failed to save log", error);
          alert("Failed to save changes.");
      } finally {
          setIsLogSaving(false);
      }
  };

  const getMinutesDiff = (start: string, end: string): number => {
      if (!start || !end) return 0;
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 24 * 60;
      return diff;
  };

  const formatDuration = (minutes: number): string => {
      if (minutes <= 0) return '';
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Dynamic Theme Generator
  const getTypeTheme = (index: number) => {
      const themes = [
          { badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900', lightBorder: 'border-emerald-100', accent: 'emerald' },
          { badge: 'bg-sky-100 text-sky-700', border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-900', lightBorder: 'border-sky-100', accent: 'sky' },
          { badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-900', lightBorder: 'border-indigo-100', accent: 'indigo' },
          { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-900', lightBorder: 'border-amber-100', accent: 'amber' },
          { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-900', lightBorder: 'border-purple-100', accent: 'purple' },
      ];
      return themes[index % themes.length];
  };

  const handleOpenModal = (aircraft?: (Aircraft & { _docId?: string })) => {
    if (aircraft) {
      setEditingAircraft(aircraft);
      setFormData({
        registration: aircraft.registration,
        type: aircraft.type,
        status: aircraft.status,
        currentHours: aircraft.currentHours || 0,
        nextCheckHours: aircraft.nextCheckHours || 0
      });
    } else {
      setEditingAircraft(null);
      setFormData({ 
        registration: '8R-', 
        type: aircraftTypes.length > 0 ? aircraftTypes[0].code : 'C208B', 
        status: 'Active',
        currentHours: 0,
        nextCheckHours: 100
      });
    }
    setIsModalOpen(true);
  };

  const handleSelectAircraft = (aircraft: (Aircraft & { _docId?: string })) => {
      if (aircraft._docId) {
          setViewingAircraftId(aircraft._docId);
      }
  };

  const handleSave = () => {
    if (!formData.registration || !formData.type) return;

    if (editingAircraft && editingAircraft._docId) {
      onUpdate(editingAircraft._docId, formData);
    } else {
      onAdd(formData as Aircraft);
    }
    setIsModalOpen(false);
  };

  const handleSeedDefaults = () => {
    if (window.confirm("This will add all default aircraft to the fleet database. Continue?")) {
        FLEET_INVENTORY.forEach(ac => {
            if (!fleet.some(f => f.registration === ac.registration)) {
                onAdd(ac);
            }
        });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Active': 
            return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"><CheckCircle2 size={12} strokeWidth={3} /> Active</span>;
        case 'Maintenance': 
            return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"><Wrench size={12} strokeWidth={3} /> Maint</span>;
        case 'AOG': 
            return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"><AlertOctagon size={12} strokeWidth={3} /> AOG</span>;
        default: 
            return <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">{status}</span>;
    }
  };

  // Stats for Overview
  const totalAircraft = fleet.length;
  const activeAircraft = fleet.filter(f => f.status === 'Active').length;
  const aogAircraft = fleet.filter(f => f.status === 'AOG').length;
  const serviceability = totalAircraft > 0 ? Math.round((activeAircraft / totalAircraft) * 100) : 0;
  
  const upcomingMaintenance = fleet.filter(f => {
     const remaining = (f.nextCheckHours || 0) - (f.currentHours || 0);
     return remaining < 50 && remaining > 0;
  }).length;

  const recordedHours = historyData.reduce((acc, f) => acc + (f.flightTime || 0), 0);

  // Log Table Classes
  const inputCellClass = "p-1 border-r border-slate-100 last:border-r-0";
  const logInputClass = "w-full text-center font-mono font-bold text-sm bg-transparent border border-transparent rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all py-2 text-slate-700 placeholder:text-slate-300 hover:bg-slate-50";
  const calcCellClass = "px-2 py-3 text-center font-mono font-bold text-sm border-r border-white/50";
  const superHeaderClass = "px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center border-l border-slate-200 first:border-l-0 bg-slate-50/80";
  const subHeaderClass = "px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center border-t border-slate-200";

  // --- RENDER ---

  // 1. If Viewing Detail
  if (viewingAircraft) {
      return (
          <div className="h-full">
              <AirworthinessTracker 
                  aircraft={viewingAircraft} 
                  onUpdate={onUpdate}
                  onBack={() => setViewingAircraftId(null)}
              />
          </div>
      );
  }

  // 2. Default Dashboard
  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-24 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500 mt-1">Manage aircraft inventory, status, and maintenance.</p>
        </div>
        <div className="flex gap-3">
            {fleet.length === 0 && (
                <button 
                    onClick={handleSeedDefaults}
                    className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 shadow-sm transition-all text-sm"
                >
                    Load Default Fleet
                </button>
            )}
            <button 
                onClick={() => handleOpenModal()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all"
            >
                <Plus size={18} />
                Add Aircraft
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <Plane size={18} />
            Fleet Overview
        </button>
        <button 
            onClick={() => setActiveTab('daily-logs')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'daily-logs' ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <ClipboardList size={18} />
                Voyage Logs
            </div>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
            {/* Overview Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <OverviewCard 
                    title="Total Fleet" 
                    value={totalAircraft} 
                    icon={<Plane size={20} className="text-blue-600"/>}
                    subtext="Aircraft"
                />
                <OverviewCard 
                    title="Serviceability" 
                    value={`${serviceability}%`} 
                    icon={<Activity size={20} className="text-emerald-600"/>}
                    subtext={`${activeAircraft} Active`}
                />
                <OverviewCard 
                    title="Maintenance Alert" 
                    value={upcomingMaintenance} 
                    icon={<Wrench size={20} className="text-amber-600"/>}
                    subtext="Checks < 50 hrs"
                    color="text-amber-600"
                />
                <OverviewCard 
                    title="AOG Status" 
                    value={aogAircraft} 
                    icon={<AlertTriangle size={20} className="text-rose-600"/>}
                    subtext="Grounded"
                    color={aogAircraft > 0 ? "text-rose-600" : "text-slate-900"}
                />
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1 max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search fleet by registration..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-shadow"
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer"
                    >
                        <option value="All">All Types</option>
                        {aircraftTypes.map(type => (
                            <option key={type.id} value={type.code}>{type.code}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-8">
                {aircraftTypes.map((typeObj, index) => {
                    const type = typeObj.code;
                    // Filter based on dynamic types
                    const aircrafts = filteredFleet.filter(f => f.type === type);
                    
                    if (aircrafts.length === 0) return null;
                    const theme = getTypeTheme(index);
                    
                    return (
                        <div key={type} className="animate-in slide-in-from-bottom-2 duration-500">
                            {/* Section Header */}
                            <div className="flex items-center gap-4 mb-5">
                                <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${theme.badge} ${theme.border}`}>
                                    {typeObj.name}
                                </span>
                                <div className={`h-px flex-1 ${theme.bg} ${theme.border} border-t`}></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {aircrafts.length} Units
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {aircrafts.map(ac => {
                                    // Logic for visual bar (Fall back to legacy or use Airframe total)
                                    const nextCheck = ac.nextCheckHours || 0;
                                    const current = ac.airframeTotalTime || ac.currentHours || 0;
                                    
                                    // Use first upcoming maintenance rule if available, else legacy
                                    const upcomingRule = (ac.maintenanceProgram || []).sort((a,b) => {
                                        const lastA = (ac.maintenanceStatus || {})[a.id]?.lastPerformedHours || 0;
                                        const lastB = (ac.maintenanceStatus || {})[b.id]?.lastPerformedHours || 0;
                                        const dueA = lastA + a.intervalHours;
                                        const dueB = lastB + b.intervalHours;
                                        return dueA - dueB;
                                    })[0];

                                    const targetHours = upcomingRule ? ((ac.maintenanceStatus || {})[upcomingRule.id]?.lastPerformedHours || 0) + upcomingRule.intervalHours : nextCheck;
                                    const remaining = targetHours - current;
                                    
                                    const isNearCheck = remaining < 50;
                                    
                                    // Simple visual progress (last 100 hrs)
                                    const progress = Math.max(0, Math.min(100, (1 - (remaining / 100)) * 100));

                                    return (
                                        <div 
                                            key={ac.registration} 
                                            className={`
                                                bg-white rounded-xl shadow-sm border p-5 
                                                transition-all duration-200 group relative
                                                hover:shadow-lg hover:-translate-y-1
                                                cursor-pointer overflow-hidden
                                                ${theme.lightBorder} hover:border-${theme.accent}-300
                                            `}
                                            onClick={() => handleSelectAircraft(ac)}
                                        >
                                            {/* Decorative Background Icon */}
                                            <Plane 
                                                className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-5 text-${theme.accent}-500 transform -rotate-12 pointer-events-none`} 
                                            />

                                            {/* Top Row: Reg & Status */}
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm text-white font-bold text-xs ${isNearCheck ? 'bg-amber-500' : theme.badge.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-600')}`}>
                                                        {ac.registration.split('-')[1]}
                                                    </div>
                                                    <div>
                                                        <div className="text-xl font-black text-slate-800 tracking-tight leading-none">
                                                            {ac.registration}
                                                        </div>
                                                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${theme.text}`}>
                                                            {ac.type}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="mb-4 relative z-10">
                                                {getStatusBadge(ac.status)}
                                            </div>

                                            {/* Maintenance Info */}
                                            <div className={`mt-4 pt-4 border-t ${theme.lightBorder} relative z-10`}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Gauge size={10}/> Hours</span>
                                                        <span className="text-sm font-bold text-slate-700 font-mono">{current.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Timer size={10}/> Next Due</span>
                                                        <span className={`text-sm font-bold font-mono ${isNearCheck ? 'text-amber-600' : 'text-slate-700'}`}>
                                                            {targetHours.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${isNearCheck ? 'bg-amber-500' : `bg-${theme.accent}-500`}`} 
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                {isNearCheck && (
                                                    <div className="text-[10px] text-amber-600 font-bold mt-1.5 text-right flex items-center justify-end gap-1 animate-pulse">
                                                        <AlertTriangle size={10} />
                                                        Check due in {remaining} hrs
                                                    </div>
                                                )}
                                                
                                                {/* Explicit Action Button */}
                                                <button 
                                                    className="w-full mt-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-bold text-xs rounded-lg border border-slate-200 hover:border-blue-200 transition-colors flex items-center justify-center gap-2"
                                                    onClick={(e) => { e.stopPropagation(); handleSelectAircraft(ac); }}
                                                >
                                                    <FileText size={14} /> View Technical Records
                                                </button>
                                            </div>

                                            {/* Action Buttons - Hover Reveal */}
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(ac); }} 
                                                    className="p-2 bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200 rounded-lg shadow-sm transition-all"
                                                    title="Edit Details"
                                                >
                                                    <Edit2 size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                
                {filteredFleet.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                        <Plane size={48} className="mb-4 opacity-20" />
                        <p>No aircraft found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* DAILY LOGS TAB (Tech Log) */}
      {activeTab === 'daily-logs' && (
        <div className="flex h-[calc(100vh-200px)] bg-slate-50 relative overflow-hidden flex-col md:flex-row rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
            {/* Sidebar Selection */}
            <div className="w-full md:w-72 bg-white border-r border-slate-200 p-0 flex flex-col shadow-sm z-10 shrink-0">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-1">
                        <BookOpen className="text-blue-600" size={20} />
                        Tech Log
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">Daily Flight Records & Engineering Data</p>
                    <CalendarWidget selectedDate={airworthinessDate} onDateSelect={(d) => { setAirworthinessDate(d); setSelectedAirworthinessReg(''); }} />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Aircraft</div>
                    {activeLogFleet.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-100 mx-2">
                            No aircraft found.
                        </div>
                    ) : (
                        activeLogFleet.map(ac => {
                            const isSelected = selectedAirworthinessReg === ac.registration;
                            
                            return (
                                <button
                                    key={ac.registration}
                                    onClick={() => setSelectedAirworthinessReg(ac.registration)}
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                {selectedAirworthinessReg ? (
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
                                            {selectedAirworthinessReg}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500">Log Sheet Entry</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                                <div className="hidden sm:block">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Date</span>
                                    <div className="text-sm font-bold text-slate-700">{new Date(airworthinessDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 items-center">
                                {logSaveSuccess && (
                                    <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100 animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle2 size={14} /> Saved
                                    </span>
                                )}
                                <button 
                                    onClick={handleLogSave}
                                    disabled={isLogSaving}
                                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 disabled:opacity-70"
                                >
                                    {isLogSaving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Log
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar space-y-8">
                            
                            {/* Flight Log Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 min-w-[1000px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className={superHeaderClass} colSpan={1}>Identity</th>
                                            <th className={superHeaderClass} colSpan={2}>Crew</th>
                                            <th className={`${superHeaderClass} bg-blue-50/30 text-blue-600`} colSpan={4}>Block Times (Local)</th>
                                            <th className={`${superHeaderClass} bg-emerald-50/30 text-emerald-600`} colSpan={2}>Duration (H:MM)</th>
                                            <th className={superHeaderClass} colSpan={1}>Notes</th>
                                        </tr>
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
                                        {aircraftLogFlights.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-12 text-center text-slate-400">
                                                    <div className="flex flex-col items-center">
                                                        <Plane className="opacity-20 mb-2" size={32} />
                                                        <p className="font-medium text-slate-600 text-sm">No flights scheduled for log.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            aircraftLogFlights.map((flight) => {
                                                const edit = logEdits[flight.id] || { outTime: '', offTime: '', onTime: '', inTime: '', notes: '' };
                                                const flightMinutes = getMinutesDiff(edit.offTime, edit.onTime);
                                                const blockMinutes = getMinutesDiff(edit.outTime, edit.inTime);
                                                const routeParts = flight.route.split('-');

                                                return (
                                                    <tr key={flight.id} className="hover:bg-slate-50 transition-colors group">
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
                                                        <td className={inputCellClass}>
                                                            <input type="text" className={logInputClass} value={edit.outTime} onChange={e => handleLogEdit(flight.id, 'outTime', e.target.value)} onBlur={e => handleLogTimeBlur(flight.id, 'outTime', e.target.value)} placeholder="-" maxLength={5} />
                                                        </td>
                                                        <td className={inputCellClass}>
                                                            <input type="text" className={logInputClass} value={edit.offTime} onChange={e => handleLogEdit(flight.id, 'offTime', e.target.value)} onBlur={e => handleLogTimeBlur(flight.id, 'offTime', e.target.value)} placeholder="-" maxLength={5} />
                                                        </td>
                                                        <td className={inputCellClass}>
                                                            <input type="text" className={logInputClass} value={edit.onTime} onChange={e => handleLogEdit(flight.id, 'onTime', e.target.value)} onBlur={e => handleLogTimeBlur(flight.id, 'onTime', e.target.value)} placeholder="-" maxLength={5} />
                                                        </td>
                                                        <td className={`${inputCellClass} border-r border-slate-200`}>
                                                            <input type="text" className={logInputClass} value={edit.inTime} onChange={e => handleLogEdit(flight.id, 'inTime', e.target.value)} onBlur={e => handleLogTimeBlur(flight.id, 'inTime', e.target.value)} placeholder="-" maxLength={5} />
                                                        </td>
                                                        <td className={`${calcCellClass} bg-emerald-50/40 text-emerald-700`}>
                                                            {flightMinutes > 0 ? formatDuration(flightMinutes) : <span className="text-emerald-200">-</span>}
                                                        </td>
                                                        <td className={`${calcCellClass} bg-blue-50/40 text-blue-700 border-r border-slate-200`}>
                                                            {blockMinutes > 0 ? formatDuration(blockMinutes) : <span className="text-blue-200">-</span>}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input type="text" className="w-full text-xs font-medium border-0 border-b border-slate-200 bg-transparent focus:bg-white focus:border-blue-500 focus:ring-0 text-slate-600 placeholder:text-slate-300 px-1 py-1.5 transition-colors" placeholder="Remarks..." value={edit.notes} onChange={e => handleLogEdit(flight.id, 'notes', e.target.value)} />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                    {aircraftLogFlights.length > 0 && (
                                        <tfoot className="bg-slate-50 border-t border-slate-200 shadow-inner">
                                            <tr>
                                                <td colSpan={7} className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock size={14} /> Total Daily Hours
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center">
                                                    <div className="bg-emerald-100 text-emerald-800 font-black font-mono text-sm py-1 px-3 rounded-lg border border-emerald-200 shadow-sm inline-block min-w-[80px]">
                                                        {formatDuration(aircraftLogFlights.reduce((acc, f) => {
                                                            const edit = logEdits[f.id];
                                                            return acc + (edit ? getMinutesDiff(edit.offTime, edit.onTime) : 0);
                                                        }, 0))}
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center border-r border-slate-200">
                                                    <div className="bg-blue-100 text-blue-800 font-black font-mono text-sm py-1 px-3 rounded-lg border border-blue-200 shadow-sm inline-block min-w-[80px]">
                                                        {formatDuration(aircraftLogFlights.reduce((acc, f) => {
                                                            const edit = logEdits[f.id];
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

                            {/* Engineering Data Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 min-w-[1000px]">
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-center">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Engineering Data</h4>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase text-center border-b border-slate-200">
                                            <th className="py-2 px-4 border-r border-slate-200 w-32">Time</th>
                                            <th colSpan={2} className="py-2 px-4 border-r border-slate-200">ENG.TIME SINCE NEW/OVERHAUL</th>
                                            <th colSpan={2} className="py-2 px-4 border-r border-slate-200">PROP.TIME SINCE NEW/OVERHAUL</th>
                                            <th className="py-2 px-4">AC LANDINGS</th>
                                        </tr>
                                        <tr className="bg-white text-[10px] font-bold text-slate-500 uppercase text-center border-b border-slate-200">
                                            <th className="py-1 border-r border-slate-200 bg-slate-50"></th>
                                            <th className="py-1 px-2 border-r border-slate-200 w-1/5">Port s/n</th>
                                            <th className="py-1 px-2 border-r border-slate-200 w-1/5">Stdb s/n</th>
                                            <th className="py-1 px-2 border-r border-slate-200 w-1/5">Port s/n</th>
                                            <th className="py-1 px-2 border-r border-slate-200 w-1/5">Stdb s/n</th>
                                            <th className="py-1 px-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100">
                                        {['Brought Foward', 'This Page', 'Carried Foward'].map((rowLabel) => (
                                            <tr key={rowLabel} className="hover:bg-slate-50">
                                                <td className="py-2 px-4 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">{rowLabel}</td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1"><input className={logInputClass} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                <div className="h-4 bg-slate-50 border-y border-slate-200"></div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-xs font-bold text-slate-600 uppercase text-center border-b border-slate-200">
                                            <th className="py-2 px-4 border-r border-slate-200 w-32 bg-slate-50"></th>
                                            <th className="py-2 px-4 border-r border-slate-200 w-1/5">Airframe Hours</th>
                                            <th className="py-2 px-4 border-r border-slate-200 w-1/5">Time To Next Inspection</th>
                                            <th className="py-2 px-4 border-r border-slate-200 w-1/5">Type Of Next Inspection</th>
                                            <th className="py-2 px-4 border-r border-slate-200 w-1/5">Next Major Inspection</th>
                                            <th className="py-2 px-4">Hobbs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100">
                                        {['Brought Foward', 'This Page', 'Carried Foward'].map((rowLabel) => (
                                            <tr key={rowLabel} className="hover:bg-slate-50">
                                                <td className="py-2 px-4 font-bold text-slate-700 border-r border-slate-200 bg-slate-50/50 whitespace-nowrap">{rowLabel}</td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1 border-r border-slate-200"><input className={logInputClass} /></td>
                                                <td className="p-1"><input className={logInputClass} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
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
                            Select an aircraft from the sidebar to access the technical log and engineering data.
                        </p>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-slate-900">
                        {editingAircraft ? 'Edit Aircraft' : 'Add Aircraft'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Registration</label>
                        <input 
                            value={formData.registration}
                            onChange={e => setFormData(prev => ({ ...prev, registration: e.target.value.toUpperCase() }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-bold uppercase"
                            placeholder="e.g. 8R-GAB"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                {aircraftTypes.map(type => (
                                    <option key={type.id} value={type.code}>{type.code}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                            <select 
                                value={formData.status}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="Active">Active</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="AOG">AOG</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Hours</label>
                            <input 
                                type="number"
                                value={formData.currentHours}
                                onChange={e => setFormData(prev => ({ ...prev, currentHours: Number(e.target.value) }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Next Check Due</label>
                            <input 
                                type="number"
                                value={formData.nextCheckHours}
                                onChange={e => setFormData(prev => ({ ...prev, nextCheckHours: Number(e.target.value) }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Aircraft
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

const OverviewCard: React.FC<{ 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    subtext: string; 
    color?: string;
}> = ({ title, value, icon, subtext, color = "text-slate-900" }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
        <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{subtext}</div>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
            {icon}
        </div>
    </div>
);
