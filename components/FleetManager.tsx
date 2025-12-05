import React, { useState } from 'react';
import { Aircraft, Flight, SystemSettings } from '../types';
import { Plane, Plus, Edit2, Search, X, Save, AlertTriangle, Wrench, CheckCircle2, Activity, BarChart3, AlertOctagon, History, Clock, Filter, ClipboardList, Timer, Lock, Loader2, Gauge } from 'lucide-react';
import { FLEET_INVENTORY } from '../constants';
import { FeatureGate } from './FeatureGate';
import { fetchAircraftHistory } from '../services/firebase';

interface FleetManagerProps {
  fleet: (Aircraft & { _docId?: string })[];
  flights: Flight[];
  onAdd: (aircraft: Aircraft) => void;
  onUpdate: (docId: string, updates: Partial<Aircraft>) => void;
  features: SystemSettings;
}

export const FleetManager: React.FC<FleetManagerProps> = ({ fleet, flights, onAdd, onUpdate, features }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'checks'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<(Aircraft & { _docId?: string }) | null>(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyAircraft, setHistoryAircraft] = useState<(Aircraft & { _docId?: string }) | null>(null);
  const [historyData, setHistoryData] = useState<Flight[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Aircraft>>({
    registration: '',
    type: 'C208B',
    status: 'Active',
    currentHours: 0,
    nextCheckHours: 0
  });

  // Get unique types for filter
  const aircraftTypes = Array.from(new Set(fleet.map(f => f.type))).sort();

  const filteredFleet = fleet.filter(f => {
    const matchesSearch = f.registration.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || f.type === filterType;
    return matchesSearch && matchesType;
  });

  // Define explicit display order
  const displayGroups = ['C208B', 'C208EX', '1900D'];

  // Helper to get theme based on aircraft type
  const getTypeTheme = (type: string) => {
    switch(type) {
      case '1900D': return { 
          accent: 'indigo', 
          bg: 'bg-indigo-50', 
          border: 'border-indigo-200',
          text: 'text-indigo-900',
          badge: 'bg-indigo-100 text-indigo-700',
          lightBorder: 'border-indigo-100'
      };
      case 'C208EX': return { 
          accent: 'sky', 
          bg: 'bg-sky-50', 
          border: 'border-sky-200',
          text: 'text-sky-900', 
          badge: 'bg-sky-100 text-sky-700',
          lightBorder: 'border-sky-100'
      };
      default: return { // C208B
          accent: 'emerald', 
          bg: 'bg-emerald-50', 
          border: 'border-emerald-200',
          text: 'text-emerald-900',
          badge: 'bg-emerald-100 text-emerald-700',
          lightBorder: 'border-emerald-100'
      };
    }
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
        type: 'C208B', 
        status: 'Active',
        currentHours: 0,
        nextCheckHours: 100
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenHistory = async (aircraft: (Aircraft & { _docId?: string })) => {
    setHistoryAircraft(aircraft);
    setIsHistoryOpen(true);
    setHistoryData([]); // Clear previous
    setIsLoadingHistory(true);
    
    try {
        const history = await fetchAircraftHistory(aircraft.registration);
        setHistoryData(history);
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setIsLoadingHistory(false);
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

  // Logic for Fleet Checks
  const getNextCheckDetails = (aircraft: Aircraft) => {
    // Determine Type of Check
    // Cycle: 100(A), 200(B), 300(A), 400(C), 500(A), 600(D)
    // We base this on the next scheduled check hour
    
    const nextDue = aircraft.nextCheckHours || 0;
    const cyclePos = nextDue % 600;
    
    let checkType = 'A';
    let checkColor = 'bg-slate-100 text-slate-700 border-slate-200';

    if (cyclePos === 0) {
        checkType = 'D';
        checkColor = 'bg-purple-100 text-purple-700 border-purple-200';
    } else if (cyclePos === 200) {
        checkType = 'B';
        checkColor = 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (cyclePos === 400) {
        checkType = 'C';
        checkColor = 'bg-orange-100 text-orange-700 border-orange-200';
    } else {
        // 100, 300, 500
        checkType = 'A';
        checkColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }

    const remaining = nextDue - (aircraft.currentHours || 0);
    const progress = Math.max(0, Math.min(100, (1 - (remaining / 100)) * 100)); // Assuming 100h interval for visual bar

    return { checkType, checkColor, remaining, progress };
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

  // Use history data for calculations
  const recordedHours = historyData.reduce((acc, f) => acc + (f.flightTime || 0), 0);

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
            onClick={() => setActiveTab('checks')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'checks' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
            <div className="flex items-center gap-2">
                <ClipboardList size={18} />
                Fleet Checks
                {!features.enableFleetChecks && <Lock size={12} className="opacity-50" />}
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
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-8">
                {displayGroups.map((type) => {
                    // Filter based on our explicit order list
                    const aircrafts = filteredFleet.filter(f => f.type === type);
                    
                    if (aircrafts.length === 0) return null;
                    const theme = getTypeTheme(type);
                    
                    return (
                        <div key={type} className="animate-in slide-in-from-bottom-2 duration-500">
                            {/* Section Header */}
                            <div className="flex items-center gap-4 mb-5">
                                <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${theme.badge} ${theme.border}`}>
                                    {type} Series
                                </span>
                                <div className={`h-px flex-1 ${theme.bg} ${theme.border} border-t`}></div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {aircrafts.length} Units
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {aircrafts.map(ac => {
                                    const remaining = (ac.nextCheckHours || 0) - (ac.currentHours || 0);
                                    const progress = Math.min(100, ((ac.currentHours || 0) / (ac.nextCheckHours || 1)) * 100);
                                    const isNearCheck = remaining < 50;

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
                                            onClick={() => handleOpenHistory(ac)}
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
                                                        <span className="text-sm font-bold text-slate-700 font-mono">{ac.currentHours?.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Timer size={10}/> Next Check</span>
                                                        <span className={`text-sm font-bold font-mono ${isNearCheck ? 'text-amber-600' : 'text-slate-700'}`}>
                                                            {ac.nextCheckHours?.toLocaleString()}
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

      {/* CHECKS TAB */}
      {activeTab === 'checks' && (
        <FeatureGate isEnabled={features.enableFleetChecks}>
            <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-8">
                
                {/* C208 Series Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Wrench className="text-emerald-600" size={20} />
                            C208 Series Maintenance Status
                        </h3>
                        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full font-medium">
                            Cycle: A(100) → B(200) → A(300) → C(400) → A(500) → D(600)
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Aircraft</th>
                                    <th className="px-6 py-4">Current Hours</th>
                                    <th className="px-6 py-4">Next Check</th>
                                    <th className="px-6 py-4">Hours Due</th>
                                    <th className="px-6 py-4">Remaining</th>
                                    <th className="px-6 py-4 w-1/4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {fleet.filter(f => f.type.includes('C208')).map(ac => {
                                    const check = getNextCheckDetails(ac);
                                    const isCritical = check.remaining < 25;
                                    return (
                                        <tr key={ac.registration} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{ac.registration}</div>
                                                <div className="text-xs text-slate-500 font-mono">{ac.type}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-700">
                                                {ac.currentHours?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border uppercase ${check.checkColor}`}>
                                                    Check {check.checkType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-700">
                                                {ac.nextCheckHours?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`font-bold font-mono ${isCritical ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {check.remaining} hrs
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                                                    <div 
                                                        className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${check.progress}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 text-right">
                                                    {Math.round(check.progress)}% to check
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 1900D Series Section - Placeholder */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden opacity-80">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Wrench className="text-indigo-600" size={20} />
                            1900D Series Maintenance Status
                        </h3>
                    </div>
                    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <Timer size={32} className="opacity-50" />
                        </div>
                        <p className="font-medium text-lg text-slate-600">Maintenance Schedule TBA</p>
                        <p className="text-sm mt-1">1900D check logic is currently under development.</p>
                    </div>
                </div>

            </div>
        </FeatureGate>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {/* ... (Existing Modal Code) ... */}
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
                                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                                <option value="C208B">C208B</option>
                                <option value="C208EX">C208EX</option>
                                <option value="1900D">1900D</option>
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

      {/* History Modal */}
      {isHistoryOpen && historyAircraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <History className="text-blue-600" size={20} />
                  Flight History
                </h2>
                <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{historyAircraft.registration}</span>
                  <span>•</span>
                  <span>Last 50 Flights Logged: <strong>{recordedHours.toFixed(1)} hrs</strong></span>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-0 min-h-[300px]">
               {isLoadingHistory ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                       <Loader2 size={32} className="animate-spin text-blue-500" />
                       <p className="text-sm font-medium">Fetching records...</p>
                   </div>
               ) : (
                   <table className="w-full text-left text-sm border-collapse">
                     <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 uppercase text-xs font-semibold">
                       <tr>
                         <th className="px-6 py-3 border-b border-slate-200">Date</th>
                         <th className="px-6 py-3 border-b border-slate-200">Flight #</th>
                         <th className="px-6 py-3 border-b border-slate-200">Route</th>
                         <th className="px-6 py-3 border-b border-slate-200">Crew</th>
                         <th className="px-6 py-3 border-b border-slate-200 text-right">Duration</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {historyData.length === 0 ? (
                         <tr>
                           <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No recorded flights for this aircraft.</td>
                         </tr>
                       ) : (
                         historyData.map(flight => (
                           <tr key={flight.id} className="hover:bg-slate-50">
                             <td className="px-6 py-3 text-slate-600 font-medium whitespace-nowrap">{flight.date}</td>
                             <td className="px-6 py-3 font-bold text-slate-900">{flight.flightNumber}</td>
                             <td className="px-6 py-3 font-mono text-xs">{flight.route}</td>
                             <td className="px-6 py-3">
                               <div className="flex gap-1">
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-bold">{flight.pic}</span>
                                  {flight.sic && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">{flight.sic}</span>}
                               </div>
                             </td>
                             <td className="px-6 py-3 text-right font-mono font-medium text-slate-700">
                               {flight.flightTime ? `${flight.flightTime}h` : '-'}
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
               )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
              Only completed and recorded flights in the system are shown.
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