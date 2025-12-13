
import React, { useState, useMemo, useEffect } from 'react';
import { Aircraft, Flight, SystemSettings, AircraftType } from '../types';
import { TechLogEntry } from '../types/techlog';
import { Plane, Plus, Edit2, Search, X, Save, AlertTriangle, Wrench, CheckCircle2, Activity, AlertOctagon, History, Timer, Loader2, Gauge, Filter, Clock, FileText, CheckSquare, Settings, Tag } from 'lucide-react';
import { FLEET_INVENTORY } from '../constants';
import { subscribeToTechLogs, updateTechLog, commitTechLog } from '../services/firebase';
import { CalendarWidget } from './CalendarWidget';
import { calculateDuration } from '../utils/calculations';
import { AirworthinessTracker } from './fleet/AirworthinessTracker'; 
import { AircraftTypeManager } from './AircraftTypeManager';

interface FleetManagerProps {
  fleet: (Aircraft & { _docId?: string })[];
  flights: Flight[];
  aircraftTypes: AircraftType[];
  onAdd: (aircraft: Aircraft) => void;
  onUpdate: (docId: string, updates: Partial<Aircraft>) => void;
  features: SystemSettings;
}

export const FleetManager: React.FC<FleetManagerProps> = ({ fleet, flights, aircraftTypes, onAdd, onUpdate, features }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'types'>('overview');
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
  
  // Technical Records State
  const [techLogs, setTechLogs] = useState<TechLogEntry[]>([]);
  const [recordsDate, setRecordsDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedRecordReg, setSelectedRecordReg] = useState<string | null>(null);
  const [isVerifyingLog, setIsVerifyingLog] = useState<string | null>(null); // Store ID of log being verified
  
  // Form State
  const [formData, setFormData] = useState<Partial<Aircraft>>({
    registration: '',
    type: 'C208B',
    status: 'Active',
    currentHours: 0,
    nextCheckHours: 0
  });

  // Subscribe to Tech Logs
  useEffect(() => {
      const unsub = subscribeToTechLogs(setTechLogs);
      return () => unsub();
  }, []);

  const filteredFleet = fleet.filter(f => {
    const matchesSearch = f.registration.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  // --- Tech Log Handlers ---
  
  // Filter logs for the selected date
  const dailyRecords = useMemo(() => {
      return techLogs.filter(l => l.date === recordsDate);
  }, [techLogs, recordsDate]);

  // Get unique aircraft that have logs on this date
  const recordAircraftList = useMemo(() => {
      const regs = new Set(dailyRecords.map(l => l.aircraftRegistration));
      return Array.from(regs).sort();
  }, [dailyRecords]);

  // Get logs for the selected aircraft on selected date
  const activeRecordLogs = useMemo(() => {
      if (!selectedRecordReg) return [];
      return dailyRecords
          .filter(l => l.aircraftRegistration === selectedRecordReg)
          // Sort by Out time or Flight Number if time missing
          .sort((a, b) => (a.times.out || '').localeCompare(b.times.out || '') || a.flightNumber.localeCompare(b.flightNumber));
  }, [dailyRecords, selectedRecordReg]);

  const handleVerifyLog = async (log: TechLogEntry) => {
      if (!log) return;
      setIsVerifyingLog(log.id);
      try {
          const aircraft = fleet.find(f => f.registration === log.aircraftRegistration);
          if (!aircraft) throw new Error("Aircraft not found in fleet database.");
          
          await commitTechLog(log, aircraft);
      } catch (e: any) {
          console.error(e);
          alert(`Verification Failed: ${e.message}`);
      } finally {
          setIsVerifyingLog(null);
      }
  };

  const handleUpdateLog = async (logId: string, updates: Partial<TechLogEntry>) => {
      await updateTechLog(logId, updates);
  };

  const handleRecordTimeBlur = (logId: string, field: string, value: string, currentTimes: any) => {
      let formatted = value.trim();
      formatted = formatted.replace(/[^0-9:]/g, '');
      if (!formatted.includes(':') && formatted.length >= 3 && formatted.length <= 4) {
          if (formatted.length === 3) formatted = '0' + formatted;
          formatted = formatted.slice(0, 2) + ':' + formatted.slice(2);
      }
      if (!formatted.includes(':') && formatted.length > 0 && formatted.length <= 2) {
          formatted = formatted.padStart(2, '0') + ':00';
      }
      
      const newTimes = { ...currentTimes, [field]: formatted };
      
      // Auto-calculate durations if times are present
      if (newTimes.off && newTimes.on) {
          const flightTime = calculateDuration(newTimes.off, newTimes.on);
          newTimes.flightTime = flightTime;
      }
      if (newTimes.out && newTimes.in) {
          const blockTime = calculateDuration(newTimes.out, newTimes.in);
          newTimes.blockTime = blockTime;
      }

      handleUpdateLog(logId, { times: newTimes });
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

  // Log Table Classes
  const logInputClass = "w-full text-center font-mono font-bold text-sm bg-transparent border border-transparent rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all py-2 text-slate-700 placeholder:text-slate-300 hover:bg-slate-50";

  // --- RENDER ---

  // 1. If Viewing Detail (Overview Tab's drilldown)
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
    <div className="w-full p-4 lg:p-6 pb-24 animate-in fade-in duration-300">
      
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex p-1 max-w-2xl">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <Plane size={18} />
            Fleet Overview
        </button>
        <button 
            onClick={() => setActiveTab('records')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'records' ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <History size={18} />
                Technical Records
            </div>
        </button>
        <button 
            onClick={() => setActiveTab('types')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'types' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <Tag size={18} />
                Type Management
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
                                                    <Settings size={14} /> Aircraft Config
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
            </div>
        </div>
      )}

      {/* TECH RECORDS TAB */}
      {activeTab === 'records' && (
          <div className="flex h-[calc(100vh-200px)] bg-slate-50 relative overflow-hidden flex-col md:flex-row rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
              {/* Sidebar Selection */}
              <div className="w-full md:w-72 bg-white border-r border-slate-200 p-0 flex flex-col shadow-sm z-10 shrink-0">
                  <div className="p-5 border-b border-slate-100">
                      <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2 mb-1">
                          <History className="text-amber-600" size={20} />
                          Tech Records
                      </h2>
                      <p className="text-xs text-slate-500 mb-4">Verification & History Log</p>
                      <CalendarWidget selectedDate={recordsDate} onDateSelect={(d) => { setRecordsDate(d); setSelectedRecordReg(null); }} />
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                      <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Flown Aircraft</div>
                      {recordAircraftList.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-slate-100 mx-2">
                              No logs found for this date.
                          </div>
                      ) : (
                          recordAircraftList.map(reg => {
                              const isSelected = selectedRecordReg === reg;
                              const aircraft = fleet.find(a => a.registration === reg);
                              
                              return (
                                  <button
                                      key={reg}
                                      onClick={() => setSelectedRecordReg(reg)}
                                      className={`
                                          w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all group
                                          ${isSelected 
                                              ? 'bg-slate-900 text-white shadow-md' 
                                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                          }
                                      `}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className={`w-1.5 h-1.5 rounded-full bg-amber-500`}></div>
                                          <span className="font-bold text-sm font-mono tracking-tight">{reg}</span>
                                      </div>
                                      <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}>{aircraft?.type || 'UNK'}</span>
                                  </button>
                              );
                          })
                      )}
                  </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                  {selectedRecordReg ? (
                      <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-20">
                              <div className="flex items-center gap-6">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm border border-amber-100">
                                          <Plane size={20} />
                                      </div>
                                      <div>
                                          <span className="block text-2xl font-black text-slate-900 leading-none tracking-tight">
                                              {selectedRecordReg}
                                          </span>
                                          <span className="text-xs font-medium text-slate-500">Record Verification</span>
                                      </div>
                                  </div>
                                  <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                                  <div className="hidden sm:block">
                                      <span className="text-xs font-bold text-slate-400 uppercase">Date</span>
                                      <div className="text-sm font-bold text-slate-700">{new Date(recordsDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                                  </div>
                              </div>
                          </div>

                          {/* Table Container */}
                          <div className="flex-1 overflow-auto p-6 custom-scrollbar space-y-8">
                              
                              {/* Flight Logs Table */}
                              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 min-w-[1200px]">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                                              <th className="py-2 border-r border-slate-200 w-48" colSpan={1}>Identity</th>
                                              <th className="py-2 border-r border-slate-200 w-32" colSpan={2}>Crew</th>
                                              <th className="py-2 border-r border-slate-200 text-blue-600 bg-blue-50/30" colSpan={4}>Block Times (Local)</th>
                                              <th className="py-2 border-r border-slate-200 text-emerald-600 bg-emerald-50/30" colSpan={2}>Duration (H:MM)</th>
                                              <th className="py-2" colSpan={1}>Notes</th>
                                          </tr>
                                          <tr className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">
                                              <th className="py-2 border-r border-slate-100 pl-4 text-left">Flight / Route</th>
                                              <th className="py-2 border-r border-slate-100">PIC</th>
                                              <th className="py-2 border-r border-slate-100">SIC</th>
                                              <th className="py-2 border-r border-slate-100 bg-blue-50/10">Out</th>
                                              <th className="py-2 border-r border-slate-100 bg-blue-50/10">Off</th>
                                              <th className="py-2 border-r border-slate-100 bg-blue-50/10">On</th>
                                              <th className="py-2 border-r border-slate-100 bg-blue-50/10">In</th>
                                              <th className="py-2 border-r border-slate-100 bg-emerald-50/10">Flight</th>
                                              <th className="py-2 border-r border-slate-100 bg-blue-50/20">Block</th>
                                              <th className="py-2 pl-2 text-left">Remarks</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {activeRecordLogs.map(log => {
                                              const isVerified = log.status === 'Verified';
                                              const flight = flights.find(f => f.id === log.flightId);
                                              const route = flight ? flight.route : '---';
                                              
                                              return (
                                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                                      <td className="px-4 py-3 border-r border-slate-100">
                                                          <div className="font-bold text-slate-900 text-sm">{log.flightNumber}</div>
                                                          <div className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">{route}</div>
                                                      </td>
                                                      
                                                      <td className="px-2 border-r border-slate-100 text-center">
                                                          {flight?.pic ? <span className="font-bold text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200">{flight.pic}</span> : '-'}
                                                      </td>
                                                      <td className="px-2 border-r border-slate-100 text-center">
                                                          {flight?.sic ? <span className="font-medium text-xs text-slate-500">{flight.sic}</span> : '-'}
                                                      </td>

                                                      {/* Times Inputs */}
                                                      <td className="p-1 border-r border-slate-100">
                                                          <input 
                                                              className={`w-full text-center text-sm font-mono font-bold py-1.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none ${isVerified ? 'bg-transparent text-slate-500' : 'bg-slate-50 text-slate-800'}`}
                                                              value={log.times.out}
                                                              disabled={isVerified}
                                                              onChange={e => handleUpdateLog(log.id, { times: { ...log.times, out: e.target.value } })}
                                                              onBlur={e => handleRecordTimeBlur(log.id, 'out', e.target.value, log.times)}
                                                          />
                                                      </td>
                                                      <td className="p-1 border-r border-slate-100">
                                                          <input 
                                                              className={`w-full text-center text-sm font-mono font-bold py-1.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none ${isVerified ? 'bg-transparent text-slate-500' : 'bg-slate-50 text-slate-800'}`}
                                                              value={log.times.off}
                                                              disabled={isVerified}
                                                              onChange={e => handleUpdateLog(log.id, { times: { ...log.times, off: e.target.value } })}
                                                              onBlur={e => handleRecordTimeBlur(log.id, 'off', e.target.value, log.times)}
                                                          />
                                                      </td>
                                                      <td className="p-1 border-r border-slate-100">
                                                          <input 
                                                              className={`w-full text-center text-sm font-mono font-bold py-1.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none ${isVerified ? 'bg-transparent text-slate-500' : 'bg-slate-50 text-slate-800'}`}
                                                              value={log.times.on}
                                                              disabled={isVerified}
                                                              onChange={e => handleUpdateLog(log.id, { times: { ...log.times, on: e.target.value } })}
                                                              onBlur={e => handleRecordTimeBlur(log.id, 'on', e.target.value, log.times)}
                                                          />
                                                      </td>
                                                      <td className="p-1 border-r border-slate-100">
                                                          <input 
                                                              className={`w-full text-center text-sm font-mono font-bold py-1.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none ${isVerified ? 'bg-transparent text-slate-500' : 'bg-slate-50 text-slate-800'}`}
                                                              value={log.times.in}
                                                              disabled={isVerified}
                                                              onChange={e => handleUpdateLog(log.id, { times: { ...log.times, in: e.target.value } })}
                                                              onBlur={e => handleRecordTimeBlur(log.id, 'in', e.target.value, log.times)}
                                                          />
                                                      </td>

                                                      <td className="px-2 py-3 border-r border-slate-100 text-center font-mono font-bold text-emerald-600 bg-emerald-50/10">
                                                          {formatDuration(getMinutesDiff(log.times.off, log.times.on))}
                                                      </td>
                                                      <td className="px-2 py-3 border-r border-slate-100 text-center font-mono font-bold text-blue-600 bg-blue-50/10">
                                                          {formatDuration(getMinutesDiff(log.times.out, log.times.in))}
                                                      </td>

                                                      <td className="p-2 align-top">
                                                          <div className="flex justify-between items-start gap-2">
                                                              <textarea 
                                                                  className={`w-full h-8 text-xs bg-transparent border-none resize-none focus:ring-0 ${isVerified ? 'text-slate-400' : 'text-slate-600'}`}
                                                                  placeholder="Remarks..."
                                                                  value={(log.maintenance.defects || []).join('\n')}
                                                                  disabled={isVerified}
                                                                  onChange={e => handleUpdateLog(log.id, { maintenance: { ...log.maintenance, defects: e.target.value.split('\n') } })}
                                                              />
                                                              {!isVerified && (
                                                                  <button 
                                                                      onClick={() => handleVerifyLog(log)}
                                                                      disabled={isVerifyingLog === log.id}
                                                                      className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                                                      title="Verify Log"
                                                                  >
                                                                      {isVerifyingLog === log.id ? <Loader2 size={14} className="animate-spin"/> : <CheckSquare size={14}/>}
                                                                  </button>
                                                              )}
                                                          </div>
                                                      </td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                      <tfoot className="bg-slate-50 border-t border-slate-200 shadow-inner">
                                          <tr>
                                              <td colSpan={7} className="px-6 py-3 text-right">
                                                  <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                      <Clock size={14} /> Total Daily Hours
                                                  </div>
                                              </td>
                                              <td className="px-2 py-3 text-center border-r border-slate-200">
                                                  <div className="bg-emerald-100 text-emerald-800 font-black font-mono text-sm py-1 px-2 rounded border border-emerald-200">
                                                      {formatDuration(activeRecordLogs.reduce((acc, l) => acc + getMinutesDiff(l.times.off, l.times.on), 0))}
                                                  </div>
                                              </td>
                                              <td className="px-2 py-3 text-center border-r border-slate-200">
                                                  <div className="bg-blue-100 text-blue-800 font-black font-mono text-sm py-1 px-2 rounded border border-blue-200">
                                                      {formatDuration(activeRecordLogs.reduce((acc, l) => acc + getMinutesDiff(l.times.out, l.times.in), 0))}
                                                  </div>
                                              </td>
                                              <td></td>
                                          </tr>
                                      </tfoot>
                                  </table>
                              </div>

                              {/* Component Engineering Data Table */}
                              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 min-w-[1000px] mt-8">
                                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                                      <Wrench size={16} className="text-slate-400"/>
                                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Engineering Data - Component Hours</h4>
                                  </div>
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                                              <th className="py-2 px-4 w-1/3 border-r border-slate-200">Component</th>
                                              <th className="py-2 px-4 w-1/6 text-right border-r border-slate-200">Serial No.</th>
                                              <th className="py-2 px-4 w-1/6 text-right border-r border-slate-200">Brought Forward</th>
                                              <th className="py-2 px-4 w-1/6 text-right border-r border-slate-200 text-emerald-600">Today</th>
                                              <th className="py-2 px-4 w-1/6 text-right">Carried Forward</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-sm">
                                          {(() => {
                                              const aircraft = fleet.find(a => a.registration === selectedRecordReg);
                                              if (!aircraft) return <tr><td colSpan={5} className="p-4 text-center text-slate-400">Aircraft data unavailable</td></tr>;

                                              const dailyTotalMinutes = activeRecordLogs.reduce((acc, l) => acc + getMinutesDiff(l.times.off, l.times.on), 0);
                                              const dailyTotalHours = parseFloat((dailyTotalMinutes / 60).toFixed(2));

                                              // Airframe Row
                                              const afCurrent = aircraft.airframeTotalTime || aircraft.currentHours || 0;
                                              
                                              // Components Rows
                                              const components = aircraft.components || [];

                                              return (
                                                  <>
                                                      <tr className="bg-slate-50/50 font-bold text-slate-800">
                                                          <td className="py-2 px-4 border-r border-slate-200">Airframe Total Time</td>
                                                          <td className="py-2 px-4 text-right border-r border-slate-200 font-mono text-slate-500">N/A</td>
                                                          <td className="py-2 px-4 text-right border-r border-slate-200 font-mono">{afCurrent.toFixed(2)}</td>
                                                          <td className="py-2 px-4 text-right border-r border-slate-200 font-mono text-emerald-600">+{dailyTotalHours.toFixed(2)}</td>
                                                          <td className="py-2 px-4 text-right font-mono bg-slate-50">{(afCurrent + dailyTotalHours).toFixed(2)}</td>
                                                      </tr>
                                                      {components.map(comp => (
                                                          <tr key={comp.id} className="hover:bg-slate-50">
                                                              <td className="py-2 px-4 border-r border-slate-200">
                                                                  <div className="font-medium text-slate-700">{comp.name}</div>
                                                                  <div className="text-[10px] text-slate-400 uppercase">{comp.type}</div>
                                                              </td>
                                                              <td className="py-2 px-4 text-right border-r border-slate-200 font-mono text-xs text-slate-500">{comp.serialNumber}</td>
                                                              <td className="py-2 px-4 text-right border-r border-slate-200 font-mono text-slate-600">{(comp.currentHours || 0).toFixed(2)}</td>
                                                              <td className="py-2 px-4 text-right border-r border-slate-200 font-mono text-emerald-600 font-bold">+{dailyTotalHours.toFixed(2)}</td>
                                                              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800 bg-slate-50/30">{((comp.currentHours || 0) + dailyTotalHours).toFixed(2)}</td>
                                                          </tr>
                                                      ))}
                                                  </>
                                              );
                                          })()}
                                      </tbody>
                                  </table>
                              </div>

                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <History size={48} className="opacity-20 mb-4"/>
                          <h3 className="text-xl font-bold text-slate-600">Select Aircraft</h3>
                          <p className="text-sm max-w-xs text-center mt-2">
                              Choose an aircraft from the list to view and verify technical logs for {new Date(recordsDate).toLocaleDateString()}.
                          </p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* TYPE MANAGEMENT TAB */}
      {activeTab === 'types' && (
        <div className="animate-in slide-in-from-bottom-2 duration-300">
            <AircraftTypeManager />
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
